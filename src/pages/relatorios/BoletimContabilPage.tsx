import { useState, useEffect, useMemo } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Download, ArrowRight, TrendingUp, TrendingDown, Wallet, AlertTriangle, BookOpen, Heart, GraduationCap, Users } from "lucide-react";
import {
  calcResFinanceiroEmpenhado,
  calcResFinanceiroLiquidado,
  calcIndiceEducacao,
  calcIndiceFundeb,
  calcIndiceSaude,
  calcIndicePessoal,
  statusEducacao,
  statusFundeb,
  statusSaude,
  statusPessoal,
  COR_STATUS,
  LABEL_STATUS,
  formatBRL,
  formatPct,
  type StatusIndice,
} from "@/lib/calculos-lrf";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from "recharts";
import { cn } from "@/lib/utils";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface ClienteOption {
  clienteId: string;
  municipioNome: string;
}

type Lancamento = {
  receita_realizada: number | null;
  despesa_empenhada_f1: number | null;
  despesa_empenhada_f2: number | null;
  caixa: number | null;
  despesa_processada: number | null;
  despesa_nao_processada: number | null;
  resto_processado: number | null;
  resto_nao_processado: number | null;
  consignacoes_tesouraria: number | null;
  aplicacao_educacao: number | null;
  receita_impostos: number | null;
  aplicacao_fundeb_70: number | null;
  receita_fundeb: number | null;
  aplicacao_saude: number | null;
  receita_impostos_saude: number | null;
  receita_corrente_liquida: number | null;
  gasto_pessoal: number | null;
  supl_anulacao_utilizado: number | null;
  supl_anulacao_autorizada: number | null;
  supl_superavit_utilizado: number | null;
  supl_superavit_autorizada: number | null;
  supl_excesso_utilizado: number | null;
  excesso_projetado: number | null;
};

const n = (v: number | null | undefined) => v ?? 0;

/* ──────────────── Gauge Component ──────────────── */
const GaugeChart = ({
  label,
  utilizado,
  autorizado,
  color,
}: {
  label: string;
  utilizado: number;
  autorizado: number;
  color: string;
}) => {
  const pct = autorizado > 0 ? Math.min((utilizado / autorizado) * 100, 100) : 0;
  const data = [{ value: pct, fill: color }];

  return (
    <Card className="flex-1 min-w-[220px]">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-center">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center pb-4 px-4">
        <div className="w-[160px] h-[100px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="100%"
              innerRadius="70%"
              outerRadius="100%"
              startAngle={180}
              endAngle={0}
              barSize={14}
              data={data}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar
                dataKey="value"
                cornerRadius={8}
                background={{ fill: "hsl(var(--muted))" }}
                angleAxisId={0}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-2xl font-heading font-bold mt-1" style={{ color }}>
          {pct.toFixed(1)}%
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatBRL(utilizado)} / {formatBRL(autorizado)}
        </p>
      </CardContent>
    </Card>
  );
};

/* ──────────────── Limite Card ──────────────── */
const LimiteCard = ({
  title,
  icon: Icon,
  indice,
  status,
  limiteRef,
  limiteLabel,
}: {
  title: string;
  icon: React.ElementType;
  indice: number | null;
  status: StatusIndice;
  limiteRef: string;
  limiteLabel: string;
}) => {
  const cor = COR_STATUS[status];
  const progressValue = indice !== null ? Math.min(indice * 100, 100) : 0;

  return (
    <Card className="flex-1 min-w-[200px]">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cor}20` }}>
            <Icon className="w-4 h-4" style={{ color: cor }} />
          </div>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-2xl font-heading font-bold" style={{ color: cor }}>
          {formatPct(indice)}
        </p>
        <div className="mt-2">
          <Progress
            value={progressValue}
            className="h-2.5 [&>div]:transition-all"
            style={{ "--progress-color": cor } as React.CSSProperties}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${cor}15`, color: cor }}
          >
            {LABEL_STATUS[status]}
          </span>
          <span className="text-xs text-muted-foreground">
            {limiteLabel}: {limiteRef}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

