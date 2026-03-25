import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area,
  PieChart, Pie, Cell,
  BarChart, Bar, LabelList,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle, RefreshCw, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Paleta Verus ──────────────────────────────────────────────────────────────
const COLORS = ["#008ded", "#00bfcf", "#00e1a4", "#045ba3", "#2bb0f9", "#00aac6", "#033e66", "#ffb85a"];

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ContaBancaria {
  cod_orgao: string;
  nome_orgao: string;
  cod_unidade: string;
  banco: string;
  nome_banco: string;
  agencia: string;
  conta_corrente: string;
  conta_corrente_dv: string;
  tipo_conta: string;
  desc_tipo_conta: string;
  cod_fonte_recurso: string | null;
  saldo_inicial: number;
  vl_entradas: number;
  vl_saidas: number;
  saldo_final: number;
}

interface KpiData {
  saldo_inicial: number;
  vl_entradas: number;
  vl_saidas: number;
  saldo_final: number;
}

interface EvolucaoMes {
  mes: number;
  saldo_final: number;
}

interface PorTipoConta {
  tipo_conta: string;
  total: number;
}

interface PorFonte {
  fonte: string;
  total: number;
}

interface PorOrgao {
  orgao: string;
  entradas: number;
  saidas: number;
}

interface OpcoesFiltros {
  orgaos: { cod_orgao: string; nome_orgao: string }[];
  tipos_conta: { codigo: string; descricao: string }[];
  fontes: string[];
}

interface ApiResponse {
  kpis: KpiData;
  contas: ContaBancaria[];
  evolucao_mensal: EvolucaoMes[];
  por_tipo_conta: PorTipoConta[];
  por_fonte: PorFonte[];
  por_orgao: PorOrgao[];
  opcoes: OpcoesFiltros;
}

// ── Utilitários ───────────────────────────────────────────────────────────────

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (v: number) => BRL.format(v);

