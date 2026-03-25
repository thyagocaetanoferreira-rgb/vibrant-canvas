import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Landmark, RefreshCw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type SubTipoFiltro = "ambos" | "001" | "002";

interface Lancamento {
  nr_extra_orcamentaria: string;
  cod_orgao: string;
  cod_unidade: string;
  categoria: string;
  sub_tipo: string;
  desc_extra_orc: string;
  vl_lancamento: number;
}

interface OrgaoData {
  cod_orgao: string;
  nome_orgao: string;
  receita: number;
  despesa: number;
  anulacao_receita: number;
  anulacao_despesa: number;
  diferenca: number;
  lancamentos: Lancamento[];
}

interface MesData {
  mes: number;
  receita: number;
  despesa: number;
  anulacao_receita: number;
  anulacao_despesa: number;
  diferenca: number;
  por_orgao: OrgaoData[];
}

interface ApiResponse {
  por_mes: MesData[];
}

// ── Utilitários ───────────────────────────────────────────────────────────────

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (v: number) => BRL.format(v);

const fmtC = (v: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", compactDisplay: "short" }).format(v);

const MESES_ABR = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESES_NOME = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const SUB_TIPO_LABELS: Record<SubTipoFiltro, string> = {
  ambos: "Ambos (INSS + RPPS)",
  "001": "INSS",
  "002": "RPPS",
};

// ── Tooltip customizado Verus ─────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
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
}

// ── Card KPI (padrão Verus) ───────────────────────────────────────────────────

