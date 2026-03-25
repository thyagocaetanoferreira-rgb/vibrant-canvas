# Padrão de Design — Verus / VH Contabilidade Pública

> Documento de referência para Claude Code. Todo painel, tela ou componente criado neste projeto deve obedecer este padrão sem exceção.

---

## 1. Identidade Resumida (Quick Reference)

```
MARCA:     VH Contabilidade Pública — sistema Verus
FONTE:     Sora (Google Fonts) — pesos 300 a 800
GRADIENTE: linear-gradient(90deg, #00e1a4, #00bfcf, #008ded, #045ba3, #033e66)
FUNDO:     #e3eef6 (página), #FFFFFF (cards)
TÍTULOS:   #033e66  — ExtraBold / Bold
TEXTOS:    #045ba3  — Regular / Medium
SUCESSO:   #00e1a4
ALERTA:    #ffb85a
ÍCONES:    Lucide React (stroke-width padrão, herda cor do contexto)
GRÁFICOS:  Recharts + fonte Sora
ANIMAÇÕES: Framer Motion — fade-in por scroll, hover com elevação
ESTILO:    Clean, minimalista, institucional, moderno
```

---

## 2. Paleta de Cores

### 2.1 Cores Primárias

| Token         | Hex       | RGB            | Uso                                          |
|---------------|-----------|----------------|----------------------------------------------|
| Navy          | `#033e66` | 3, 62, 102     | Títulos principais, textos de máximo destaque |
| Blue Deep     | `#045ba3` | 4, 91, 163     | Textos descritivos, labels, subtítulos        |
| Blue          | `#027fc4` | 2, 127, 196    | Elementos secundários                         |
| Blue Digital  | `#008ded` | 0, 141, 237    | Botões primários, links, bordas ativas        |
| Blue Light    | `#2bb0f9` | 43, 176, 249   | Placeholders, ícones de suporte               |
| Turquoise Mid | `#00aac6` | 0, 170, 198    | Badges, elementos informativos                |
| Teal          | `#00bfcf` | 0, 191, 207    | Gráficos, destaques secundários               |
| Green         | `#00e1a4` | 0, 225, 164    | Sucesso, indicadores positivos (moderado)     |

### 2.2 Cores de Interface

| Token    | Hex       | Uso                                      |
|----------|-----------|------------------------------------------|
| Fundo    | `#e3eef6` | Background geral da página               |
| Card     | `#ffffff` | Fundo de cards e painéis                 |
| Âmbar    | `#ffb85a` | Alertas, avisos, indicadores de atenção  |
| Vermelho | `#ef4444` | Erros, estados destrutivos               |

### 2.3 Gradiente Institucional

```css
/* Horizontal completo */
background: linear-gradient(90deg, #00e1a4, #00bfcf, #008ded, #045ba3, #033e66);

/* Overlay hero (com transparência) */
background: linear-gradient(
  to right,
  rgba(3, 62, 102, 0.90),
  rgba(4, 91, 163, 0.80),
  rgba(0, 141, 237, 0.70)
);
```

> Aplicar em: barras de progresso, cabeçalhos de hero, ícones de seção, elementos decorativos lineares.

### 2.4 Cores Sequenciais para Etapas e Gráficos

```typescript
const STEP_COLORS = [
  "#00e1a4", // 1 — Verde
  "#00bfcf", // 2 — Teal
  "#00aac6", // 3 — Turquesa Azulado
  "#2bb0f9", // 4 — Azul Claro
  "#008ded", // 5 — Azul Digital
  "#027fc4", // 6 — Azul
  "#045ba3", // 7 — Azul Profundo
  "#033e66", // 8 — Marinho
];
```

> Gráficos de barras, pizza/donut e linhas devem sempre usar esta sequência. Nunca usar cores genéricas fora da paleta.

---

## 3. Tipografia

### 3.1 Família

```css
font-family: "Sora", system-ui, sans-serif;
/* Importar via Google Fonts — pesos 300, 400, 500, 600, 700, 800 */
```

### 3.2 Escala e Hierarquia