/* ──────────────── Finance Card ──────────────── */
const FinanceCard = ({
  label,
  value,
  showArrow = false,
}: {
  label: string;
  value: number | null;
  showArrow?: boolean;
}) => (
  <div className="flex items-center gap-2">
    <Card className="flex-1 min-w-[120px] text-center">
      <CardContent className="py-3 px-3">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-heading font-bold">{formatBRL(value)}</p>
      </CardContent>
    </Card>
    {showArrow && <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
  </div>
);

/* ──────────────── MAIN PAGE ──────────────── */
const BoletimContabilPage = () => {
  const { municipio, municipiosDisponiveis, anoExercicio } = useAppContext();

  const [clienteId, setClienteId] = useState(municipio?.clienteId ?? "");
  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const [ano, setAno] = useState(anoExercicio);
  const [loading, setLoading] = useState(false);
  const [lancamento, setLancamento] = useState<Lancamento | null>(null);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);

  // Load clients list
  useEffect(() => {
    const opts: ClienteOption[] = municipiosDisponiveis.map((m) => ({
      clienteId: m.clienteId,
      municipioNome: m.municipioNome,
    }));
    setClientes(opts);
  }, [municipiosDisponiveis]);

  // Sync context municipality
  useEffect(() => {
    if (municipio?.clienteId) setClienteId(municipio.clienteId);
  }, [municipio]);

  // Fetch data whenever selectors change
  useEffect(() => {
    if (!clienteId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("lancamentos_mensais")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("mes_referencia", Number(mes))
        .eq("ano_referencia", Number(ano))
        .maybeSingle();
      setLancamento(data as Lancamento | null);
      setLoading(false);
    };
    fetchData();
  }, [clienteId, mes, ano]);

  // Derived calculations
  const calc = useMemo(() => {
    if (!lancamento) return null;
    const l = lancamento;
    const receitaRealizada = n(l.receita_realizada);
    const despesaEmpenhada = n(l.despesa_empenhada_f1);
    const resultadoOrcamentario = receitaRealizada - despesaEmpenhada;

    const resFinEmpenhado = calcResFinanceiroEmpenhado(
      n(l.caixa), n(l.consignacoes_tesouraria), n(l.despesa_nao_processada),
      n(l.despesa_processada), n(l.resto_nao_processado), n(l.resto_processado)
    );
    const resFinLiquidado = calcResFinanceiroLiquidado(
      n(l.caixa), n(l.consignacoes_tesouraria), n(l.despesa_processada), n(l.resto_processado)
    );

    const idxEducacao = calcIndiceEducacao(n(l.aplicacao_educacao), n(l.receita_impostos));
    const idxFundeb = calcIndiceFundeb(n(l.aplicacao_fundeb_70), n(l.receita_fundeb));
    const idxSaude = calcIndiceSaude(n(l.aplicacao_saude), n(l.receita_impostos_saude));
    const idxPessoal = calcIndicePessoal(n(l.gasto_pessoal), n(l.receita_corrente_liquida));

    return {
      receitaRealizada,
      despesaEmpenhada,
      resultadoOrcamentario,
      resFinEmpenhado,
      resFinLiquidado,
      idxEducacao,
      idxFundeb,
      idxSaude,
      idxPessoal,
      stEducacao: statusEducacao(idxEducacao),
      stFundeb: statusFundeb(idxFundeb),
      stSaude: statusSaude(idxSaude),
      stPessoal: statusPessoal(idxPessoal),
    };
  }, [lancamento]);

  const municipioNome = clientes.find((c) => c.clienteId === clienteId)?.municipioNome ?? "Município";
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => String(currentYear - i));

  return (
    <div className="space-y-6" id="boletim-contabil-content">
      {/* ── Header + Selectors ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Boletim Contábil</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada dos indicadores fiscais</p>
        </div>
        <Button variant="outline" id="btn-export-pdf" className="gap-2" disabled>
          <Download className="w-4 h-4" />
          Exportar PDF
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={clienteId} onValueChange={setClienteId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Selecione o município" />
          </SelectTrigger>
          <SelectContent>
            {clientes.map((c) => (
              <SelectItem key={c.clienteId} value={c.clienteId}>{c.municipioNome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            {MESES.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ano} onValueChange={setAno}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Loading State ── */}
      {loading && (
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && !lancamento && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="w-12 h-12 text-warning mb-4" />
            <h3 className="text-lg font-heading font-semibold text-foreground">
              Nenhum lançamento encontrado
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Não há dados cadastrados para <strong>{municipioNome}</strong> em{" "}
              <strong>{MESES[Number(mes) - 1]}/{ano}</strong>. Acesse o módulo de{" "}
              <strong>Diagnóstico Fiscal</strong> para inserir os dados primeiro.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Data Sections ── */}
      {!loading && lancamento && calc && (
        <div className="space-y-6">
          {/* SECTION 1 — Resultado Orçamentário */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Resultado Orçamentário <span className="text-xs text-muted-foreground font-normal">(sem RPPS — pelo Empenhado F1)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground">Receita Realizada</p>
                  <p className="text-xl font-heading font-bold text-foreground mt-1">{formatBRL(calc.receitaRealizada)}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground">Despesa Empenhada (F1)</p>
                  <p className="text-xl font-heading font-bold text-foreground mt-1">{formatBRL(calc.despesaEmpenhada)}</p>
                </div>
                <div
                  className={cn(
                    "rounded-xl p-4 text-center",
                    calc.resultadoOrcamentario >= 0 ? "bg-success/10" : "bg-destructive/10"
                  )}
                >
                  <p className="text-xs text-muted-foreground">Resultado Orçamentário</p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    {calc.resultadoOrcamentario >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-success" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-destructive" />
                    )}
                    <p
                      className={cn(
                        "text-xl font-heading font-bold",
                        calc.resultadoOrcamentario >= 0 ? "text-success" : "text-destructive"
                      )}
                    >
                      {formatBRL(calc.resultadoOrcamentario)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2 — Resultado Financeiro */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Wallet className="w-5 h-5 text-secondary" />
                Resultado Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-1">
                <FinanceCard label="Caixa" value={lancamento.caixa} showArrow />
                <FinanceCard label="Desp. Processada" value={lancamento.despesa_processada} showArrow />
                <FinanceCard label="Desp. Não Processada" value={lancamento.despesa_nao_processada} showArrow />
                <FinanceCard label="Resto Processado" value={lancamento.resto_processado} showArrow />
                <FinanceCard label="Resto Não Processado" value={lancamento.resto_nao_processado} showArrow />
                <FinanceCard label="Consignações" value={lancamento.consignacoes_tesouraria} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className={cn(
                    "rounded-xl p-4 text-center",
                    calc.resFinEmpenhado >= 0 ? "bg-success/10" : "bg-destructive/10"
                  )}
                >
                  <p className="text-xs text-muted-foreground">Resultado Financeiro Empenhado</p>
                  <p
                    className={cn(
                      "text-xl font-heading font-bold mt-1",
                      calc.resFinEmpenhado >= 0 ? "text-success" : "text-destructive"
                    )}
                  >
                    {formatBRL(calc.resFinEmpenhado)}
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-xl p-4 text-center",
                    calc.resFinLiquidado >= 0 ? "bg-success/10" : "bg-destructive/10"
                  )}
                >
                  <p className="text-xs text-muted-foreground">Resultado Financeiro Liquidado</p>
                  <p
                    className={cn(
                      "text-xl font-heading font-bold mt-1",
                      calc.resFinLiquidado >= 0 ? "text-success" : "text-destructive"
                    )}
                  >
                    {formatBRL(calc.resFinLiquidado)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 3 — Limites CF/LRF */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Limites CF/LRF
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <LimiteCard
                  title="Educação (MDE)"
                  icon={GraduationCap}
                  indice={calc.idxEducacao}
                  status={calc.stEducacao}
                  limiteRef="25%"
                  limiteLabel="Mín."
                />
                <LimiteCard
                  title="FUNDEB (70%)"
                  icon={BookOpen}
                  indice={calc.idxFundeb}
                  status={calc.stFundeb}
                  limiteRef="70%"
                  limiteLabel="Mín."
                />
                <LimiteCard
                  title="Saúde (ASPS)"
                  icon={Heart}
                  indice={calc.idxSaude}
                  status={calc.stSaude}
                  limiteRef="15%"
                  limiteLabel="Mín."
                />
                <LimiteCard
                  title="Gasto c/ Pessoal"
                  icon={Users}
                  indice={calc.idxPessoal}
                  status={calc.stPessoal}
                  limiteRef="54%"
                  limiteLabel="Máx."
                />
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4 — Suplementação */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Wallet className="w-5 h-5 text-accent" />
                Suplementação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GaugeChart
                  label="Anulação"
                  utilizado={n(lancamento.supl_anulacao_utilizado)}
                  autorizado={n(lancamento.supl_anulacao_autorizada)}
                  color="hsl(var(--primary))"
                />
                <GaugeChart
                  label="Superávit"
                  utilizado={n(lancamento.supl_superavit_utilizado)}
                  autorizado={n(lancamento.supl_superavit_autorizada)}
                  color="hsl(var(--secondary))"
                />
                <GaugeChart
                  label="Excesso"
                  utilizado={n(lancamento.supl_excesso_utilizado)}
                  autorizado={n(lancamento.excesso_projetado)}
                  color="hsl(var(--accent))"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BoletimContabilPage;