function KpiCard({
  label, value, borderColor, icon: Icon,
}: {
  label: string; value: number; borderColor: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="bg-white shadow-sm rounded-xl border-0 border-l-4" style={{ borderLeftColor: borderColor }}>
      <CardContent className="p-4 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#045ba3] uppercase tracking-wide truncate">{label}</p>
          <p className="text-lg font-extrabold text-[#033e66] mt-0.5 leading-tight">{fmt(value)}</p>
        </div>
        <div className="ml-3 p-2 rounded-lg" style={{ backgroundColor: `${borderColor}18` }}>
          <Icon className="h-5 w-5" style={{ color: borderColor }} />
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonPage() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

// ── Sheet Nível 2 — Órgãos ────────────────────────────────────────────────────

function OrgaosSheet({
  mes, orgaos, open, onClose, onOrgaoClick,
}: {
  mes: number | null;
  orgaos: OrgaoData[];
  open: boolean;
  onClose: () => void;
  onOrgaoClick: (orgao: OrgaoData) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-[#033e66]">
            {mes != null ? MESES_NOME[mes - 1] : ""} — Órgãos
          </SheetTitle>
        </SheetHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-[#e3eef6]/50">
              <TableHead className="font-bold text-[#033e66]">Órgão</TableHead>
              <TableHead className="text-right font-bold text-[#033e66]">Receita</TableHead>
              <TableHead className="text-right font-bold text-[#033e66]">Despesa</TableHead>
              <TableHead className="text-right font-bold text-[#033e66]">Diferença</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgaos.map((o) => (
              <TableRow
                key={o.cod_orgao}
                className="cursor-pointer hover:bg-[#e3eef6]/40 transition-colors group"
                onClick={() => onOrgaoClick(o)}
              >
                <TableCell>
                  <div className="font-medium leading-tight text-[#033e66]">{o.nome_orgao}</div>
                  <div className="text-xs text-[#045ba3] font-mono">{o.cod_orgao}</div>
                </TableCell>
                <TableCell className="text-right font-medium" style={{ color: "#008ded" }}>{fmt(o.receita)}</TableCell>
                <TableCell className="text-right font-medium text-[#ef4444]">{fmt(o.despesa)}</TableCell>
                <TableCell className={cn(
                  "text-right font-semibold",
                  o.diferenca > 0
                    ? "text-[#ef4444]"
                    : o.diferenca < 0
                      ? "text-[#00e1a4]"
                      : "text-[#045ba3]"
                )}>
                  {fmt(o.diferenca)}
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-[#e3eef6] bg-[#e3eef6]/50 text-[#045ba3] group-hover:bg-[#008ded] group-hover:text-white group-hover:border-[#008ded] transition-all">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SheetContent>
    </Sheet>
  );
}

// ── Sheet Nível 3 — Lançamentos ───────────────────────────────────────────────

const SUB_TIPO_NOME: Record<string, string> = { "001": "INSS", "002": "RPPS" };
const CAT_NOME: Record<string, string> = { "0": "Receita", "1": "Despesa" };

function LancamentosSheet({
  orgao, mes, lancamentos, open, onClose,
}: {
  orgao: OrgaoData | null;
  mes: number | null;
  lancamentos: Lancamento[];
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-[#033e66]">
            Lançamentos — Órgão {orgao?.cod_orgao}
            {mes != null && <span className="text-[#045ba3] font-normal text-sm ml-2">({MESES_NOME[mes - 1]})</span>}
          </SheetTitle>
        </SheetHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-[#e3eef6]/50">
              <TableHead className="font-bold text-[#033e66]">Nº Extra-Orç.</TableHead>
              <TableHead className="font-bold text-[#033e66]">Unidade</TableHead>
              <TableHead className="font-bold text-[#033e66]">Categoria</TableHead>
              <TableHead className="font-bold text-[#033e66]">Subtipo</TableHead>
              <TableHead className="font-bold text-[#033e66]">Descrição</TableHead>
              <TableHead className="text-right font-bold text-[#033e66]">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lancamentos.map((l, i) => (
              <TableRow key={i} className="hover:bg-[#e3eef6]/30 transition-colors">
                <TableCell className="font-mono text-xs text-[#045ba3]">{l.nr_extra_orcamentaria}</TableCell>
                <TableCell className="font-mono text-xs text-[#045ba3]">{l.cod_unidade}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="text-xs border-[#008ded] text-[#008ded]"
                  >
                    {CAT_NOME[l.categoria] ?? l.categoria}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-[#e3eef6] text-[#045ba3]"
                  >
                    {SUB_TIPO_NOME[l.sub_tipo] ?? l.sub_tipo}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs max-w-[200px] truncate text-[#033e66]">{l.desc_extra_orc}</TableCell>
                <TableCell className={cn(
                  "text-right font-medium text-xs",
                  l.categoria === "0" ? "text-[#008ded]" : "text-[#ef4444]"
                )}>
                  {fmt(l.vl_lancamento)}
                </TableCell>
              </TableRow>
            ))}
            {lancamentos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-[#045ba3] py-8">
                  Nenhum lançamento
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </SheetContent>
    </Sheet>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function InssRppsPage() {
  const { municipio, anoExercicio } = useAppContext();
  const [filtro, setFiltro] = useState<SubTipoFiltro>("ambos");
  const [mesSelecionado, setMesSelecionado] = useState<MesData | null>(null);
  const [orgaoSelecionado, setOrgaoSelecionado] = useState<OrgaoData | null>(null);

  const clienteId = municipio?.clienteId;
  const queryKey = ["paineis-inss-rpps", clienteId, anoExercicio, filtro];

  const { data, isLoading, isError, refetch } = useQuery<ApiResponse>({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({
        cliente_id: String(clienteId),
        ano: anoExercicio,
      });
      if (filtro !== "ambos") params.set("sub_tipo", filtro);
      return api.get(`/paineis/extraorcamentario/inss-rpps?${params}`);
    },
    enabled: !!clienteId,
  });

  const meses: MesData[] = data?.por_mes ?? [];

  // KPIs totais anuais
  const totalReceita   = meses.reduce((s, m) => s + m.receita, 0);
  const totalDespesa   = meses.reduce((s, m) => s + m.despesa, 0);
  const totalAnulacoes = meses.reduce((s, m) => s + m.anulacao_receita + m.anulacao_despesa, 0);
  const totalSaldo     = meses.reduce((s, m) => s + m.diferenca, 0);
  const reteve         = totalSaldo > 0;

  const chartData = meses.map((m) => ({
    mes: MESES_ABR[m.mes - 1],
    Receita: m.receita,
    Despesa: m.despesa,
    Diferença: m.diferenca,
  }));

  const hasData = meses.some((m) => m.receita > 0 || m.despesa > 0);

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-heading font-bold text-[#033e66]">
              INSS e RPPS — Extraorçamentário
            </h1>
            <Badge variant="outline" className="text-xs border-[#008ded] text-[#008ded]">CTB</Badge>
          </div>
          <p className="text-sm text-[#045ba3] mt-1">
            {municipio
              ? <><span className="font-medium text-[#033e66]">{municipio.municipioNome}</span> · Exercício {anoExercicio}</>
              : "Selecione um município para carregar os dados"}
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          className="border-[#e3eef6] text-[#045ba3] hover:bg-[#e3eef6] gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </Button>
      </div>

      {/* ── Toggle de filtro ─────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-lg bg-[#e3eef6]/60 w-fit">
        {(["ambos", "001", "002"] as SubTipoFiltro[]).map((v) => (
          <button
            key={v}
            onClick={() => setFiltro(v)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              filtro === v
                ? "bg-[#008ded] text-white shadow-sm"
                : "text-[#045ba3] hover:text-[#033e66] hover:bg-[#e3eef6]"
            )}
          >
            {v === "ambos" ? "Ambos" : v === "001" ? "INSS" : "RPPS"}
          </button>
        ))}
      </div>

      {/* ── Conteúdo principal ───────────────────────────────────────────── */}
      {!clienteId ? (
        <div className="rounded-xl border border-[#e3eef6] bg-[#e3eef6]/40 flex items-center justify-center py-20">
          <p className="text-sm text-[#045ba3]">Selecione um município no menu superior.</p>
        </div>
      ) : isLoading ? (
        <SkeletonPage />
      ) : isError ? (
        <div className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 p-6 text-center text-[#ef4444] text-sm">
          Erro ao carregar dados. Tente novamente.
        </div>
      ) : !hasData ? (
        <div className="rounded-xl border border-[#e3eef6] bg-[#e3eef6]/40 flex flex-col items-center justify-center py-20 gap-2">
          <Landmark className="w-10 h-10 text-[#045ba3]/30" />
          <p className="text-sm text-[#045ba3]">
            Nenhum lançamento encontrado para este município e exercício.
          </p>
        </div>
      ) : (
        <>
          {/* ── KPI Cards ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Receita"
              value={totalReceita}
              borderColor="#008ded"
              icon={TrendingUp}
            />
            <KpiCard
              label="Total Despesa"
              value={totalDespesa}
              borderColor="#ef4444"
              icon={TrendingDown}
            />
            <KpiCard
              label="Total Anulações"
              value={totalAnulacoes}
              borderColor="#ffb85a"
              icon={TrendingDown}
            />
            {/* Saldo Líquido — card especial com indicador semântico */}
            <Card
              className="bg-white shadow-sm rounded-xl border-0 border-l-4"
              style={{ borderLeftColor: reteve ? "#ef4444" : "#00e1a4" }}
            >
              <CardContent className="p-4 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#045ba3] uppercase tracking-wide">Saldo Líquido</p>
                  <p
                    className="text-lg font-extrabold mt-0.5 leading-tight"
                    style={{ color: reteve ? "#ef4444" : "#00aac6" }}
                  >
                    {fmt(totalSaldo)}
                  </p>
                  {reteve && (
                    <p className="text-xs font-medium mt-0.5" style={{ color: "#ffb85a" }}>
                      ⚠ Município reteve recursos
                    </p>
                  )}
                </div>
                <div
                  className="ml-3 p-2 rounded-lg"
                  style={{ backgroundColor: reteve ? "#ef444418" : "#00e1a418" }}
                >
                  {reteve
                    ? <TrendingUp className="h-5 w-5 text-[#ef4444]" />
                    : <TrendingDown className="h-5 w-5" style={{ color: "#00aac6" }} />
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Tabela mensal ───────────────────────────────────────────── */}
          <Card className="rounded-xl border border-[#e3eef6] shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-[#033e66]">Resumo Mensal</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#e3eef6]/50">
                    <TableHead className="font-bold text-[#033e66]">Mês</TableHead>
                    <TableHead className="text-right font-bold text-[#033e66]">Receita</TableHead>
                    <TableHead className="text-right font-bold text-[#033e66]">Despesa</TableHead>
                    <TableHead className="text-right font-bold text-[#033e66]">Anul. Receita</TableHead>
                    <TableHead className="text-right font-bold text-[#033e66]">Anul. Despesa</TableHead>
                    <TableHead className="text-right font-bold text-[#033e66]">Diferença</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meses.map((m) => (
                    <TableRow
                      key={m.mes}
                      className="cursor-pointer hover:bg-[#e3eef6]/40 transition-colors group"
                      onClick={() => setMesSelecionado(m)}
                    >
                      <TableCell className="font-medium text-[#033e66]">
                        {MESES_NOME[m.mes - 1]}
                      </TableCell>
                      <TableCell className="text-right font-medium" style={{ color: "#008ded" }}>
                        {fmt(m.receita)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-[#ef4444]">
                        {fmt(m.despesa)}
                      </TableCell>
                      <TableCell className="text-right text-[#ffb85a]">
                        {fmt(m.anulacao_receita)}
                      </TableCell>
                      <TableCell className="text-right text-[#ffb85a]">
                        {fmt(m.anulacao_despesa)}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-semibold",
                        m.diferenca > 0
                          ? "text-[#ef4444]"
                          : m.diferenca < 0
                            ? "text-[#00aac6]"
                            : "text-[#045ba3]"
                      )}>
                        {fmt(m.diferenca)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-[#e3eef6] bg-[#e3eef6]/50 text-[#045ba3] group-hover:bg-[#008ded] group-hover:text-white group-hover:border-[#008ded] transition-all">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Linha de totais */}
                  <TableRow className="bg-[#e3eef6]/50 font-bold border-t-2">
                    <TableCell className="font-bold text-[#033e66]">Total</TableCell>
                    <TableCell className="text-right font-bold" style={{ color: "#008ded" }}>
                      {fmt(totalReceita)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-[#ef4444]">
                      {fmt(totalDespesa)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-[#ffb85a]">
                      {fmt(meses.reduce((s, m) => s + m.anulacao_receita, 0))}
                    </TableCell>
                    <TableCell className="text-right font-bold text-[#ffb85a]">
                      {fmt(meses.reduce((s, m) => s + m.anulacao_despesa, 0))}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-bold",
                      reteve ? "text-[#ef4444]" : "text-[#00aac6]"
                    )}>
                      {fmt(totalSaldo)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* ── Gráfico ─────────────────────────────────────────────────── */}
          <Card className="rounded-xl border border-[#e3eef6] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-[#033e66]">
                Evolução Mensal — Receita × Despesa × Diferença
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e3eef6" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#045ba3" }} />
                  <YAxis
                    tickFormatter={(v) => fmtC(v)}
                    tick={{ fontSize: 11, fill: "#045ba3" }}
                    width={72}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#045ba3" }} />
                  <Bar dataKey="Receita" fill="#008ded" radius={[3, 3, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Despesa" fill="#ffb85a" radius={[3, 3, 0, 0]} maxBarSize={40} />
                  <Line
                    type="monotone"
                    dataKey="Diferença"
                    stroke="#00e1a4"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#00e1a4" }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Drill-down Nível 2: Órgãos ──────────────────────────────────── */}
      <OrgaosSheet
        mes={mesSelecionado?.mes ?? null}
        orgaos={mesSelecionado?.por_orgao ?? []}
        open={!!mesSelecionado && !orgaoSelecionado}
        onClose={() => setMesSelecionado(null)}
        onOrgaoClick={(o) => setOrgaoSelecionado(o)}
      />

      {/* ── Drill-down Nível 3: Lançamentos ─────────────────────────────── */}
      <LancamentosSheet
        orgao={orgaoSelecionado}
        mes={mesSelecionado?.mes ?? null}
        lancamentos={orgaoSelecionado?.lancamentos ?? []}
        open={!!orgaoSelecionado}
        onClose={() => setOrgaoSelecionado(null)}
      />
    </div>
  );
}