| Nível              | Tamanho       | Peso          | Cor       | Uso                            |
|--------------------|---------------|---------------|-----------|--------------------------------|
| Hero / H1          | 2rem–2.5rem   | 800 ExtraBold | `#033e66` | Título principal de página     |
| H2 / Seção         | 1.25rem       | 700 Bold      | `#033e66` | Título de card ou bloco        |
| H3 / Subtítulo     | 1rem          | 600 SemiBold  | `#033e66` | Subtítulo de seção             |
| Body               | 0.875rem      | 400 Regular   | `#045ba3` | Texto descritivo, parágrafos   |
| Label / Caption    | 0.75rem       | 500 Medium    | `#045ba3` | Labels de campo, legendas      |
| Placeholder        | 0.875rem      | 400 Regular   | `#2bb0f9` | Texto de instrução em campos   |
| Valor numérico     | variável      | 700–800       | `#033e66` | KPIs, métricas, totais         |
| Mono / Código      | 0.8125rem     | 400           | `#045ba3` | Códigos, valores de tabela     |

### 3.3 Regras de Aplicação

- `#033e66` → somente títulos e valores de destaque máximo
- `#045ba3` → textos descritivos, labels, cabeçalhos de tabela
- Textos sobre fundo escuro (hero): branco 100% (títulos), 80% (corpo), 60% (notas)
- `#00e1a4` → apenas subtítulos de hero ou indicadores de sucesso (moderado)
- Labels em uppercase: usar `letter-spacing: 0.05em` (tracking-wide)
- Textos corridos: `line-height: 1.625` (leading-relaxed), máx. 65 chars/linha
- **Placeholder**: sempre `#2bb0f9` — diferencia instrução de valor preenchido

---

## 4. Layout e Grid

### 4.1 Container Principal

```css
.container {
  width: 100%;
  margin: 0 auto;
  padding: 0 1rem;        /* mobile */
  padding: 0 1.5rem;      /* sm: 640px+ */
  padding: 0 2rem;        /* lg: 1024px+ */
  max-width: 1280px;      /* desktop */
}
```

Equivalente Tailwind: `max-w-[1280px] mx-auto px-4 py-6`

### 4.2 Sidebar

| Propriedade   | Valor                      |
|---------------|----------------------------|
| Largura       | 256px (`w-64`)             |
| Fundo         | `#ffffff`                  |
| Borda direita | 1px `#e3eef6`              |
| Logo topo     | com borda inferior `#e3eef6` |
| Collapsed     | 68px — exibe ícone/favicon |

### 4.3 Grid de Cards

| Breakpoint | Colunas |
|------------|---------|
| mobile     | 1–2     |
| sm (640px) | 2–3     |
| lg (1024px)| 4–5     |

- Cards KPI: `grid-cols-2 sm:grid-cols-2 lg:grid-cols-4` (padrão 4 métricas)
- Gráficos: `grid-cols-1 lg:grid-cols-2`

### 4.4 Espaçamento

| Elemento              | Valor              |
|-----------------------|--------------------|
| Gap entre cards       | `gap-4` (1rem)     |
| Gap entre seções      | `space-y-6`        |
| Padding interno card  | `p-4` ou `p-5`     |
| Padding de tabela     | `px-5 pt-5 pb-3`   |

---

## 5. Componentes

### 5.1 Card Padrão

```tsx
<Card className="bg-white shadow-sm rounded-xl border-0">
  <CardHeader className="px-5 pt-5 pb-3">
    <CardTitle className="text-base font-bold text-[#033e66] flex items-center gap-2">
      <Icon className="h-4 w-4 text-[#008ded]" />
      Título da Seção
    </CardTitle>
  </CardHeader>
  <CardContent className="px-5 pb-5">
    {/* conteúdo */}
  </CardContent>
</Card>
```

| Propriedade    | Valor                              |
|----------------|------------------------------------|
| Fundo          | `#ffffff`                          |
| Borda          | nenhuma (`border-0`)               |
| Sombra         | `shadow-sm`                        |
| Raio           | `rounded-xl` (12px)                |

### 5.2 Card KPI