const fmtC = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}K`;
  return BRL.format(v);
};

const MESES_ABR = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESES_NOME = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

// ── Tooltip customizado Verus ─────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e3eef6] rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-[#033e66] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Card KPI (padrão Verus) ───────────────────────────────────────────────────

function KpiCard({
  title, value, icon: Icon, borderColor,
}: {
  title: string; value: string;
  icon: React.ElementType; borderColor: string;
}) {
  return (
    <Card className="bg-white shadow-sm rounded-xl border-0 border-l-4 flex-1 min-w-[180px]" style={{ borderLeftColor: borderColor }}>
      <CardContent className="p-4 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#045ba3] uppercase tracking-wide truncate">{title}</p>
          <p className="text-lg font-extrabold text-[#033e66] mt-0.5 leading-tight">{value}</p>
        </div>
        <div className="ml-3 p-2 rounded-lg" style={{ backgroundColor: `${borderColor}18` }}>
          <Icon className="h-5 w-5" style={{ color: borderColor }} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function SaldosBancariosPage() {
  const { municipio, anoExercicio } = useAppContext();
  const clienteId = municipio?.clienteId;

  // Filtros
  const [mes, setMes] = useState<string>("todos");
  const [codOrgao, setCodOrgao] = useState<string>("todos");
  const [tipoConta, setTipoConta] = useState<string>("todos");
  const [codFonte, setCodFonte] = useState<string>("todos");
  const [tabelaColapsada, setTabelaColapsada] = useState<boolean>(false);

  const { data, isLoading, isError, refetch } = useQuery<ApiResponse>({
    queryKey: ["paineis-saldos-bancarios", clienteId, anoExercicio, mes, codOrgao, tipoConta, codFonte],
    enabled: !!clienteId,
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("cliente_id", clienteId!);
      params.set("ano", anoExercicio);
      if (mes !== "todos")       params.set("mes", mes);
      if (codOrgao !== "todos")  params.set("cod_orgao", codOrgao);
      if (tipoConta !== "todos") params.set("tipo_conta", tipoConta);
      if (codFonte !== "todos")  params.set("cod_fonte_recurso", codFonte);
      return api.get(`/paineis/financeiro/saldos-bancarios?${params.toString()}`);
    },
  });

  const hasData = !!data && data.contas.length > 0;
  const opcoes: OpcoesFiltros = data?.opcoes ?? { orgaos: [], tipos_conta: [], fontes: [] };
  const totais = data?.kpis ?? { saldo_inicial: 0, vl_entradas: 0, vl_saidas: 0, saldo_final: 0 };

  const evolucaoCompleta = Array.from({ length: 12 }, (_, i) => {
    const found = data?.evolucao_mensal.find((e) => e.mes === i + 1);
    return { mes: MESES_ABR[i], saldo_final: found?.saldo_final ?? 0 };
  });

  return (
    <div className="space-y-6 p-1">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-heading font-bold text-[#033e66]">Saldos Bancários e Caixa</h1>
            <Badge variant="outline" className="text-xs border-[#008ded] text-[#008ded]">CTB</Badge>
          </div>
          <p className="text-[#045ba3] mt-1 text-sm">
            {municipio
              ? <><span className="font-medium text-[#033e66]">{municipio.municipioNome}</span> · Posição das contas bancárias e de caixa — exercício {anoExercicio}</>
              : `Posição das contas bancárias e de caixa do município — exercício ${anoExercicio}`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="border-[#e3eef6] text-[#045ba3] hover:bg-[#e3eef6]"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card className="bg-white shadow-sm rounded-xl border-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Filter className="h-4 w-4 text-[#008ded]" />
            <span className="text-sm font-semibold text-[#033e66]">Filtros</span>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#045ba3] font-medium">Mês</label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger className="h-9 w-44 text-sm border-[#e3eef6] text-[#045ba3]">
                  <SelectValue placeholder="Todos os meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os meses</SelectItem>
                  {MESES_NOME.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#045ba3] font-medium">Órgão</label>
              <Select value={codOrgao} onValueChange={setCodOrgao}>
                <SelectTrigger className="h-9 w-64 text-sm border-[#e3eef6] text-[#045ba3]">
                  <SelectValue placeholder="Todos os órgãos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os órgãos</SelectItem>
                  {opcoes.orgaos.map((o) => (
                    <SelectItem key={o.cod_orgao} value={o.cod_orgao}>{o.nome_orgao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#045ba3] font-medium">Tipo de Conta</label>
              <Select value={tipoConta} onValueChange={setTipoConta}>
                <SelectTrigger className="h-9 w-56 text-sm border-[#e3eef6] text-[#045ba3]">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {opcoes.tipos_conta.map((t) => (
                    <SelectItem key={t.codigo} value={t.codigo}>{t.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#045ba3] font-medium">Fonte de Recurso</label>
              <Select value={codFonte} onValueChange={setCodFonte}>
                <SelectTrigger className="h-9 w-48 text-sm border-[#e3eef6] text-[#045ba3]">
                  <SelectValue placeholder="Todas as fontes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as fontes</SelectItem>
                  {opcoes.fontes.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="flex gap-4 flex-wrap">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-20 flex-1 min-w-[180px] rounded-xl" />)}
        </div>
      ) : (
        <div className="flex gap-4 flex-wrap">
          <KpiCard
            title="Saldo Inicial"
            value={fmt(totais.saldo_inicial)}
            icon={Landmark}
            borderColor="#008ded"
          />
          <KpiCard
            title="Entradas"
            value={fmt(totais.vl_entradas)}
            icon={ArrowUpCircle}
            borderColor="#00e1a4"
          />
          <KpiCard
            title="Saídas"
            value={fmt(totais.vl_saidas)}
            icon={ArrowDownCircle}
            borderColor="#ffb85a"
          />
          <KpiCard
            title="Saldo Final"
            value={fmt(totais.saldo_final)}
            icon={totais.saldo_final >= 0 ? TrendingUp : TrendingDown}
            borderColor={totais.saldo_final >= 0 ? "#00e1a4" : "#ef4444"}
          />
        </div>
      )}

      {/* Tabela analítica */}
      <Card className="rounded-xl border border-[#e3eef6] shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-[#033e66]">Contas Bancárias — Detalhamento</CardTitle>
            {hasData && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-7 border-[#e3eef6] text-[#045ba3] hover:bg-[#e3eef6]"
                onClick={() => setTabelaColapsada((v) => !v)}
              >
                {tabelaColapsada
                  ? <><ChevronDown className="w-3.5 h-3.5" /> Expandir tabela</>
                  : <><ChevronUp className="w-3.5 h-3.5" /> Recolher tabela</>}
              </Button>
            )}
          </div>
        </CardHeader>
        {!tabelaColapsada && (
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : !hasData ? (
              <div className="p-8 text-center text-[#045ba3] text-sm">
                Nenhum dado encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#e3eef6]/50">
                      <TableHead className="font-bold text-[#033e66] text-xs whitespace-nowrap">Órgão</TableHead>
                      <TableHead className="font-bold text-[#033e66] text-xs whitespace-nowrap">Unidade</TableHead>
                      <TableHead className="font-bold text-[#033e66] text-xs whitespace-nowrap">Banco / Agência / C/C</TableHead>
                      <TableHead className="font-bold text-[#033e66] text-xs text-right whitespace-nowrap">Saldo Inicial</TableHead>
                      <TableHead className="font-bold text-[#033e66] text-xs text-right whitespace-nowrap">Entradas</TableHead>
                      <TableHead className="font-bold text-[#033e66] text-xs text-right whitespace-nowrap">Saídas</TableHead>
                      <TableHead className="font-bold text-[#033e66] text-xs text-right whitespace-nowrap">Saldo Final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const grupos = new Map<string, ContaBancaria[]>();
                      for (const c of data.contas) {
                        const chave = c.cod_fonte_recurso ?? "—";
                        if (!grupos.has(chave)) grupos.set(chave, []);
                        grupos.get(chave)!.push(c);
                      }
                      const rows: React.ReactNode[] = [];
                      let grupoIdx = 0;
                      grupos.forEach((contas, fonte) => {
                        rows.push(
                          <TableRow key={`fonte-${fonte}`} className={cn("border-t", grupoIdx > 0 && "border-t-2")}>
                            <TableCell
                              colSpan={7}
                              className="py-1.5 px-3 text-xs font-semibold bg-[#e3eef6]/40 text-[#045ba3] tracking-wide"
                            >
                              Fonte: <span className="font-mono text-[#033e66]">{fonte}</span>
                            </TableCell>
                          </TableRow>
                        );
                        contas.forEach((c, idx) => {
                          rows.push(
                            <TableRow key={`${fonte}-${idx}`} className="text-xs hover:bg-[#e3eef6]/30 transition-colors">
                              <TableCell className="text-xs max-w-[160px] truncate text-[#033e66]" title={c.nome_orgao}>{c.nome_orgao}</TableCell>
                              <TableCell className="text-xs text-[#045ba3] font-mono">{c.cod_unidade}</TableCell>
                              <TableCell className="text-xs whitespace-nowrap text-[#045ba3]">
                                {c.nome_banco} Ag.{c.agencia} C/C {c.conta_corrente}{c.conta_corrente_dv ? `-${c.conta_corrente_dv}` : ""}
                              </TableCell>
                              <TableCell className="text-xs text-right tabular-nums text-[#033e66]">{fmt(c.saldo_inicial)}</TableCell>
                              <TableCell className="text-xs text-right tabular-nums font-medium" style={{ color: "#00aac6" }}>{fmt(c.vl_entradas)}</TableCell>
                              <TableCell className="text-xs text-right tabular-nums font-medium text-[#ef4444]">{fmt(c.vl_saidas)}</TableCell>
                              <TableCell className={cn(
                                "text-xs text-right tabular-nums font-semibold",
                                c.saldo_final > 0 ? "text-[#00aac6]" : "text-[#ef4444]"
                              )}>
                                {fmt(c.saldo_final)}
                              </TableCell>
                            </TableRow>
                          );
                        });
                        grupoIdx++;
                      });
                      return rows;
                    })()}

                    {/* Linha de totais */}
                    <TableRow className="bg-[#e3eef6]/50 font-bold border-t-2">
                      <TableCell colSpan={3} className="text-xs font-bold text-[#033e66]">Total Geral</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-bold text-[#033e66]">{fmt(totais.saldo_inicial)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-bold" style={{ color: "#00aac6" }}>{fmt(totais.vl_entradas)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-bold text-[#ef4444]">{fmt(totais.vl_saidas)}</TableCell>
                      <TableCell className={cn(
                        "text-xs text-right tabular-nums font-bold",
                        totais.saldo_final >= 0 ? "text-[#00aac6]" : "text-[#ef4444]"
                      )}>
                        {fmt(totais.saldo_final)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Gráficos */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      ) : hasData ? (
        <div className="space-y-4">
          {/* Gráfico A — Evolução do Saldo Final */}
          <Card className="rounded-xl border border-[#e3eef6] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-[#033e66]">Evolução do Saldo Final — {anoExercicio}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={evolucaoCompleta} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#008ded" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#008ded" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e3eef6" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#045ba3" }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#045ba3" }}
                    tickFormatter={(v) => fmtC(v)}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="saldo_final"
                    name="Saldo Final"
                    stroke="#008ded"
                    fill="url(#gradSaldo)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#008ded" }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráficos B e C — lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico B — PieChart donut por tipo de conta */}
            <Card className="rounded-xl border border-[#e3eef6] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-[#033e66]">Distribuição por Tipo de Conta</CardTitle>
              </CardHeader>
              <CardContent>
                {data.por_tipo_conta.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-sm text-[#045ba3]">
                    Sem dados
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.por_tipo_conta}
                        dataKey="total"
                        nameKey="tipo_conta"
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                        label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                        labelLine={false}
                      >
                        {data.por_tipo_conta.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid #e3eef6", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => fmt(v)}
                      />
                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        iconSize={10}
                        wrapperStyle={{ fontSize: 11, paddingTop: 8, color: "#045ba3" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Gráfico C — BarChart horizontal Entradas x Saídas por órgão */}
            <Card className="rounded-xl border border-[#e3eef6] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-[#033e66]">Entradas × Saídas por Órgão (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                {data.por_orgao.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-sm text-[#045ba3]">
                    Sem dados
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={data.por_orgao}
                      layout="vertical"
                      margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e3eef6" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: "#045ba3" }}
                        tickFormatter={(v) => fmtC(v)}
                        width={70}
                      />
                      <YAxis
                        type="category"
                        dataKey="orgao"
                        width={180}
                        tick={{ fontSize: 10, fill: "#045ba3" }}
                        tickFormatter={(v: string) => v.length > 24 ? v.slice(0, 24) + "…" : v}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, color: "#045ba3" }} />
                      <Bar dataKey="entradas" name="Entradas" fill="#00bfcf" maxBarSize={18} radius={[0, 3, 3, 0]} />
                      <Bar dataKey="saidas" name="Saídas" fill="#ffb85a" maxBarSize={18} radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gráfico D — Saldo Final por Fonte de Recurso */}
          {data.por_fonte && data.por_fonte.length > 0 && (
            <Card className="rounded-xl border border-[#e3eef6] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-[#033e66]">
                  Representatividade do Saldo Final por Fonte de Recurso
                </CardTitle>
                <p className="text-xs text-[#045ba3]">
                  Participação percentual de cada fonte no saldo final total (CTB.11)
                </p>
              </CardHeader>
              <CardContent>
                {(() => {
                  const totalFonte = data.por_fonte.reduce((s, f) => s + f.total, 0);
                  return (
                    <ResponsiveContainer width="100%" height={Math.max(300, data.por_fonte.length * 28)}>
                      <BarChart
                        data={data.por_fonte}
                        layout="vertical"
                        margin={{ top: 4, right: 120, left: 8, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e3eef6" horizontal={false} />
                        <XAxis
                          type="number"
                          tickFormatter={(v) => fmtC(v)}
                          tick={{ fontSize: 10, fill: "#045ba3" }}
                        />
                        <YAxis
                          type="category"
                          dataKey="fonte"
                          width={80}
                          tick={{ fontSize: 10, fill: "#045ba3", fontFamily: "monospace" }}
                        />
                        <Tooltip
                          contentStyle={{ background: "#fff", border: "1px solid #e3eef6", borderRadius: 8, fontSize: 12 }}
                          formatter={(value: number) => [
                            `${fmt(value)}  (${totalFonte > 0 ? ((value / totalFonte) * 100).toFixed(1) : 0}%)`,
                            "Saldo Final",
                          ]}
                        />
                        <Bar dataKey="total" name="Saldo Final" maxBarSize={20} radius={[0, 3, 3, 0]}>
                          {data.por_fonte.map((entry, i) => (
                            <Cell key={entry.fonte} fill={COLORS[i % COLORS.length]} fillOpacity={0.9} />
                          ))}
                          <LabelList
                            dataKey="total"
                            position="right"
                            formatter={(v: number) =>
                              totalFonte > 0 ? `${((v / totalFonte) * 100).toFixed(1)}%` : ""
                            }
                            style={{ fontSize: 10, fill: "#045ba3" }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Estado de erro */}
      {isError && (
        <div className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 p-4 text-sm text-[#ef4444]">
          Erro ao carregar dados. Tente novamente.
        </div>
      )}

      {/* Sem município selecionado */}
      {!clienteId && (
        <div className="rounded-xl border border-[#e3eef6] bg-[#e3eef6]/40 p-6 text-center text-sm text-[#045ba3]">
          Selecione um município para visualizar os saldos bancários.
        </div>
      )}
    </div>
  );
}
