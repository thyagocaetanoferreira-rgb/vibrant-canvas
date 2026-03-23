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
import { Landmark, TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

const fmtCompact = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);

const MESES_ABR = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESES_NOME = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const PIE_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6"];

// ── Componentes auxiliares ────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number;
  colorClass: string;
  icon: React.ReactNode;
}

function KpiCard({ label, value, colorClass, icon }: KpiCardProps) {
  return (
    <Card className="flex-1 min-w-[180px]">
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className={cn("text-xl font-bold mt-1", colorClass)}>{fmt(value)}</p>
          </div>
          <div className={cn("p-2 rounded-lg", colorClass.replace("text-", "bg-").replace("-600",""),"bg-opacity-10")}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Tooltip customizado ───────────────────────────────────────────────────────

function TooltipBRL({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-background shadow-md px-3 py-2 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
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

  // Totais da tabela
  const totais = data?.kpis ?? { saldo_inicial: 0, vl_entradas: 0, vl_saidas: 0, saldo_final: 0 };

  // Evolução mensal — garantir os 12 meses
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
            <h1 className="text-2xl font-heading font-bold text-primary">Saldos Bancários e Caixa</h1>
            <Badge variant="outline" className="text-xs">CTB</Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Posição das contas bancárias e de caixa do município — exercício {anoExercicio}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Mês */}
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os meses</SelectItem>
            {MESES_NOME.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Órgão */}
        <Select value={codOrgao} onValueChange={setCodOrgao}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Órgão" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os órgãos</SelectItem>
            {opcoes.orgaos.map((o) => (
              <SelectItem key={o.cod_orgao} value={o.cod_orgao}>{o.nome_orgao}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tipo de conta */}
        <Select value={tipoConta} onValueChange={setTipoConta}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tipo de conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {opcoes.tipos_conta.map((t) => (
              <SelectItem key={t.codigo} value={t.codigo}>{t.descricao}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Fonte de recurso */}
        <Select value={codFonte} onValueChange={setCodFonte}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as fontes</SelectItem>
            {opcoes.fontes.map((f) => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="flex gap-4 flex-wrap">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-24 flex-1 min-w-[180px]" />)}
        </div>
      ) : (
        <div className="flex gap-4 flex-wrap">
          <KpiCard
            label="Saldo Inicial"
            value={totais.saldo_inicial}
            colorClass="text-blue-600"
            icon={<Landmark className="w-5 h-5 text-blue-600" />}
          />
          <KpiCard
            label="Entradas"
            value={totais.vl_entradas}
            colorClass="text-emerald-600"
            icon={<ArrowUpCircle className="w-5 h-5 text-emerald-600" />}
          />
          <KpiCard
            label="Saídas"
            value={totais.vl_saidas}
            colorClass="text-red-600"
            icon={<ArrowDownCircle className="w-5 h-5 text-red-600" />}
          />
          <KpiCard
            label="Saldo Final"
            value={totais.saldo_final}
            colorClass={totais.saldo_final >= 0 ? "text-emerald-600" : "text-red-600"}
            icon={
              totais.saldo_final >= 0
                ? <TrendingUp className="w-5 h-5 text-emerald-600" />
                : <TrendingDown className="w-5 h-5 text-red-600" />
            }
          />
        </div>
      )}

      {/* Tabela analítica */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Contas Bancárias — Detalhamento</CardTitle>
            {hasData && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-7"
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
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum dado encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-foreground text-xs whitespace-nowrap">Órgão</TableHead>
                      <TableHead className="font-bold text-foreground text-xs whitespace-nowrap">Unidade</TableHead>
                      <TableHead className="font-bold text-foreground text-xs whitespace-nowrap">Banco / Agência / C/C</TableHead>
                      <TableHead className="font-bold text-foreground text-xs text-right whitespace-nowrap">Saldo Inicial</TableHead>
                      <TableHead className="font-bold text-foreground text-xs text-right whitespace-nowrap">Entradas</TableHead>
                      <TableHead className="font-bold text-foreground text-xs text-right whitespace-nowrap">Saídas</TableHead>
                      <TableHead className="font-bold text-foreground text-xs text-right whitespace-nowrap">Saldo Final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Agrupar por fonte de recurso
                      const grupos = new Map<string, ContaBancaria[]>();
                      for (const c of data.contas) {
                        const chave = c.cod_fonte_recurso ?? "—";
                        if (!grupos.has(chave)) grupos.set(chave, []);
                        grupos.get(chave)!.push(c);
                      }
                      const rows: React.ReactNode[] = [];
                      let grupoIdx = 0;
                      grupos.forEach((contas, fonte) => {
                        // Cabeçalho do grupo de fonte
                        rows.push(
                          <TableRow key={`fonte-${fonte}`} className={cn("border-t", grupoIdx > 0 && "border-t-2")}>
                            <TableCell
                              colSpan={7}
                              className="py-1.5 px-3 text-xs font-semibold bg-muted/50 text-muted-foreground tracking-wide"
                            >
                              Fonte: <span className="font-mono text-foreground">{fonte}</span>
                            </TableCell>
                          </TableRow>
                        );
                        contas.forEach((c, idx) => {
                          rows.push(
                            <TableRow key={`${fonte}-${idx}`} className="text-xs">
                              <TableCell className="text-xs max-w-[160px] truncate" title={c.nome_orgao}>{c.nome_orgao}</TableCell>
                              <TableCell className="text-xs">{c.cod_unidade}</TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                {c.nome_banco} Ag.{c.agencia} C/C {c.conta_corrente}{c.conta_corrente_dv ? `-${c.conta_corrente_dv}` : ""}
                              </TableCell>
                              <TableCell className="text-xs text-right tabular-nums">{fmt(c.saldo_inicial)}</TableCell>
                              <TableCell className="text-xs text-right tabular-nums text-emerald-700">{fmt(c.vl_entradas)}</TableCell>
                              <TableCell className="text-xs text-right tabular-nums text-red-700">{fmt(c.vl_saidas)}</TableCell>
                              <TableCell className={cn(
                                "text-xs text-right tabular-nums font-semibold",
                                c.saldo_final > 0 ? "text-emerald-700" : "text-red-700"
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
                    <TableRow className="bg-muted/40 font-bold border-t-2">
                      <TableCell colSpan={3} className="text-xs font-bold text-foreground">Total Geral</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-bold text-foreground">{fmt(totais.saldo_inicial)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-bold text-emerald-700">{fmt(totais.vl_entradas)}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-bold text-red-700">{fmt(totais.vl_saidas)}</TableCell>
                      <TableCell className={cn(
                        "text-xs text-right tabular-nums font-bold",
                        totais.saldo_final >= 0 ? "text-emerald-700" : "text-red-700"
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
          <Skeleton className="h-64 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      ) : hasData ? (
        <div className="space-y-4">
          {/* Gráfico A — Evolução do Saldo Final (col inteira) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Evolução do Saldo Final — {anoExercicio}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={evolucaoCompleta} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => fmtCompact(v)}
                    width={80}
                  />
                  <Tooltip content={<TooltipBRL />} formatter={(v: number) => [fmt(v), "Saldo Final"]} />
                  <Area
                    type="monotone"
                    dataKey="saldo_final"
                    name="Saldo Final"
                    stroke="#3b82f6"
                    fill="url(#gradSaldo)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#3b82f6" }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráficos B e C — lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico B — PieChart por tipo de conta */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Distribuição por Tipo de Conta</CardTitle>
              </CardHeader>
              <CardContent>
                {data.por_tipo_conta.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
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
                        outerRadius={90}
                        label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                        labelLine={false}
                      >
                        {data.por_tipo_conta.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        iconSize={10}
                        wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Gráfico C — BarChart horizontal Entradas x Saídas por órgão */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Entradas × Saídas por Órgão (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                {data.por_orgao.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                    Sem dados
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={data.por_orgao}
                      layout="vertical"
                      margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => fmtCompact(v)}
                        width={70}
                      />
                      <YAxis
                        type="category"
                        dataKey="orgao"
                        width={180}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: string) => v.length > 24 ? v.slice(0, 24) + "…" : v}
                      />
                      <Tooltip content={<TooltipBRL />} formatter={(v: number, name: string) => [fmt(v), name]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="entradas" name="Entradas" fill="#10b981" maxBarSize={18} />
                      <Bar dataKey="saidas" name="Saídas" fill="#ef4444" maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gráfico D — Saldo Final por Fonte de Recurso */}
          {data.por_fonte && data.por_fonte.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  Representatividade do Saldo Final por Fonte de Recurso
                </CardTitle>
                <p className="text-xs text-muted-foreground">
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
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis
                          type="number"
                          tickFormatter={(v) => fmtCompact(v)}
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="fonte"
                          width={80}
                          tick={{ fontSize: 10, fontFamily: "monospace" }}
                        />
                        <Tooltip
                          formatter={(value: number) => [
                            `${fmt(value)}  (${totalFonte > 0 ? ((value / totalFonte) * 100).toFixed(1) : 0}%)`,
                            "Saldo Final",
                          ]}
                        />
                        <Bar dataKey="total" name="Saldo Final" maxBarSize={20} radius={[0, 3, 3, 0]}>
                          {data.por_fonte.map((entry, i) => (
                            <Cell
                              key={entry.fonte}
                              fill={PIE_COLORS[i % PIE_COLORS.length]}
                              fillOpacity={0.85}
                            />
                          ))}
                          <LabelList
                            dataKey="total"
                            position="right"
                            formatter={(v: number) =>
                              totalFonte > 0 ? `${((v / totalFonte) * 100).toFixed(1)}%` : ""
                            }
                            style={{ fontSize: 10, fill: "var(--foreground)" }}
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
        <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400">
          {(error as Error)?.message ?? "Erro ao carregar dados. Tente novamente."}
        </div>
      )}

      {/* Sem município selecionado */}
      {!clienteId && (
        <div className="rounded-md border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          Selecione um município para visualizar os saldos bancários.
        </div>
      )}
    </div>
  );
}