```tsx
<Card className="bg-white shadow-sm rounded-xl border-0 border-l-4"
      style={{ borderLeftColor: COR_DA_METRICA }}>
  <CardContent className="p-4 flex items-start justify-between">
    <div>
      <p className="text-xs font-medium text-[#045ba3] uppercase tracking-wide">{titulo}</p>
      <p className="text-lg font-extrabold text-[#033e66] mt-0.5">{valor}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitulo}</p>
    </div>
    <div className="p-2 rounded-lg" style={{ backgroundColor: `${COR}18` }}>
      <Icon className="h-5 w-5" style={{ color: COR }} />
    </div>
  </CardContent>
</Card>
```

| Propriedade        | Valor                                     |
|--------------------|-------------------------------------------|
| Borda esquerda     | 4px sólida na cor da métrica              |
| Ícone              | fundo = cor da métrica com opacidade 10%  |
| Título             | uppercase, tracking-wide, `#045ba3`       |
| Valor              | ExtraBold, `#033e66`                      |
| Subtítulo          | muted-foreground, xs                      |

Sequência de cores para cards KPI (da esquerda para direita):
`#033e66` → `#045ba3` → `#008ded` → `#00bfcf` → `#00e1a4`

### 5.3 Cabeçalho de Página

```tsx
<div className="flex items-start justify-between flex-wrap gap-3">
  <div>
    <div className="flex items-center gap-2 mb-1">
      <div className="p-2 rounded-lg bg-gradient-to-r from-[#008ded] to-[#00bfcf]">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <h1 className="text-2xl font-extrabold text-[#033e66]">Título da Página</h1>
    </div>
    <p className="text-sm text-[#045ba3]">
      {municipio} · Exercício {ano} · Origem dos dados
    </p>
  </div>
  <Button variant="outline" size="sm"
          className="border-[#008ded] text-[#008ded] hover:bg-[#008ded]/10">
    <RefreshCw className="h-4 w-4 mr-1.5" />
    Atualizar
  </Button>
</div>
```

### 5.4 Barra de Filtros

```tsx
<Card className="bg-white shadow-sm rounded-xl border-0">
  <CardContent className="p-4">
    <div className="flex items-center gap-1.5 mb-3">
      <Filter className="h-4 w-4 text-[#008ded]" />
      <span className="text-sm font-semibold text-[#033e66]">Filtros</span>
    </div>
    <div className="flex flex-wrap gap-3 items-end">
      {/* campos de filtro */}
    </div>
  </CardContent>
</Card>
```

- Label acima do campo: `text-xs text-[#045ba3] font-medium`
- Select trigger: `h-9 text-sm border-[#e3eef6] text-[#045ba3]`
- Input: `h-9 border border-[#e3eef6] px-3 text-sm text-[#045ba3]`
- Botão "Limpar filtros": `text-[#008ded] hover:bg-[#008ded]/10`

### 5.5 Tabela Analítica

```tsx
<Table>
  <TableHeader>
    <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
      <TableHead className="text-[#033e66] font-semibold">Coluna</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-[#e3eef6]/30">
      <TableCell className="text-sm text-[#045ba3]">valor</TableCell>
    </TableRow>
    {/* Linha de totais */}
    <TableRow className="bg-[#033e66]/5 font-bold border-t-2 border-[#033e66]/20">
      <TableCell className="text-sm text-[#033e66]">Total</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

- Cabeçalho: fundo `#e3eef6/50`, texto `#033e66` bold
- Linha hover: `#e3eef6/30`
- Valores numéricos: `font-mono text-[#045ba3]`
- Valores de destaque: `font-mono font-semibold text-[#008ded]`
- Linha de totais: `bg-[#033e66]/5`, borda topo `border-[#033e66]/20`
- Linhas sem dados: ocultar (`.filter()` — não exibir linha com todos valores zero)

### 5.6 Badge

```tsx
<Badge style={{
  backgroundColor: "#008ded20",
  color: "#008ded",
  border: "none",
  fontSize: 11,
}}>
  texto
</Badge>
```

