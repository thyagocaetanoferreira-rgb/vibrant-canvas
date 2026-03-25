import { useState, useMemo } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell, Sector,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  TrendingUp, TrendingDown, RefreshCw, ChevronDown,
  Landmark, BarChart3, FileText, Scale, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Paleta de cores Verus ─────────────────────────────────────────────────────
const COLORS = ["#008ded", "#00bfcf", "#00e1a4", "#045ba3", "#2bb0f9", "#00aac6", "#033e66", "#ffb85a"];

const MESES_NOME = [
  "", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];
const MESES_FULL = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Kpis {
  vl_previsto_atualizado: number;
  vl_saldo_ant_fonte: number;
  vl_alteracao_fonte: number;
  vl_saldo_atual_fonte: number;
  qtd_alteracoes: number;
}
interface GridTipo {
  codigo: string;
  descricao: string;
  vl_saldo_ant_fonte: number;
  vl_alteracao_fonte: number;
  vl_saldo_atual_fonte: number;
  pct_receita: number;
}
interface EvolucaoMes { mes: number; vl_alteracao_fonte: number; vl_saldo_atual_fonte: number; }
interface PorOrgao { cod_orgao: string; desc_orgao: string; vl_alteracao_fonte: number; }
interface PorFonte { cod_fonte_recurso: string; nomenclatura: string; vl_alteracao_fonte: number; }
interface AtoLegal {
  subtipo: string; tipo_ato: string; numero: string;
  data_ato: string | null; vl_autorizado: number | null;
  tipo_credito: string | null; mes_referencia: number;
}
interface Opcoes {
  orgaos: { cod_orgao: string; desc_orgao: string }[];
  fontes: { cod_fonte_recurso: string; nomenclatura: string }[];
  meses: number[];
  tipos: { codigo: string; descricao: string }[];
}
interface ApiResponse {
  kpis: Kpis;
  grid_tipos: GridTipo[];
  evolucao_mensal: EvolucaoMes[];
  por_orgao: PorOrgao[];
  por_fonte: PorFonte[];
  atos_legais: AtoLegal[];
  opcoes: Opcoes;
}

