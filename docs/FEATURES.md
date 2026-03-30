# Documentação de Funcionalidades — vibrant-canvas

> Guia de referência rápida para manutenção do sistema. Atualizado em março/2026.

---

## Sumário

1. [Simulador Verus](#1-simulador-verus)
2. [Sistema de Logs](#2-sistema-de-logs)
3. [Audit Trail](#3-audit-trail)
4. [Autenticação — Esqueci Senha / Reset](#4-autenticação--esqueci-senha--reset)
5. [SICONFI — CAUC Automático](#5-siconfi--cauc-automático)
6. [Banco de Dados — Migrações Recentes](#6-banco-de-dados--migrações-recentes)

---

## 1. Simulador Verus

Módulo de validação fiscal SICONFI. Executa regras automáticas (verificações D1/D3) contra os dados importados e gera um score de conformidade por município/exercício.

### Rotas Backend

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/siconfi/validar/:municipioId` | Executa todas as verificações para o município no ano ativo |
| `GET` | `/api/siconfi/validador-historico` | Lista execuções anteriores (`?municipio_id=&ano=`) |
| `POST` | `/api/siconfi/validador-historico` | Salva resultado de uma execução |

### Verificações Implementadas (RREO)

Cada verificação fica em `server/src/verificacoes/rreo/<CODIGO>.ts` e exporta:
- `verificar<CODIGO>(municipioId, codIbge, ano)` → `Promise<Partial<ResultadoRegra>>`
- `meta` → `{ codigo, tipo, descricao, nota_max }`

| Código | Grupo | Descrição resumida |
|--------|-------|--------------------|
| D1_00001 | D1 | Entrega do RREO no prazo |
| D1_00006 | D1 | Consistência de datas de entrega |
| D1_00011 | D1 | Completude dos anexos obrigatórios |
| D3_00001 | D3 | Balanceamento Receitas vs. Despesas |
| D3_00002 | D3 | Receitas não negativas |
| D3_00003 | D3 | Despesas não negativas |
| D3_00007 | D3 | Consistência de restos a pagar |
| D3_00012 | D3 | Valores negativos somente em colunas permitidas |
| D3_00017 | D3 | Totais de grupo ≥ soma dos subgrupos |
| D3_00027 | D3 | Consistência das metas fiscais |
| D3_00028 | D3 | Resultado primário calculado |
| D3_00030 | D3 | LRF — Despesas com pessoal |
| D3_00032 | D3 | LRF — Dívida consolidada |
| D3_00033 | D3 | LRF — Garantias |
| D3_00034 | D3 | LRF — Operações de crédito |
| D3_00035 | D3 | LRF — Restos a pagar |
| D3_00037 | D3 | Vigência — início do exercício |
| D3_00038 | D3 | Vigência — fim do exercício |
| D3_00039 | D3 | Vigência — bimestres intermediários |
| D3_00040 | D3 | Consistência de períodos reportados |
| D3_00045 | D3 | Resultado nominal calculado |

Para adicionar uma nova verificação: crie `server/src/verificacoes/rreo/<CODIGO>.ts` seguindo o padrão dos existentes e registre no `index.ts` do mesmo diretório.

### Frontend

Localização: `client/src/pages/simulador/`

```
simulador/
├── SimuladorPage.tsx          # Página principal (tabs Resultado / Histórico)
├── types.ts                   # Interfaces TypeScript
├── constants.ts               # Metadados de tipos de análise e status
├── hooks/
│   └── useSimulacao.ts        # Queries/mutations (React Query)
├── components/
│   ├── ResumoNotas.tsx        # Cards de KPI (score, aprovados, falhas)
│   ├── ListaVerificacoes.tsx  # Tabela de resultados
│   ├── ItemVerificacao.tsx    # Linha expansível com detalhes
│   ├── StatusBadge.tsx        # Badge colorido por status
│   ├── KpiCard.tsx            # Card individual de KPI
│   ├── ModalExportarPDF.tsx   # Diálogo de exportação
│   └── detalhes/
│       ├── shared.tsx         # Componentes genéricos de detalhe
│       ├── index.ts           # Registry código → componente
│       └── rreo/              # Um .tsx por verificação (D1_*, D3_*)
└── pdf/
    └── RelatorioPDF.tsx       # Template de relatório PDF
```

**Rota na sidebar:** `/siconfi/validador` → `ValidadorSiconfiPage` (alias de `SimuladorPage`)

### Banco de Dados

Tabelas criadas por `database/migrations/20260329000000_simulador_execucoes.sql`:

**`simulador_execucoes`** — uma linha por execução
- `municipio_id`, `exercicio`, `tipo` (RREO/RGF/MSC)
- `status`: `executando` | `concluida` | `falhou`
- `nota_total`, `nota_maxima`, `percentual`
- `total_consistente`, `total_inconsistente`, `total_nao_aplicavel`

**`simulador_resultados`** — uma linha por regra por execução
- `execucao_id` (FK), `codigo_regra`, `status`, `nota`, `nota_max`
- `resumo`, `motivo_falha`, `sugestao_correcao`
- `detalhes` (JSONB): breakdown específico por regra
- `observacoes_rodape`: notas técnicas internas

---

## 2. Sistema de Logs

Dois níveis independentes: logs técnicos (infraestrutura) e logs de fronteira (frontend).

### Backend — `server/src/lib/logger.ts`

Logger estruturado em JSON, zero dependências externas. Saída para stdout/stderr (capturado pelo Docker).

```typescript
import { logger } from '../lib/logger'

logger.info('modulo', 'acao', 'mensagem', { chave: valor })
logger.warn('modulo', 'acao', 'mensagem')
logger.error('modulo', 'acao', 'mensagem', { erro })
```

Níveis: `debug` | `info` | `warn` | `error` | `fatal`
- `error`/`fatal` → stderr; demais → stdout
- `debug` suprimido em produção

### Middleware de Request — `server/src/middleware/requestLogger.ts`

Aplicado globalmente no `server/src/index.ts`. Para cada requisição:
- Gera UUID único (`x-request-id`)
- Loga ao final: método, rota, status HTTP, duração em ms, user_id
- Nível: `info` (2xx/3xx), `warn` (4xx), `error` (5xx)
- Rota `/api/health` é ignorada

### Frontend — `client/src/lib/verusLog.ts`

Logging duplo: armazenamento local (localStorage) + envio remoto em batch.

```typescript
import { log } from '@/lib/verusLog'

log.info('MeuModulo', 'acao_realizada', { dados })
log.warn('MeuModulo', 'algo_suspeito')
log.error('MeuModulo', 'erro_critico', { error })
```

- Mantém até 200 entradas em `localStorage` (chave `verus_logs`)
- Envia `warn`/`error` para `POST /api/logs/frontend` em lotes (máx 5 eventos ou a cada 10s)
- Remove automaticamente dados sensíveis (token, senha, CPF, CNPJ)
- DevTools no console: `window.__verusLogs()`, `window.__verusLogErros()`, `window.__verusLogFlush()`

### Rota de Logs — `server/src/routes/logs.ts`

`POST /api/logs/frontend` — recebe array de eventos do frontend (requer autenticação).
- Aceita até 20 eventos por requisição
- Sanitiza chaves sensíveis antes de logar

---

## 3. Audit Trail

Registro de ações de negócio (não técnicas) para rastreabilidade e auditoria.

### Banco de Dados

Tabela `audit_log` (migration `20260329000001_audit_log.sql`, upgrades em `_00002`):

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `user_id` | int | Quem executou |
| `acao` | text | Ex: `login`, `executar_validacao`, `exportar_pdf` |
| `modulo` | text | Ex: `auth`, `simulador`, `siconfi` |
| `municipio_id` | int | Município afetado (opcional) |
| `exercicio` | int | Ano fiscal (opcional) |
| `detalhes` | jsonb | Payload livre específico da ação |
| `ip` | text | IP do cliente |
| `request_id` | uuid | Correlaciona com logs técnicos |

### Middleware — `server/src/middleware/audit.ts`

```typescript
import { audit } from '../middleware/audit'

// Dentro de um handler Express:
await audit(req, {
  acao: 'executar_validacao',
  modulo: 'simulador',
  municipio_id: id,
  exercicio: ano,
  detalhes: { tipo: 'RREO', regras: 21 }
})
```

- Nunca lança exceção (falha silenciosa com log de warning)
- `req.user` é usado automaticamente para `user_id`
- Suporta override de `user_id` para ações pré-autenticação (ex: login)

---

## 4. Autenticação — Esqueci Senha / Reset

### Rotas

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/auth/forgot-password` | Envia e-mail com link de reset (validade 2h) |
| `POST` | `/api/auth/reset-password` | Aplica nova senha com token válido |

### E-mail

Template HTML com identidade visual do sistema (gradiente `#033e66 → #008ded`). Configurado via variáveis de ambiente SMTP no backend.

### Frontend

- `EsqueciSenhaPage.tsx` — formulário de solicitação de reset
- `ResetPasswordPage.tsx` — formulário de nova senha com indicador de força (mín. 6 chars, maiúscula, dígito)

---

## 5. SICONFI — CAUC Automático

### Importação Diária

O backend agenda automaticamente a importação do CAUC federal às **06:00** todos os dias via `scheduleCaucDaily()` em `server/src/index.ts`.

O CSV do governo federal (ISO-8859-1) é baixado, parseado e armazenado em `siconfi_cauc_situacao`.

### Rota Manual

`POST /api/siconfi/sincronizar-cauc` — dispara importação imediata (registra audit trail).

---

## 6. Banco de Dados — Migrações Recentes

| Arquivo | Descrição |
|---------|-----------|
| `20260329000000_simulador_execucoes.sql` | Tabelas `simulador_execucoes` e `simulador_resultados` |
| `20260329000001_audit_log.sql` | Tabela `audit_log` inicial |
| `20260329000002_audit_log_upgrade.sql` | Colunas adicionais e índices no `audit_log` |

Para executar migrações manualmente:
```bash
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -f database/migrations/<arquivo>.sql
```

---

## Fluxo de Dados — Simulador

```
[Frontend]
SimuladorPage → botão "Executar Validação"
    → POST /api/siconfi/validar/:municipioId
        → executa verificacoes/rreo/*.ts (21 regras)
        → salva em simulador_execucoes + simulador_resultados
        → registra em audit_log
    ← retorna ExecucaoSimulador com resultados[]
SimuladorPage renderiza ResumoNotas + ListaVerificacoes
    → cada linha expansível mostra componente detalhes/rreo/<CODIGO>.tsx
```

---

*Para dúvidas sobre arquitetura geral, consulte `CLAUDE.md` na raiz do projeto.*