| Estado   | Background    | Texto     |
|----------|---------------|-----------|
| Info     | `#008ded20`   | `#008ded` |
| Sucesso  | `#00e1a420`   | `#059669` |
| Alerta   | `#ffb85a20`   | `#b45309` |
| Marinho  | `#033e6620`   | `#033e66` |
| Teal     | `#00bfcf20`   | `#00aac6` |

### 5.7 Multi-Select de Meses

Usar `Popover` + `Checkbox` da shadcn/ui. Label mostra "Todos os meses", "Janeiro" (se 1 selecionado) ou "N meses". Botão "Limpar seleção" no rodapé do popover.

---

## 6. Gráficos (Recharts)

### 6.1 Regras Gerais

| Propriedade        | Valor                                    |
|--------------------|------------------------------------------|
| Biblioteca         | Recharts                                 |
| Fonte              | Sora (via tick fontSize + fill)          |
| Grid               | `strokeDasharray="3 3"` cor `#e3eef6`   |
| Eixos tick         | `fontSize: 11`, `fill: "#045ba3"`        |
| Container          | `<ResponsiveContainer width="100%">`     |
| Altura padrão      | 220px                                    |
| Cores              | Sequência `STEP_COLORS` (seção 2.4)      |

### 6.2 Tooltip Padrão

```tsx
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e3eef6] rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-[#033e66] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};
```

### 6.3 Tipos e Aplicação

| Gráfico            | Tipo Recharts    | Uso                                    |
|--------------------|------------------|----------------------------------------|
| Evolução temporal  | `AreaChart`      | Valores ao longo de meses              |
| Por categoria      | `BarChart` horiz.| Ranking por órgão, fonte, etc.         |
| Distribuição %     | `PieChart` donut | Participação por tipo (agrupar < 2%)   |
| Comparativo        | `ComposedChart`  | Bar + Line (orçado vs realizado)       |

#### Area Chart — gradiente padrão:
```tsx
<defs>
  <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%"  stopColor="#008ded" stopOpacity={0.25} />
    <stop offset="95%" stopColor="#008ded" stopOpacity={0} />
  </linearGradient>
</defs>
<Area dataKey="valor" stroke="#008ded" fill="url(#grad1)" strokeWidth={2} dot={{ r: 3 }} />
```

#### Bar Chart horizontal:
```tsx
<BarChart layout="vertical" margin={{ left: 0, right: 20 }}>
  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
    {data.map((_, i) => <Cell key={i} fill={STEP_COLORS[i % STEP_COLORS.length]} />)}
  </Bar>
</BarChart>
```

#### Donut — agrupar fatias < 2%:
```tsx
const pieData = useMemo(() => {
  const total = data.reduce((s, r) => s + r.value, 0);
  const main   = data.filter(r => (r.value / total * 100) >= 2);
  const outros = data.filter(r => (r.value / total * 100) < 2).reduce((s,r) => s + r.value, 0);
  if (outros > 0) main.push({ name: "Outros (< 2%)", value: outros });
  return main;
}, [data]);
```

---

## 7. Formatação de Valores

```typescript
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Valor completo: R$ 1.234.567,89
const fmt = (v: number) => BRL.format(v);

// Valor compacto para eixos e cards: R$ 1,2M / R$ 850K
const fmtC = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}K`;
  return BRL.format(v);
};

// Percentual
const pctFmt = (v: number) => `${v.toFixed(2)}%`;

