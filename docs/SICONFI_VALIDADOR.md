# Validador SICONFI — Arquitetura e Metodologia de Implementação

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Modelo de Dados](#2-modelo-de-dados)
3. [Arquitetura do Backend](#3-arquitetura-do-backend)
4. [Sistema de Notas](#4-sistema-de-notas)
5. [Metodologia para Implementar uma Nova Verificação](#5-metodologia-para-implementar-uma-nova-verificação)
6. [Verificações Implementadas](#6-verificações-implementadas)
7. [Arquitetura do Frontend](#7-arquitetura-do-frontend)
8. [Fluxo de Execução Completo](#8-fluxo-de-execução-completo)
9. [Como Adicionar uma Nova Fase](#9-como-adicionar-uma-nova-fase)

---

## 1. Visão Geral

O Validador SICONFI é um módulo que executa automaticamente as 197 regras de verificação da STN (Secretaria do Tesouro Nacional) sobre os dados do RREO, RGF, DCA e MSC já importados no banco de dados local.

A arquitetura é **orientada a banco de dados** — diferente da abordagem anterior (upload de CSV), toda a validação ocorre sobre dados já sincronizados via API SICONFI, garantindo rastreabilidade e reprodutibilidade.

### Fontes de Dados

| Tabela | Conteúdo |
|---|---|
| `siconfi_rreo` | Dados detalhados do RREO (cod_conta, coluna, valor, anexo, periodo) |
| `siconfi_extrato_entregas` | Manifesto de entregas (homologações, retificações, datas) |
| `siconfi_verificacoes` | 197 regras STN (metadados: código, título, dimensão, CAPAG) |
| `siconfi_validador_historico` | Histórico de execuções com resultado JSON completo |

### Fases de Análise

O SICONFI organiza as verificações em 15 fases. Cada fase cruza um ou dois demonstrativos:

| Fase | Tipo de Análise | Implementada |
|---|---|---|
| 1 | RREO — Conformidade | Parcial (7 regras) |
| 2 | RGF — Conformidade | Não |
| 3 | RREO × RGF | Não |
| 4–15 | DCA, MSC e cruzamentos | Não |

---

## 2. Modelo de Dados

### `siconfi_rreo` — colunas relevantes para validação

```sql
municipio_id  BIGINT        -- FK municipios
cod_ibge      VARCHAR
exercicio     INTEGER       -- ano fiscal
periodo       INTEGER       -- 1-6 (bimestral) ou 1-2 (semestral)
anexo         TEXT          -- ex: 'RREO-Anexo 01', 'RREO-Anexo 06'
rotulo        TEXT          -- ex: 'Padrão'
cod_conta     TEXT          -- identificador da linha, ex: 'TotalReceitas'
conta         TEXT          -- descrição por extenso
coluna        TEXT          -- ex: 'DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)'
valor         NUMERIC
```

> **Regra de ouro:** antes de implementar qualquer verificação, consulte os valores
> reais de `anexo`, `cod_conta` e `coluna` no banco. Os nomes nem sempre coincidem
> com os documentos da STN.

### `siconfi_extrato_entregas` — colunas relevantes

```sql
municipio_id      BIGINT
exercicio         INTEGER
entregavel        TEXT          -- ex: 'RREO - Anexo 01...'
periodo           INTEGER
periodicidade     CHAR(1)       -- 'B' bimestral | 'S' semestral
tipo_relatorio    CHAR(1)       -- 'P' padrão | 'S' simplificado
status_relatorio  CHAR(2)       -- 'HO' homologado | 'RE' retificado
data_status       TIMESTAMPTZ
instituicao       TEXT
```

### `siconfi_verificacoes` — metadados das 197 regras

```sql
no_verificacao  VARCHAR(20)  -- ex: 'D3_00001'  (UNIQUE)
co_dimensao     CHAR(4)      -- 'DI' | 'DII' | 'DIII' | 'DIV'
no_dimensao     TEXT         -- nome por extenso
no_desc         TEXT         -- título resumido
no_finalidade   TEXT         -- descrição detalhada
no_declaracao   TEXT         -- 'RREO' | 'RGF' | 'DCA' | 'MSC'
capag           BOOLEAN      -- impacta nota CAPAG
```

---

## 3. Arquitetura do Backend

**Arquivo:** `server/src/routes/siconfi.ts`

### Tipos principais

```typescript
interface ResultadoVerificacao {
  no_verificacao: string;       // "D3_00001"
  no_desc:        string;       // título curto da regra
  no_finalidade:  string;       // descrição detalhada
  co_dimensao:    string;       // "DI" | "DIII"
  capag:          boolean;
  status:  "consistente" | "inconsistente" | "aviso" | "nao_aplicavel";
  resumo:  string;              // frase curta para exibição na grade
  detalhes: object[];           // array tipado por verificação
  nota:     number;             // 0.0 a 1.0
  nota_max: number;             // sempre 1.0 (reservado)
}

type VerificadorFn = (
  municipioId: number,
  codIbge:    string,
  ano:        number
) => Promise<Partial<ResultadoVerificacao>>;
```

### Mapa de verificadores

```typescript
const verificadores: Record<string, VerificadorFn> = {
  "D1_00001": verificarD1_00001,
  "D1_00006": verificarD1_00006,
  // ... novas entradas aqui
};
```

Regras **não mapeadas** retornam automaticamente `nao_aplicavel` com a mensagem
*"Verificação ainda não implementada."* — nenhum código adicional é necessário.

### Endpoint principal

```
POST /api/siconfi/validar/:municipio_id
Body: { ano: number, tipo: string }
```

Fluxo interno:
1. Resolve `codigo_ibge` do município
2. Busca lista de `no_verificacao` para o `tipo` em `VERIFICACOES_POR_TIPO`
3. Carrega metadados das regras em `siconfi_verificacoes`
4. Executa em paralelo (`Promise.all`) cada função mapeada
5. Retorna array `ResultadoVerificacao[]` + `executado_em`

### Endpoints auxiliares

```
POST /api/siconfi/validador-historico   — salvar resultado
GET  /api/siconfi/validador-historico?municipio_id=&ano=  — listar histórico
```

---

## 4. Sistema de Notas

Cada verificação retorna `nota` (float 0.0–1.0) e `nota_max` (sempre 1.0).
A nota acumulada exibida no card superior é a média das verificações **aplicáveis**
(excluindo `nao_aplicavel`).

### Critérios por tipo de verificação

| Tipo | Cálculo da nota |
|---|---|
| **Verificação binária** (item único) | `1.0` se consistente, `0.0` se inconsistente |
| **Verificação proporcional** (múltiplos itens) | `itens_ok / total_itens` |
| **Penalidade por ocorrência** | ex: D1_00011 usa `max(0, 1 - count_RE × 0.16)` |
| **Não aplicável** | excluída do cálculo da nota acumulada |

### Semáforo da nota acumulada

| Faixa | Cor | Interpretação |
|---|---|---|
| ≥ 80% | Verde `#059669` | Regular |
| 50–79% | Âmbar `#b45309` | Atenção |
| < 50% | Vermelho `#ef4444` | Irregular |

---

## 5. Metodologia para Implementar uma Nova Verificação

### Passo 1 — Confirmar nomes exatos no banco

Antes de escrever qualquer código, consulte os valores reais:

```sql
-- Exemplo: descobrir colunas disponíveis para um cod_conta
SELECT DISTINCT anexo, cod_conta, coluna
FROM siconfi_rreo
WHERE municipio_id = <id>
  AND exercicio = 2025
  AND periodo = 6
  AND cod_conta = '<cod_conta_esperado>'
ORDER BY coluna;

-- Exemplo: verificar rótulos disponíveis num anexo
SELECT DISTINCT rotulo, coluna
FROM siconfi_rreo
WHERE municipio_id = <id>
  AND exercicio = 2025
  AND anexo = 'RREO-Anexo 02'
ORDER BY rotulo, coluna;
```

> Nunca confie apenas nos documentos da STN — os nomes de colunas e rótulos
> no banco podem diferir ligeiramente.

### Passo 2 — Escrever a função verificadora

Estrutura padrão:

```typescript
async function verificarXX_YYYYY(
  municipioId: number,
  _codIbge: string,
  ano: number
): Promise<Partial<ResultadoVerificacao>> {

  // 1. Uma única query — agrupe tudo que precisar
  const { rows } = await db.query<{ ... }>(
    `SELECT ...
     FROM siconfi_rreo
     WHERE municipio_id = $1 AND exercicio = $2
       AND ...
     GROUP BY ...`,
    [municipioId, ano],
  );

  // 2. Retorno antecipado se sem dados
  if (rows.length === 0) {
    return {
      status: "nao_aplicavel", nota: 0, nota_max: 1,
      resumo: "Nenhum dado encontrado. <orientação ao usuário>",
      detalhes: [],
    };
  }

  // 3. Processar em memória (Map para indexação rápida)
  const idx = new Map<string, number>();
  for (const d of rows) {
    idx.set(`${d.periodo}|${d.coluna}`, d.valor ?? 0);
  }

  // 4. Calcular nota e construir detalhes
  const detalhes: object[] = [];
  let ok = 0, total = 0;
  // ... lógica específica ...

  const nota = parseFloat((ok / total).toFixed(4));

  // 5. Retorno com status, nota, resumo e detalhes
  if (ok === total) {
    return { status: "consistente", nota: 1, nota_max: 1, resumo: "...", detalhes };
  }
  return { status: "inconsistente", nota, nota_max: 1, resumo: "...", detalhes };
}
```

**Regras de boas práticas:**
- **Uma query por verificação** — agrupe com `GROUP BY`, nunca faça N queries em loop
- Use `Map` para indexar resultados e cruzar em memória
- Tolerância de `0.02` para comparações monetárias (diferenças de arredondamento)
- Sempre retorne `nao_aplicavel` quando não há dados — nunca lance erro
- Prefixe erros inesperados com `try/catch` opcional; o endpoint já tem fallback

### Passo 3 — Registrar no mapa de verificadores

```typescript
// em server/src/routes/siconfi.ts
const verificadores: Record<string, VerificadorFn> = {
  // ... existentes ...
  "DX_YYYYY": verificarDX_YYYYY,   // ← adicionar aqui
};
```

### Passo 4 — Criar o componente de detalhes no frontend

**Arquivo:** `client/src/pages/siconfi/ValidadorSiconfiPage.tsx`

Cada verificação pode ter um componente de detalhes próprio, ou reutilizar
um existente se o layout for idêntico.

```tsx
function DetalhesXX_YYYYY({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length)
    return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;

  const fmt = (v: number | null) =>
    v === null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
          {/* colunas específicas da verificação */}
          <TableHead className="text-xs font-semibold text-[#033e66]">Coluna</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detalhes.map((d: any, i: number) => (
          <TableRow key={i} className={!d.ok ? "bg-[#ef444408] hover:bg-[#ef444412]" : "hover:bg-[#e3eef6]/30"}>
            <TableCell className="text-sm text-[#045ba3]">{/* dados */}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

#### Padrão de detalhamento por componente (obrigatório para regras de igualdade)

Sempre que a regra compara **somas de múltiplos componentes** de dois demonstrativos,
o componente de detalhes **deve** expor cada componente individualmente.
Isso permite que o usuário identifique exatamente qual linha do relatório está
divergente e corrija o envio ao SICONFI.

**Estrutura esperada no array `detalhes` (backend):**

```typescript
detalhes.push({
  periodo:       number,
  label:         string,           // ex: "1° Bimestre (Jan-Fev) (B)"
  total_anexo_X: number,           // soma do bloco A
  total_anexo_Y: number,           // soma do bloco B
  diferenca:     number,           // A - B
  ok:            boolean,
  componentes_X: [                 // cada parcela do bloco A
    { cod_conta: string, coluna: string, valor: number },
    ...
  ],
  componentes_Y: [                 // cada parcela do bloco B
    { cod_conta: string, coluna: string, valor: number },
    ...
  ],
});
```

**Dicionário de rótulos legíveis (frontend):**

Declare um `Record<"cod_conta|coluna", { nome, descricao }>` acima do componente
para traduzir os identificadores técnicos em texto inteligível:

```typescript
const XX_YYYYY_LABELS: Record<string, { nome: string; descricao: string }> = {
  "RREO6TotalDespesaPrimaria|PAGOS (c)": {
    nome: "Total da Despesa Primária — Pagos (c)",
    descricao: "Soma dos RP Não Processados pagos no exercício (An06)",
  },
  // ... demais componentes
};
```

**Layout do componente — grade lado a lado por período:**

```tsx
<div className="space-y-3 p-1">
  {detalhes.map((d, i) => (
    <div key={i} className={`rounded-lg border ${d.ok ? "border-[#c7dff0]" : "border-[#fca5a5]"}`}>
      {/* Cabeçalho: período, diferença, status */}
      <div className={`flex items-center justify-between px-4 py-2 rounded-t-lg ${d.ok ? "bg-[#e3eef6]/60" : "bg-[#fef2f2]"}`}>
        <span className="text-sm font-semibold text-[#033e66]">{d.label}</span>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono font-semibold ...">Diferença: {fmt(d.diferenca)}</span>
          {d.ok
            ? <span className="... bg-[#d1fae5] ...">✓ Consistente</span>
            : <span className="... bg-[#fee2e2] ...">✗ Divergente</span>}
        </div>
      </div>
      {/* Grade lado a lado: Bloco A | Bloco B */}
      <div className="grid grid-cols-2 divide-x divide-[#c7dff0]">
        <div className="p-3">
          <p className="text-[10px] font-bold ...">RREO-Anexo XX — Total: {fmt(d.total_anexo_X)}</p>
          <table className="w-full text-xs">
            {/* thead: Conta/Coluna | Valor */}
            <tbody>
              {d.componentes_X.map((c, j) => {
                const meta = XX_YYYYY_LABELS[`${c.cod_conta}|${c.coluna}`];
                return (
                  <tr key={j}>
                    <td>
                      <p className="font-semibold text-[#033e66]">{meta?.nome ?? c.cod_conta}</p>
                      <p className="text-[10px] text-[#6b7280]">{c.cod_conta} | {c.coluna}</p>
                      <p className="text-[10px] text-[#6b7280] italic">{meta?.descricao}</p>
                    </td>
                    <td className={`text-right font-mono ${c.valor === 0 ? "text-[#9ca3af]" : "text-[#045ba3] font-semibold"}`}>
                      {fmt(c.valor)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Coluna Bloco B — estrutura idêntica */}
        <div className="p-3">...</div>
      </div>
    </div>
  ))}
</div>
```

> **Regra:** valores zero devem aparecer em cinza (`text-[#9ca3af]`) para sinalizar
> que a conta **existe na fórmula mas não foi encontrada** no relatório — o que já
> orienta o usuário a verificar o preenchimento daquela linha no SICONFI.

### Passo 5 — Registrar o componente no mapa

```typescript
const DETALHE_COMPONENTE: Record<string, React.ComponentType<{ detalhes: any[] }>> = {
  // ... existentes ...
  "DX_YYYYY": DetalhesXX_YYYYY,   // ← adicionar aqui
};
```

Se o layout do componente for idêntico a um existente, reutilize diretamente:

```typescript
"D3_00007": DetalhesD3_00003,  // mesmo layout de tabela
```

### Passo 6 — Rebuild dos containers

```bash
docker compose --env-file .env.docker up -d --build backend frontend
```

---

## 6. Verificações Implementadas

### Fase 1 — RREO Conformidade

| Código | Título | Fonte | Tipo de Nota | Detalhamento | Status |
|---|---|---|---|---|---|
| D1_00001 | Homologação de todos os RREOs | `siconfi_extrato_entregas` | Proporcional (bimestres/semestres entregues) | Por entregável | ✅ |
| D1_00006 | Tempestividade na homologação | `siconfi_extrato_entregas` | Proporcional (entregas no prazo) | Por entregável | ✅ |
| D1_00011 | Quantidade de retificações | `siconfi_extrato_entregas` | Penalidade: `max(0, 1 - n_RE × 0.16)` | Por retificação | ✅ |
| D3_00001 | Resultado orçamentário — Anexo 01, 6° bim | `siconfi_rreo` | Binária | Valor apurado vs zero | ✅ |
| D3_00002 | Igualdade de despesas Anexo 01 × Anexo 02 | `siconfi_rreo` | Proporcional (períodos × tipos) | Por período e tipo | ✅ |
| D3_00003 | Igualdade de despesas Anexo 01 × Anexo 06 | `siconfi_rreo` | Proporcional (períodos × categorias × tipos) | Por período e categoria | ✅ |
| D3_00007 | Igualdade de receitas Anexo 01 × Anexo 06 | `siconfi_rreo` | Proporcional (períodos × categorias × tipos) | Por período e categoria | ✅ |
| D3_00012 | Valores negativos inválidos no RREO | `siconfi_rreo` | Proporcional (ocorrências inválidas) | Por linha (anexo, conta, coluna, valor) | ✅ |
| D3_00017 | RP pagos — Anexo 06 × Anexo 07 | `siconfi_rreo` | Binária (0 se qualquer período falhar) | **Por período × componente** (grade An06\|An07) | ✅ |
| D3_00027 | Dotação/Empenhos/Liquidações — Anexo 01 × Anexo 06 | `siconfi_rreo` | Proporcional (períodos × blocos × colunas) | Por período e coluna | ✅ |

#### Notas de implementação — D3_00017

- **Fonte An06:** `RREO6TotalDespesaPrimaria` (PAGOS c + RP PROC. PAGOS b) + `RREO6JurosEEncargosDaDivida` (idem).
  Não usar `DespesasCorrentesExcetoFontesRPPS` + `DespesasDeCapitalExcetoFontesRPPS` — essas contas
  excluem RP pagos com fontes RPPS, gerando divergência sistemática.
- **Fonte An07:** `RestosAPagarNaoProcessadosPagos` (Pagos i) + `RestosAPagarProcessadosENaoProcessadosLiquidadosPagos` (Pagos c).
  Excluir explicitamente as variantes `*Intra` — municípios nota 1 também possuem An07 Intra, confirmando que não entram na comparação.
- **Escopo:** todos os períodos (1–6). Nota = 0 se qualquer período divergir.
  Municípios que pagam RP de exercícios anteriores sem correspondência no An06 ficam inconsistentes nos bimestres intermediários.
- **Detalhamento:** grade lado a lado An06 | An07 por período, com `cod_conta`, `coluna` e valor de cada componente
  (zeros exibidos em cinza para indicar conta ausente no relatório).

### Pendentes (Fase 1)

D3_00028, D3_00030, D3_00032, D3_00033, D3_00034, D3_00035,
D3_00037, D3_00038, D3_00039, D3_00040, D3_00044, D3_00045

---

## 7. Arquitetura do Frontend

**Arquivo:** `client/src/pages/siconfi/ValidadorSiconfiPage.tsx`

### Componentes principais

```
ValidadorSiconfiPage
├── Header (título, município, ano, botão Executar)
├── Filtros (Select: Tipo de Análise, Exercício)
├── NotaCard (nota acumulada + barra de progresso colorida)
├── KpiCards (Analisadas | Consistentes | Inconsistentes | Avisos)
├── Tabs
│   ├── Resultado
│   │   └── Table → VerificacaoRow (expansível)
│   │                 └── DETALHE_COMPONENTE[no_verificacao]
│   └── Histórico
│       └── lista de execuções passadas (expansível)
```

### Mapa de status visual

```typescript
const STATUS_META = {
  consistente:   { textColor: "#059669", bgColor: "#00e1a420", borderColor: "#00e1a460" },
  inconsistente: { textColor: "#ef4444", bgColor: "#ef444420", borderColor: "#ef444460" },
  aviso:         { textColor: "#b45309", bgColor: "#ffb85a20", borderColor: "#ffb85a60" },
  nao_aplicavel: { textColor: "#6b7280", bgColor: "#6b728012", borderColor: "#6b728030" },
};
```

### Helpers de formatação

```typescript
// Formatar valor monetário pt-BR
const fmt = (v: number | null) =>
  v === null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Labels de período
const BIMESTRE_LABELS: Record<number, string> = {
  1: "1° Bimestre (Jan-Fev)", 2: "2° Bimestre (Mar-Abr)",
  3: "3° Bimestre (Mai-Jun)", 4: "4° Bimestre (Jul-Ago)",
  5: "5° Bimestre (Set-Out)", 6: "6° Bimestre (Nov-Dez)",
};
```

---

## 8. Fluxo de Execução Completo

```
Usuário clica "Executar Validação"
        │
        ▼
POST /api/siconfi/validar/:municipio_id
  { ano, tipo: "RREO" }
        │
        ├─ Resolve codigo_ibge do município
        ├─ Lista no_verificacao esperados (VERIFICACOES_POR_TIPO["RREO"])
        ├─ SELECT metadados de siconfi_verificacoes WHERE no_verificacao = ANY(...)
        │
        └─ Promise.all(regras.map(regra =>
              verificadores[regra.no_verificacao]
                ? verificadores[...](municipioId, codIbge, ano)  ← executa função
                : { status: "nao_aplicavel", ... }               ← fallback
           ))
        │
        ▼
  { resultados[], executado_em, municipio_id, ano, tipo }
        │
        ▼
Frontend renderiza resultado
        │
        └─ POST /api/siconfi/validador-historico  ← salva automaticamente
```

---

## 9. Como Adicionar uma Nova Fase

Para habilitar uma nova fase (ex: Fase 2 — RGF):

**1. Adicionar os códigos da fase em `VERIFICACOES_POR_TIPO`:**

```typescript
const VERIFICACOES_POR_TIPO: Record<string, string[]> = {
  "RREO": ["D1_00001", ...],
  "RGF":  ["D1_00002", "D1_00007", ...],  // ← nova fase
};
```

**2. Implementar as funções verificadoras** conforme a metodologia do §5.

**3. No frontend**, marcar a fase como implementada em `TIPOS_IMPLEMENTADOS`:

```typescript
const TIPOS_IMPLEMENTADOS = new Set(["RREO", "RGF"]);  // ← adicionar
```

Fases não listadas em `TIPOS_IMPLEMENTADOS` exibem badge *"Em breve"* no select,
impedindo execução sem bloquear o desenvolvimento.