// ── Utilitários ───────────────────────────────────────────────────────────────
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt  = (v: number) => BRL.format(v);
const fmtC = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}K`;
  return BRL.format(v);
};

const pctFmt = (v: number) => `${v.toFixed(2)}%`;

// ── Tooltip customizado ───────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e3eef6] rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-[#033e66] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

// ── MultiSelect de meses ──────────────────────────────────────────────────────
function MesesMultiSelect({
  disponiveis, selecionados, onChange,
}: {
  disponiveis: number[];
  selecionados: number[];
  onChange: (v: number[]) => void;
}) {
  const label = selecionados.length === 0
    ? "Todos os meses"
    : selecionados.length === 1
    ? MESES_FULL[selecionados[0]]
    : `${selecionados.length} meses`;

  const toggle = (m: number) => {
    onChange(selecionados.includes(m)
      ? selecionados.filter((x) => x !== m)
      : [...selecionados, m].sort((a, b) => a - b));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 min-w-[160px] justify-between text-sm font-normal border-[#e3eef6] text-[#045ba3]">
          {label}
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2">
        <p className="text-xs font-semibold text-[#033e66] px-2 pb-1">Selecionar meses</p>
        {(disponiveis.length > 0 ? disponiveis : Array.from({ length: 12 }, (_, i) => i + 1)).map((m) => (
          <div
            key={m}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#e3eef6] cursor-pointer"
            onClick={() => toggle(m)}
          >
            <Checkbox checked={selecionados.includes(m)} onCheckedChange={() => toggle(m)} className="h-3.5 w-3.5" />
            <span className="text-sm text-[#045ba3]">{MESES_FULL[m]}</span>
          </div>
        ))}
        {selecionados.length > 0 && (
          <Button variant="ghost" size="sm" className="w-full mt-1 text-xs text-[#008ded]" onClick={() => onChange([])}>
            Limpar seleção
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Card KPI ──────────────────────────────────────────────────────────────────
function KpiCard({
  title, value, subtitle, icon: Icon, borderColor, loading,
}: {
  title: string; value: string; subtitle?: string;
  icon: React.ElementType; borderColor: string; loading?: boolean;
}) {
  return (
    <Card className={cn("bg-white shadow-sm rounded-xl border-0 border-l-4")} style={{ borderLeftColor: borderColor }}>
      <CardContent className="p-4 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#045ba3] uppercase tracking-wide truncate">{title}</p>
          {loading ? (
            <Skeleton className="h-6 w-28 mt-1" />
          ) : (
            <p className="text-lg font-extrabold text-[#033e66] mt-0.5 leading-tight">{value}</p>
          )}
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="ml-3 p-2 rounded-lg" style={{ backgroundColor: `${borderColor}18` }}>
          <Icon className="h-5 w-5" style={{ color: borderColor }} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function AlteracoesOrcamentariasPage() {
  const { municipio, anoExercicio } = useAppContext();
  const clienteId = municipio?.clienteId;

  // Filtros globais
  const [mesesSel, setMesesSel] = useState<number[]>([]);
  const [orgaoSel, setOrgaoSel] = useState("__all__");
  const [tipoSel, setTipoSel]   = useState("__all__");
  const [fonteSel, setFonteSel] = useState("__all__");
  const [naturezaSel, setNaturezaSel] = useState("");

  // Filtros locais — Bloco 4 (Atos Legais)
  const [atoMesSel, setAtoMesSel]         = useState("__all__");
  const [atoCreditoSel, setAtoCreditoSel] = useState("__all__");
  const [atoTipoSel, setAtoTipoSel]       = useState("__all__");

  const queryParams = useMemo(() => {
    const p = new URLSearchParams({ cliente_id: String(clienteId ?? ""), ano: anoExercicio });
    if (mesesSel.length > 0)      p.set("meses", mesesSel.join(","));
    if (orgaoSel !== "__all__")    p.set("orgaos", orgaoSel);
    if (tipoSel  !== "__all__")    p.set("tipos_alteracao", tipoSel);
    if (fonteSel !== "__all__")    p.set("fontes", fonteSel);
    if (naturezaSel.trim())        p.set("cod_natureza_despesa", naturezaSel.trim());
    return p.toString();
  }, [clienteId, anoExercicio, mesesSel, orgaoSel, tipoSel, fonteSel, naturezaSel]);

  const { data, isLoading, isError, refetch } = useQuery<ApiResponse>({
    queryKey: ["paineis-alt-orc", queryParams],
    queryFn: () => api.get(`/paineis/orcamentario/alteracoes-orcamentarias?${queryParams}`),
    enabled: !!clienteId,
    staleTime: 5 * 60 * 1000,
  });

  if (isError) toast.error("Erro ao carregar dados de Alterações Orçamentárias.");

  // ── Dados para Gráfico C (donut) — agrupa tipos < 2% em "Outros" ──────────
  const pieData = useMemo(() => {
    if (!data) return [];
    const total = data.por_orgao.reduce((s, r) => s + r.vl_alteracao_fonte, 0);
    const raw = (data.grid_tipos ?? [])
      .filter((t) => t.vl_alteracao_fonte > 0)
      .map((t) => ({ name: t.descricao, value: t.vl_alteracao_fonte, pct: total > 0 ? t.vl_alteracao_fonte / total * 100 : 0 }));
    const main   = raw.filter((r) => r.pct >= 2);
    const outros = raw.filter((r) => r.pct < 2).reduce((s, r) => s + r.value, 0);
    if (outros > 0) main.push({ name: "Outros (< 2%)", value: outros, pct: outros / (total || 1) * 100 });
    return main;
  }, [data]);

  const hasData = !!data;

  return (
    <div className="space-y-6">

        {/* ── Cabeçalho ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-lg bg-gradient-to-r from-[#008ded] to-[#00bfcf]">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-extrabold text-[#033e66]">Alterações Orçamentárias</h1>
            </div>
            <p className="text-sm text-[#045ba3]">
              {municipio?.municipioNome ?? "—"} · Exercício {anoExercicio} · TCM-GO / AOC
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-[#008ded] text-[#008ded] hover:bg-[#008ded]/10"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Atualizar
          </Button>
        </div>

        {/* ── Filtros ─────────────────────────────────────────────────────── */}
        <Card className="bg-white shadow-sm rounded-xl border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Filter className="h-4 w-4 text-[#008ded]" />
              <span className="text-sm font-semibold text-[#033e66]">Filtros</span>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              {/* Meses (multi-select) */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#045ba3] font-medium">Mês</label>
                <MesesMultiSelect
                  disponiveis={data?.opcoes?.meses ?? []}
                  selecionados={mesesSel}
                  onChange={setMesesSel}
                />
              </div>

              {/* Órgão */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#045ba3] font-medium">Órgão</label>
                <Select value={orgaoSel} onValueChange={setOrgaoSel}>
                  <SelectTrigger className="h-9 w-52 text-sm border-[#e3eef6] text-[#045ba3]">
                    <SelectValue placeholder="Todos os órgãos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos os órgãos</SelectItem>
                    {(data?.opcoes?.orgaos ?? []).map((o) => (
                      <SelectItem key={o.cod_orgao} value={o.cod_orgao}>
                        {o.cod_orgao} – {o.desc_orgao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de alteração */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#045ba3] font-medium">Tipo de Alteração</label>
                <Select value={tipoSel} onValueChange={setTipoSel}>
                  <SelectTrigger className="h-9 w-64 text-sm border-[#e3eef6] text-[#045ba3]">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos os tipos</SelectItem>
                    {(data?.opcoes?.tipos ?? []).map((t) => (
                      <SelectItem key={t.codigo} value={t.codigo}>
                        {t.codigo} – {t.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fonte de recurso */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#045ba3] font-medium">Fonte de Recurso</label>
                <Select value={fonteSel} onValueChange={setFonteSel}>
                  <SelectTrigger className="h-9 w-56 text-sm border-[#e3eef6] text-[#045ba3]">
                    <SelectValue placeholder="Todas as fontes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as fontes</SelectItem>
                    {(data?.opcoes?.fontes ?? []).map((f) => (
                      <SelectItem key={f.cod_fonte_recurso} value={f.cod_fonte_recurso}>
                        {f.cod_fonte_recurso} – {f.nomenclatura}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Natureza da despesa */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#045ba3] font-medium">Natureza da Despesa</label>
                <input
                  type="text"
                  placeholder="Código..."
                  value={naturezaSel}
                  onChange={(e) => setNaturezaSel(e.target.value)}
                  className="h-9 w-36 rounded-md border border-[#e3eef6] px-3 text-sm text-[#045ba3] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#008ded]/30"
                />
              </div>

              {/* Limpar filtros */}
              {(mesesSel.length > 0 || orgaoSel !== "__all__" || tipoSel !== "__all__" || fonteSel !== "__all__" || naturezaSel) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setMesesSel([]); setOrgaoSel("__all__"); setTipoSel("__all__"); setFonteSel("__all__"); setNaturezaSel(""); }}
                  className="text-[#008ded] hover:bg-[#008ded]/10 mt-5"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Bloco 1: Cards KPI ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Saldo Anterior"
            value={hasData ? fmtC(data.kpis.vl_saldo_ant_fonte) : "—"}
            subtitle={hasData ? fmt(data.kpis.vl_saldo_ant_fonte) : undefined}
            icon={TrendingDown}
            borderColor="#033e66"
            loading={isLoading}
          />
          <KpiCard
            title="Total Alterado"
            value={hasData ? fmtC(data.kpis.vl_alteracao_fonte) : "—"}
            subtitle={hasData ? fmt(data.kpis.vl_alteracao_fonte) : undefined}
            icon={TrendingUp}
            borderColor="#008ded"
            loading={isLoading}
          />
          <KpiCard
            title="Saldo Atual"
            value={hasData ? fmtC(data.kpis.vl_saldo_atual_fonte) : "—"}
            subtitle={hasData ? fmt(data.kpis.vl_saldo_atual_fonte) : undefined}
            icon={TrendingUp}
            borderColor="#00bfcf"
            loading={isLoading}
          />
          <KpiCard
            title="Qtd. Alterações"
            value={hasData ? data.kpis.qtd_alteracoes.toLocaleString("pt-BR") : "—"}
            icon={BarChart3}
            borderColor="#00e1a4"
            loading={isLoading}
          />
        </div>

        {/* ── Bloco 2: Grid Analítica ─────────────────────────────────────── */}
        <Card className="bg-white shadow-sm rounded-xl border-0">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-base font-bold text-[#033e66] flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#008ded]" />
              Alterações por Tipo de Suplementação
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
                    <TableHead className="text-[#033e66] font-semibold w-10 text-center">Cód</TableHead>
                    <TableHead className="text-[#033e66] font-semibold">Tipo de Suplementação</TableHead>
                    <TableHead className="text-[#033e66] font-semibold text-right">Saldo Anterior</TableHead>
                    <TableHead className="text-[#033e66] font-semibold text-right">Vl. Alteração</TableHead>
                    <TableHead className="text-[#033e66] font-semibold text-right">Saldo Atual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (data?.grid_tipos ?? []).filter((row) =>
                      row.vl_saldo_ant_fonte !== 0 || row.vl_alteracao_fonte !== 0 || row.vl_saldo_atual_fonte !== 0
                    ).map((row) => {
                    const hasValue = true;
                    return (
                      <TableRow key={row.codigo} className="hover:bg-[#e3eef6]/30">
                        <TableCell className="text-center font-mono text-xs text-[#045ba3]">{row.codigo}</TableCell>
                        <TableCell className="text-sm text-[#033e66] font-medium max-w-xs truncate">{row.descricao}</TableCell>
                        <TableCell className="text-right text-sm font-mono text-[#045ba3]">
                          {hasValue ? fmt(row.vl_saldo_ant_fonte) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono font-semibold text-[#008ded]">
                          {hasValue ? fmt(row.vl_alteracao_fonte) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono text-[#045ba3]">
                          {fmt(row.vl_saldo_atual_fonte)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Totais */}
                  {hasData && (
                    <TableRow className="bg-[#033e66]/5 font-bold border-t-2 border-[#033e66]/20">
                      <TableCell className="text-center text-xs text-[#033e66]">∑</TableCell>
                      <TableCell className="text-sm text-[#033e66]">Total</TableCell>
                      <TableCell className="text-right text-sm font-mono text-[#033e66]">
                        {fmt(data.kpis.vl_saldo_ant_fonte)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono text-[#008ded]">
                        {fmt(data.kpis.vl_alteracao_fonte)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono text-[#033e66]">
                        {fmt(data.kpis.vl_saldo_atual_fonte)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ── Bloco 3: Gráficos ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Gráfico A – Evolução mensal */}
          <Card className="bg-white shadow-sm rounded-xl border-0">
            <CardHeader className="px-5 pt-5 pb-2">
              <CardTitle className="text-sm font-bold text-[#033e66]">
                Evolução Mensal das Alterações
              </CardTitle>
              <p className="text-xs text-[#045ba3]">Valor total alterado por mês</p>
            </CardHeader>
            <CardContent className="px-3 pb-4">
              {isLoading ? <Skeleton className="h-56 w-full rounded-lg" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={(data?.evolucao_mensal ?? []).map((d) => ({
                    ...d, name: MESES_NOME[d.mes],
                  }))}>
                    <defs>
                      <linearGradient id="gradAlt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#008ded" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#008ded" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#00bfcf" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#00bfcf" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3eef6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#045ba3" }} />
                    <YAxis tickFormatter={fmtC} tick={{ fontSize: 10, fill: "#045ba3" }} width={72} />
                    <Tooltip content={<CustomTooltip />} formatter={(v: number) => fmt(v)} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#045ba3" }} />
                    <Area type="monotone" dataKey="vl_alteracao_fonte" name="Vl. Alteração"
                      stroke="#008ded" fill="url(#gradAlt)" strokeWidth={2} dot={{ r: 3 }} />
                    <Area type="monotone" dataKey="vl_saldo_atual_fonte" name="Saldo Atual"
                      stroke="#00bfcf" fill="url(#gradSaldo)" strokeWidth={2} dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Gráfico B – Por Órgão */}
          <Card className="bg-white shadow-sm rounded-xl border-0">
            <CardHeader className="px-5 pt-5 pb-2">
              <CardTitle className="text-sm font-bold text-[#033e66]">
                Alterações por Órgão (Top 10)
              </CardTitle>
              <p className="text-xs text-[#045ba3]">Volume alterado por unidade gestora</p>
            </CardHeader>
            <CardContent className="px-3 pb-4">
              {isLoading ? <Skeleton className="h-56 w-full rounded-lg" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    layout="vertical"
                    data={(data?.por_orgao ?? []).slice(0, 10).map((d) => ({
                      name: d.desc_orgao.length > 22 ? d.desc_orgao.slice(0, 20) + "…" : d.desc_orgao,
                      value: d.vl_alteracao_fonte,
                    }))}
                    margin={{ left: 0, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3eef6" horizontal={false} />
                    <XAxis type="number" tickFormatter={fmtC} tick={{ fontSize: 10, fill: "#045ba3" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#033e66" }} width={110} />
                    <Tooltip content={<CustomTooltip />} formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="value" name="Vl. Alteração" radius={[0, 4, 4, 0]}>
                      {(data?.por_orgao ?? []).slice(0, 10).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Gráfico C – Donut por tipo */}
          <Card className="bg-white shadow-sm rounded-xl border-0">
            <CardHeader className="px-5 pt-5 pb-2">
              <CardTitle className="text-sm font-bold text-[#033e66]">
                Distribuição por Tipo de Alteração
              </CardTitle>
              <p className="text-xs text-[#045ba3]">Tipos com participação &lt; 2% agrupados em "Outros"</p>
            </CardHeader>
            <CardContent className="pb-4">
              {isLoading ? <Skeleton className="h-56 w-full rounded-lg" /> : pieData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                  Sem dados no período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="45%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [fmt(v), "Valor"]} />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      iconSize={10}
                      wrapperStyle={{ fontSize: 10, color: "#045ba3", maxWidth: 160 }}
                      formatter={(v) => v.length > 25 ? v.slice(0, 23) + "…" : v}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Gráfico D – Por Fonte */}
          <Card className="bg-white shadow-sm rounded-xl border-0">
            <CardHeader className="px-5 pt-5 pb-2">
              <CardTitle className="text-sm font-bold text-[#033e66]">
                Alterações por Fonte de Recurso (Top 10)
              </CardTitle>
              <p className="text-xs text-[#045ba3]">Fontes com maior volume de alteração</p>
            </CardHeader>
            <CardContent className="px-3 pb-4">
              {isLoading ? <Skeleton className="h-56 w-full rounded-lg" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    layout="vertical"
                    data={(data?.por_fonte ?? []).slice(0, 10).map((d) => ({
                      name: `${d.cod_fonte_recurso} – ${d.nomenclatura.length > 18 ? d.nomenclatura.slice(0, 16) + "…" : d.nomenclatura}`,
                      value: d.vl_alteracao_fonte,
                    }))}
                    margin={{ left: 0, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3eef6" horizontal={false} />
                    <XAxis type="number" tickFormatter={fmtC} tick={{ fontSize: 10, fill: "#045ba3" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#033e66" }} width={130} />
                    <Tooltip content={<CustomTooltip />} formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="value" name="Vl. Alteração" radius={[0, 4, 4, 0]}>
                      {(data?.por_fonte ?? []).slice(0, 10).map((_, i) => (
                        <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Bloco 4: Atos Legais ─────────────────────────────────────────── */}
        <Card className="bg-white shadow-sm rounded-xl border-0">
          <CardHeader className="px-5 pt-5 pb-3">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-base font-bold text-[#033e66] flex items-center gap-2">
                  <Scale className="h-4 w-4 text-[#008ded]" />
                  Base Legal e Histórico de Atos (AOC.90–94)
                </CardTitle>
                <p className="text-xs text-[#045ba3] mt-0.5">
                  Leis de suplementação, créditos especiais, remanejamentos, alterações de PPA e decretos
                </p>
              </div>
              {/* Filtros locais do bloco */}
              {!isLoading && (data?.atos_legais ?? []).length > 0 && (
                <div className="flex flex-wrap items-end gap-2">
                  {/* Filtro Mês */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-[#045ba3] font-medium">Mês</label>
                    <Select value={atoMesSel} onValueChange={setAtoMesSel}>
                      <SelectTrigger className="h-8 w-40 text-xs border-[#e3eef6] text-[#045ba3]">
                        <SelectValue placeholder="Todos os meses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos os meses</SelectItem>
                        {Array.from(new Set((data?.atos_legais ?? []).map((a) => a.mes_referencia)))
                          .sort((a, b) => a - b)
                          .map((m) => (
                            <SelectItem key={m} value={String(m)}>{MESES_FULL[m]}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Filtro Tipo de Crédito */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-[#045ba3] font-medium">Tipo de Crédito</label>
                    <Select value={atoCreditoSel} onValueChange={setAtoCreditoSel}>
                      <SelectTrigger className="h-8 w-48 text-xs border-[#e3eef6] text-[#045ba3]">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos</SelectItem>
                        {Array.from(new Set((data?.atos_legais ?? []).map((a) => a.tipo_credito).filter(Boolean)))
                          .sort()
                          .map((tc) => (
                            <SelectItem key={tc!} value={tc!}>{tc}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Filtro Tipo de Ato */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-[#045ba3] font-medium">Tipo de Ato</label>
                    <Select value={atoTipoSel} onValueChange={setAtoTipoSel}>
                      <SelectTrigger className="h-8 w-44 text-xs border-[#e3eef6] text-[#045ba3]">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos</SelectItem>
                        {Array.from(new Set((data?.atos_legais ?? []).map((a) => a.tipo_ato).filter(Boolean)))
                          .sort()
                          .map((ta) => (
                            <SelectItem key={ta} value={ta}>{ta}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Limpar filtros */}
                  {(atoMesSel !== "__all__" || atoCreditoSel !== "__all__" || atoTipoSel !== "__all__") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-[#008ded] hover:bg-[#e3eef6] self-end"
                      onClick={() => { setAtoMesSel("__all__"); setAtoCreditoSel("__all__"); setAtoTipoSel("__all__"); }}
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-4">
            {isLoading ? (
              <div className="px-5 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (() => {
              const atosFiltrados = (data?.atos_legais ?? []).filter((a) => {
                if (atoMesSel !== "__all__" && String(a.mes_referencia) !== atoMesSel) return false;
                if (atoCreditoSel !== "__all__" && a.tipo_credito !== atoCreditoSel) return false;
                if (atoTipoSel !== "__all__" && a.tipo_ato !== atoTipoSel) return false;
                return true;
              });
              if (atosFiltrados.length === 0) return (
                <p className="px-5 py-4 text-sm text-[#045ba3]">
                  Nenhum ato legal encontrado para os filtros selecionados.
                </p>
              );
              return (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
                        <TableHead className="text-[#033e66] font-semibold">Mês</TableHead>
                        <TableHead className="text-[#033e66] font-semibold">Tipo de Ato</TableHead>
                        <TableHead className="text-[#033e66] font-semibold">Número</TableHead>
                        <TableHead className="text-[#033e66] font-semibold">Data</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-right">Valor Autorizado</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-center">Tipo Crédito</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {atosFiltrados.map((ato, i) => (
                        <TableRow key={i} className="hover:bg-[#e3eef6]/30">
                          <TableCell className="text-sm text-[#045ba3]">{MESES_FULL[ato.mes_referencia]}</TableCell>
                          <TableCell>
                            <Badge
                              style={{
                                backgroundColor: ato.subtipo === "90" ? "#008ded20"
                                  : ato.subtipo === "91" ? "#00bfcf20"
                                  : ato.subtipo === "92" ? "#00e1a420"
                                  : ato.subtipo === "93" ? "#045ba320"
                                  : "#ffb85a20",
                                color: ato.subtipo === "90" ? "#008ded"
                                  : ato.subtipo === "91" ? "#00aac6"
                                  : ato.subtipo === "92" ? "#059669"
                                  : ato.subtipo === "93" ? "#045ba3"
                                  : "#b45309",
                                border: "none",
                                fontSize: 11,
                              }}
                            >
                              {ato.tipo_ato}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm text-[#033e66]">{ato.numero ?? "—"}</TableCell>
                          <TableCell className="text-sm text-[#045ba3]">
                            {ato.data_ato ? new Date(ato.data_ato).toLocaleDateString("pt-BR") : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-[#008ded]">
                            {ato.vl_autorizado != null ? fmt(ato.vl_autorizado) : "—"}
                          </TableCell>
                          <TableCell className="text-center text-xs text-[#045ba3]">
                            {ato.tipo_credito ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Rodapé */}
        <p className="text-center text-xs text-[#045ba3]/60 pb-2">
          Verus · VH Contabilidade Pública · Dados TCM-GO / AOC · {anoExercicio}
        </p>
    </div>
  );
}