// Meses
const MESES_NOME = ["","Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESES_FULL = ["","Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
```

---

## 8. Estrutura Padrão de Painel (Dashboard Page)

```
1. Cabeçalho (ícone gradiente + título + município/ano + botão Atualizar)
2. Barra de Filtros (card branco, ícone Filter, campos inline)
3. Bloco KPI — Cards (4 métricas, grid responsivo, borda-esquerda colorida)
4. Bloco Analítico — Grid/Tabela (todas as categorias do domínio, linha de totais)
5. Bloco Gráficos — 2×2 grid (Área temporal, Barras órgão, Donut tipo, Barras fonte)
6. Bloco Legal/Histórico — Tabela de atos, decretos ou registros complementares
7. Rodapé: "Verus · VH Contabilidade Pública · Dados [origem] · [ano]"
```

---

## 9. Padrão de API (Backend)

### 9.1 Rota

```
GET /api/paineis/{modulo}/{nome-do-painel}
Query: cliente_id (obrigatório), ano (obrigatório), + filtros opcionais
```

### 9.2 Helper de Municipio

```typescript
const municipioId = await resolverMunicipioTcmgo(
  req.usuario!.id, req.usuario!.perfil, cliente_id as string
);
```

### 9.3 Estrutura de Resposta

```typescript
{
  kpis:            { [metrica: string]: number },
  grid_[dominio]:  Array<{ codigo, descricao, ...valores }>,
  evolucao_mensal: Array<{ mes: number, ...valores }>,
  por_orgao:       Array<{ cod_orgao, desc_orgao, ...valores }>,
  por_fonte:       Array<{ cod_fonte_recurso, nomenclatura, ...valores }>,
  [bloco_extra]:   Array<...>,
  opcoes: {
    orgaos:  Array<{ cod_orgao, desc_orgao }>,
    fontes:  Array<{ cod_fonte_recurso, nomenclatura }>,
    meses:   number[],
    tipos:   Array<{ codigo, descricao }>,
  }
}
```

### 9.4 WHERE Dinâmico

```typescript
const buildWhere = (alias: string, includeMes = true) => {
  const p: any[] = [municipioId, ano];
  let w = ""; let i = 3;
  if (includeMes && mesesArr.length > 0) { w += ` AND ${alias}.mes_referencia = ANY($${i})`; p.push(mesesArr); i++; }
  if (orgaosArr.length > 0)  { w += ` AND ${alias}.cod_orgao = ANY($${i})`;        p.push(orgaosArr); i++; }
  if (tiposArr.length > 0)   { w += ` AND ${alias}.tipo = ANY($${i})`;              p.push(tiposArr); i++; }
  if (fontesArr.length > 0)  { w += ` AND ${alias}.cod_fonte_recurso = ANY($${i})`; p.push(fontesArr); i++; }
  return { p, w };
};
```

---

## 10. Regras de Qualidade

- [ ] Fundo da página: `#e3eef6`
- [ ] Cards: `bg-white shadow-sm rounded-xl border-0`
- [ ] Títulos: `text-[#033e66] font-bold/extrabold`
- [ ] Textos: `text-[#045ba3]`
- [ ] Placeholders: `#2bb0f9` (global via `::placeholder` no `index.css`)
- [ ] Ícones de seção: dentro de `div` com gradiente `from-[#008ded] to-[#00bfcf]`
- [ ] Gráficos: cores `STEP_COLORS`, tooltip customizado, fonte Sora
- [ ] Tabelas: cabeçalho `#e3eef6/50`, hover `#e3eef6/30`, totais `#033e66/5`
- [ ] Grid analítico: ocultar linhas com todos os valores = 0
- [ ] KPIs: 4 cards, borda-esquerda 4px colorida, valor compacto + tooltip com valor completo
- [ ] Filtros: label acima do campo, multi-select de meses via Popover+Checkbox
- [ ] Rodapé: `"Verus · VH Contabilidade Pública · Dados [origem] · [ano]"`
- [ ] Loading: `<Skeleton>` nos cards e gráficos enquanto `isLoading`
- [ ] Erro: `toast.error(...)` via sonner

---

## 11. Scrollbar

```css
::-webkit-scrollbar       { width: 6px; }
::-webkit-scrollbar-track { background: #e3eef6; }
::-webkit-scrollbar-thumb { background: #008ded; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #045ba3; }
```

---

## 12. Referência de Implementação

O painel **Alterações Orçamentárias** (`/paineis/orcamentario/alteracoes-orcamentarias`) é a implementação de referência deste padrão. Consulte:

- **Frontend:** `client/src/pages/paineis/AlteracoesOrcamentariasPage.tsx`
- **Backend:** `server/src/routes/paineis.ts` — rota `/orcamentario/alteracoes-orcamentarias`
