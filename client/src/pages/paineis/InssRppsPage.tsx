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

// ── Componentes auxiliares ────────────────────────────────────────────────────

function KpiCard({
  label, value, color, icon,
}: { label: string; value: number; color: string; icon?: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border p-4 space-y-1 bg-card", color)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon}
      </div>
      <p className="text-xl font-bold font-heading leading-tight">{fmt(value)}</p>
    </div>
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
          <SheetTitle>
            {mes != null ? MESES_NOME[mes - 1] : ""} — Órgãos
          </SheetTitle>
        </SheetHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Órgão</TableHead>
              <TableHead className="text-right">Receita</TableHead>
              <TableHead className="text-right">Despesa</TableHead>
              <TableHead className="text-right">Diferença</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgaos.map((o) => (
              <TableRow
                key={o.cod_orgao}
                className="cursor-pointer hover:bg-accent/40 group"
                onClick={() => onOrgaoClick(o)}
              >
                <TableCell>
                  <div className="font-medium leading-tight">{o.nome_orgao}</div>
                  <div className="text-xs text-muted-foreground font-mono">{o.cod_orgao}</div>
                </TableCell>
                <TableCell className="text-right text-blue-600 dark:text-blue-400">{fmt(o.receita)}</TableCell>
                <TableCell className="text-right text-red-600 dark:text-red-400">{fmt(o.despesa)}</TableCell>
                <TableCell className={cn(
                  "text-right font-semibold",
                  o.diferenca > 0
                    ? "text-red-600 dark:text-red-400"
                    : o.diferenca < 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground"
                )}>
                  {fmt(o.diferenca)}
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-border bg-muted/50 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
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
          <SheetTitle>
            Lançamentos — Órgão {orgao?.cod_orgao}
            {mes != null && <span className="text-muted-foreground font-normal text-sm ml-2">({MESES_NOME[mes - 1]})</span>}
          </SheetTitle>
        </SheetHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº Extra-Orç.</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Subtipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lancamentos.map((l, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">{l.nr_extra_orcamentaria}</TableCell>
                <TableCell className="font-mono text-xs">{l.cod_unidade}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {CAT_NOME[l.categoria] ?? l.categoria}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {SUB_TIPO_NOME[l.sub_tipo] ?? l.sub_tipo}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs max-w-[200px] truncate">{l.desc_extra_orc}</TableCell>
                <TableCell className={cn(
                  "text-right font-medium text-xs",
                  l.categoria === "0"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {fmt(l.vl_lancamento)}
                </TableCell>
              </TableRow>
            ))}
            {lancamentos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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

  const municipioId = municipio?.municipioId;

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
  const totalReceita        = meses.reduce((s, m) => s + m.receita, 0);
  const totalDespesa        = meses.reduce((s, m) => s + m.despesa, 0);
  const totalAnulacoes      = meses.reduce((s, m) => s + m.anulacao_receita + m.anulacao_despesa, 0);
  const totalSaldo          = meses.reduce((s, m) => s + m.diferenca, 0);
  // Positivo = município reteve (ruim); negativo = repassou (bom)
  const reteve              = totalSaldo > 0;

  // Dados para o gráfico
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
            <Landmark className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-heading font-bold text-primary">
              INSS e RPPS — Extraorçamentário
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {municipio
              ? <><span className="font-medium text-foreground">{municipio.municipioNome}</span> · Exercício {anoExercicio}</>
              : "Selecione um município para carregar os dados"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {SUB_TIPO_LABELS[filtro]}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </Button>
        </div>
      </div>

      {/* ── Toggle de filtro ─────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-fit">
        {(["ambos", "001", "002"] as SubTipoFiltro[]).map((v) => (
          <button
            key={v}
            onClick={() => setFiltro(v)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              filtro === v
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {v === "ambos" ? "Ambos" : v === "001" ? "INSS" : "RPPS"}
          </button>
        ))}
      </div>

      {/* ── Conteúdo principal ───────────────────────────────────────────── */}
      {!clienteId ? (
        <div className="rounded-xl border bg-muted/20 flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Selecione um município no menu superior.</p>
        </div>
      ) : isLoading ? (
        <SkeletonPage />
      ) : isError ? (
        <div className="rounded-xl border bg-destructive/10 p-6 text-center text-destructive">
          Erro ao carregar dados. Tente novamente.
        </div>
      ) : !hasData ? (
        <div className="rounded-xl border bg-muted/20 flex flex-col items-center justify-center py-20 gap-2">
          <Landmark className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
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
              color="border-blue-200 dark:border-blue-900"
              icon={<TrendingUp className="w-4 h-4 text-blue-500" />}
            />
            <KpiCard
              label="Total Despesa"
              value={totalDespesa}
              color="border-red-200 dark:border-red-900"
              icon={<TrendingDown className="w-4 h-4 text-red-500" />}
            />
            <KpiCard
              label="Total Anulações"
              value={totalAnulacoes}
              color="border-orange-200 dark:border-orange-900"
              icon={<span className="text-orange-500 text-base leading-none">∅</span>}
            />
            <div className={cn(
              "rounded-xl border p-4 space-y-1 bg-card",
              reteve
                ? "border-red-200 dark:border-red-900"
                : "border-green-200 dark:border-green-900"
            )}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Saldo Líquido</span>
                {reteve
                  ? <TrendingUp className="w-4 h-4 text-red-500" />
                  : <TrendingDown className="w-4 h-4 text-green-500" />}
              </div>
              <p className={cn(
                "text-xl font-bold font-heading leading-tight",
                reteve ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
              )}>
                {fmt(totalSaldo)}
              </p>
              {reteve && (
                <p className="text-xs text-red-500 font-medium">⚠ Município reteve recursos</p>
              )}
            </div>
          </div>

          {/* ── Tabela mensal ───────────────────────────────────────────── */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-foreground">Mês</TableHead>
                  <TableHead className="text-right font-bold text-foreground">Receita</TableHead>
                  <TableHead className="text-right font-bold text-foreground">Despesa</TableHead>
                  <TableHead className="text-right font-bold text-foreground">Anul. Receita</TableHead>
                  <TableHead className="text-right font-bold text-foreground">Anul. Despesa</TableHead>
                  <TableHead className="text-right font-bold text-foreground">Diferença</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {meses.map((m) => (
                  <TableRow
                    key={m.mes}
                    className="cursor-pointer hover:bg-accent/30 transition-colors group"
                    onClick={() => setMesSelecionado(m)}
                  >
                    <TableCell className="font-medium">
                      {MESES_NOME[m.mes - 1]}
                    </TableCell>
                    <TableCell className="text-right text-blue-600 dark:text-blue-400">
                      {fmt(m.receita)}
                    </TableCell>
                    <TableCell className="text-right text-red-600 dark:text-red-400">
                      {fmt(m.despesa)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600 dark:text-orange-400">
                      {fmt(m.anulacao_receita)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600 dark:text-orange-400">
                      {fmt(m.anulacao_despesa)}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-semibold rounded",
                      m.diferenca > 0
                        ? "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
                        : m.diferenca < 0
                          ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30"
                          : "text-muted-foreground"
                    )}>
                      {fmt(m.diferenca)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-border bg-muted/50 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Linha de totais */}
                <TableRow className="bg-muted/40 font-bold border-t-2">
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right text-blue-700 dark:text-blue-300 font-bold">
                    {fmt(totalReceita)}
                  </TableCell>
                  <TableCell className="text-right text-red-700 dark:text-red-300 font-bold">
                    {fmt(totalDespesa)}
                  </TableCell>
                  <TableCell className="text-right text-orange-700 dark:text-orange-300 font-bold">
                    {fmt(meses.reduce((s, m) => s + m.anulacao_receita, 0))}
                  </TableCell>
                  <TableCell className="text-right text-orange-700 dark:text-orange-300 font-bold">
                    {fmt(meses.reduce((s, m) => s + m.anulacao_despesa, 0))}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-bold",
                    reteve ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300"
                  )}>
                    {fmt(totalSaldo)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* ── Gráfico ─────────────────────────────────────────────────── */}
          <div className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold text-sm mb-4 text-muted-foreground">
              Evolução Mensal — Receita × Despesa × Diferença
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("pt-BR", { notation: "compact", compactDisplay: "short" }).format(v)
                  }
                  tick={{ fontSize: 11 }}
                  width={72}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [fmt(value), name]}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Legend />
                <Bar dataKey="Receita" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Despesa" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={40} />
                <Line
                  type="monotone"
                  dataKey="Diferença"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
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
