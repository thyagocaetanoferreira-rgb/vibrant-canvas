export const LIMITE_PESSOAL_ALERTA     = 0.486
export const LIMITE_PESSOAL_PRUDENCIAL = 0.513
export const LIMITE_PESSOAL_MAXIMO     = 0.54

export function calcReceitaPrevistaMes(receitaPrevistaAno: number): number {
  return receitaPrevistaAno / 12
}

export function calcTotalEmpenhado(f1: number, f2: number): number {
  return (f1 ?? 0) + (f2 ?? 0)
}

export function calcResFinanceiroEmpenhado(
  caixa: number,
  despesaNaoProcessada: number,
  consignacoes: number
): number {
  return (caixa ?? 0) - (despesaNaoProcessada ?? 0) - (consignacoes ?? 0)
}

export function calcIndiceEducacao(
  aplicacaoEducacao: number,
  receitaRealizada: number
): number | null {
  if (!receitaRealizada || receitaRealizada === 0) return null
  return aplicacaoEducacao / receitaRealizada
}

export function calcIndiceFundeb(
  aplicacaoFundeb: number,
  receitaFundeb: number
): number | null {
  if (!receitaFundeb || receitaFundeb === 0) return null
  return aplicacaoFundeb / receitaFundeb
}

export function calcIndiceSaude(
  aplicacaoSaude: number,
  rcl: number
): number | null {
  if (!rcl || rcl === 0) return null
  return aplicacaoSaude / rcl
}

export function calcIndicePessoal(
  gastoPessoal: number,
  rcl: number
): number | null {
  if (!rcl || rcl === 0) return null
  return gastoPessoal / rcl
}

export type StatusIndice = 'ok' | 'alerta' | 'prudencial' | 'excedido' | 'pendente'

export function statusEducacao(indice: number | null): StatusIndice {
  if (indice === null) return 'pendente'
  return indice >= 0.25 ? 'ok' : 'excedido'
}

export function statusFundeb(indice: number | null): StatusIndice {
  if (indice === null) return 'pendente'
  return indice >= 0.70 ? 'ok' : 'excedido'
}

export function statusSaude(indice: number | null): StatusIndice {
  if (indice === null) return 'pendente'
  return indice >= 0.15 ? 'ok' : 'excedido'
}

export function statusPessoal(indice: number | null): StatusIndice {
  if (indice === null) return 'pendente'
  if (indice <= LIMITE_PESSOAL_ALERTA)     return 'ok'
  if (indice <= LIMITE_PESSOAL_PRUDENCIAL) return 'alerta'
  if (indice <= LIMITE_PESSOAL_MAXIMO)     return 'prudencial'
  return 'excedido'
}

export const COR_STATUS: Record<StatusIndice, string> = {
  ok:         'hsl(var(--success))',
  alerta:     'hsl(var(--warning))',
  prudencial: 'hsl(38 92% 50%)',
  excedido:   'hsl(var(--destructive))',
  pendente:   'hsl(var(--muted-foreground))',
}

export const LABEL_STATUS: Record<StatusIndice, string> = {
  ok:         'Dentro do Limite',
  alerta:     'Alerta',
  prudencial: 'Prudencial',
  excedido:   'Limite Excedido',
  pendente:   'Sem dados',
}

export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatPct(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '—'
  return `${(value * 100).toFixed(decimals)}%`
}
