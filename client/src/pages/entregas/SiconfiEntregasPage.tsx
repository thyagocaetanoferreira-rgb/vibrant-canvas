import { useState, useMemo } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw, Loader2, Database, AlertTriangle,
  CheckCircle2, Clock, XCircle, ClipboardList, Filter, Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface ExtratoItem {
  entregavel: string;
  periodo: number;
  periodicidade: string;
  status_relatorio: string | null;
  data_status: string | null;
  forma_envio: string | null;
  tipo_relatorio: string | null;
  populacao: number | null;
  instituicao: string | null;
  sincronizado_em: string | null;
}

interface ExtratoResponse {
  items: ExtratoItem[];
  ultima_sync: string | null;
  total: number;
}

type TipoGrupo = "rreo" | "rgf" | "msc" | "dca" | "outros";

interface EntregaEnriquecida extends ExtratoItem {
  prazo: Date | null;
  intempestiva: boolean;
  diasAtraso: number | null;
  tipoGrupo: TipoGrupo;
  labelPeriodo: string;
}

// ── Constantes ─────────────────────────────────────────────────────────────────

const ANO_ATUAL = new Date().getFullYear();
const ANOS = Array.from({ length: ANO_ATUAL - 2023 }, (_, i) => ANO_ATUAL - i);

const MESES = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const BIMS  = ["", "Jan–Fev", "Mar–Abr", "Mai–Jun", "Jul–Ago", "Set–Out", "Nov–Dez"];
const QUADS = ["", "Jan–Abr", "Mai–Ago", "Set–Dez"];

const FORMA_LABEL: Record<string, string> = {
  P: "Planilha", I: "XML", M: "Matriz", F: "Formulário",
  XML: "XML", CSV: "CSV",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Detecção de tipo de demonstrativo (nome curto ou nome completo da API) ────

function isRREO(entregavel: string): boolean {
  const e = entregavel.toUpperCase();
  return e.includes("RREO") || e.includes("RESUMIDO DE EXECU");
}

function isRGF(entregavel: string): boolean {
  const e = entregavel.toUpperCase();
  return e.includes("RGF") || e.includes("GESTÃO FISCAL") || e.includes("GESTAO FISCAL");
}

function isMSC(entregavel: string): boolean {
  return entregavel.toUpperCase().includes("MSC");
}

function isDCA(entregavel: string): boolean {
  const e = entregavel.toUpperCase();
  return e.includes("DCA") || e.includes("BALANÇO") || e.includes("BALANCO") || e.includes("ANUAL");
}

// ── Cálculo de prazo ──────────────────────────────────────────────────────────

function calcPrazo(item: ExtratoItem, exercicio: number): Date | null {
  const p = item.periodo;
  const yr = exercicio;
  const semestral = item.tipo_relatorio?.trim() === "S" || item.periodicidade?.trim() === "S";

  if (isRREO(item.entregavel)) {
    if (semestral) {
      return p <= 1 ? new Date(yr, 6, 30) : new Date(yr + 1, 0, 30);
    }
    const m = p * 2; // mês subsequente ao bimestre (1-based)
    return m <= 12 ? new Date(yr, m, 30) : new Date(yr + 1, 0, 30);
  }

  if (isRGF(item.entregavel)) {
    if (semestral) {
      return p <= 1 ? new Date(yr, 6, 30) : new Date(yr + 1, 0, 30);
    }
    // Quadrimestral
    if (p === 1) return new Date(yr, 4, 30);  // Mai 30
    if (p === 2) return new Date(yr, 8, 30);  // Set 30
    return new Date(yr + 1, 0, 30);            // Jan 30 ano+1
  }

  if (isMSC(item.entregavel)) {
    if (item.periodicidade?.trim() === "A") return new Date(yr + 1, 2, 31);
    // Mensal: último dia do mês subsequente
    return new Date(yr, p + 1, 0);
  }

  if (isDCA(item.entregavel)) {
    return new Date(yr + 1, 3, 30);
  }

  return null;
}

// ── Label de período ──────────────────────────────────────────────────────────

function mkLabelPeriodo(item: ExtratoItem): string {
  const p = item.periodo;
  const semestral = item.tipo_relatorio?.trim() === "S" || item.periodicidade?.trim() === "S";

  if (isRREO(item.entregavel)) {
    if (semestral)
      return p <= 1 ? "1° Semestre (Jan–Jun)" : "2° Semestre (Jul–Dez)";
    return `${p}° Bimestre (${BIMS[p] ?? p})`;
  }
  if (isRGF(item.entregavel)) {
    if (semestral)
      return p <= 1 ? "1° Semestre (Jan–Jun)" : "2° Semestre (Jul–Dez)";
    return `${p}° Quadrimestre (${QUADS[p] ?? p})`;
  }
  if (item.periodicidade?.trim() === "M") return `Mês ${p} — ${MESES[p] ?? p}`;
  if (item.periodicidade?.trim() === "A") return "Anual";
  return `Período ${p}`;
}

// ── Enriquecimento ────────────────────────────────────────────────────────────

function enriquecer(items: ExtratoItem[], exercicio: number): EntregaEnriquecida[] {
  return items.map((item) => {
    const prazo     = calcPrazo(item, exercicio);
    const dataEnvio = item.data_status ? new Date(item.data_status) : null;
    // Normaliza para comparação apenas por data (sem hora).
    // O data_status da API vem com hora (ex: 23:00:03Z) e o prazo é meia-noite;
    // sem isso, uma entrega em 30/09 às 23h seria erroneamente marcada como intempestiva.
    const dataEnvioSemHora = dataEnvio
      ? new Date(dataEnvio.getFullYear(), dataEnvio.getMonth(), dataEnvio.getDate())
      : null;
    const intempestiva = !!(prazo && dataEnvioSemHora && dataEnvioSemHora > prazo);
    const diasAtraso = prazo && dataEnvioSemHora
      ? Math.round((dataEnvioSemHora.getTime() - prazo.getTime()) / 86_400_000)
      : null;

    const tipoGrupo: TipoGrupo =
      isRREO(item.entregavel) ? "rreo"
      : isRGF(item.entregavel) ? "rgf"
      : isMSC(item.entregavel) ? "msc"
      : isDCA(item.entregavel) ? "dca"
      : "outros";

    return { ...item, prazo, intempestiva, diasAtraso, tipoGrupo, labelPeriodo: mkLabelPeriodo(item) };
  });
}

// ── Badge de status ───────────────────────────────────────────────────────────

function StatusBadge({ item }: { item: EntregaEnriquecida }) {
  // Intempestivo tem prioridade — verificar ANTES do status_relatorio
  if (item.intempestiva) {
    return (
      <Badge style={{ backgroundColor: "#ef444420", color: "#ef4444", border: "none", fontSize: 11 }}>
        Intempestivo
      </Badge>
    );
  }
  const sr = item.status_relatorio?.trim();
  if (sr === "RE") {
    return (
      <Badge style={{ backgroundColor: "#008ded20", color: "#008ded", border: "none", fontSize: 11 }}>
        Retificado
      </Badge>
    );
  }
  return (
    <Badge style={{ backgroundColor: "#00e1a420", color: "#059669", border: "none", fontSize: 11 }}>
      No Prazo
    </Badge>
  );
}

// ── Coluna de dias ────────────────────────────────────────────────────────────

function DiasDiff({ dias }: { dias: number | null }) {
  if (dias === null) return <span className="text-[#045ba3]">—</span>;
  if (dias === 0)    return <span className="font-medium text-[#059669]">No prazo</span>;
  if (dias < 0)     return (
    <span className="font-medium text-[#059669]">{Math.abs(dias)}d antes</span>
  );
  return <span className="font-medium text-[#ef4444]">+{dias}d</span>;
}

// ── Tabela de entregas ─────────────────────────────────────────────────────────

function TabelaEntregas({ rows }: { rows: EntregaEnriquecida[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
        <Database className="w-9 h-9 text-[#008ded]/40" />
        <p className="text-sm text-[#045ba3]">Nenhum registro nesta categoria.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
          <TableHead className="text-[#033e66] font-semibold pl-5">Demonstrativo</TableHead>
          <TableHead className="text-[#033e66] font-semibold">Período</TableHead>
          <TableHead className="text-[#033e66] font-semibold">Prazo</TableHead>
          <TableHead className="text-[#033e66] font-semibold">Enviado em</TableHead>
          <TableHead className="text-[#033e66] font-semibold text-center">Dias (±)</TableHead>
          <TableHead className="text-[#033e66] font-semibold">Instituição</TableHead>
          <TableHead className="text-[#033e66] font-semibold text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow
            key={i}
            className={cn(
              "hover:bg-[#e3eef6]/30",
              row.intempestiva && "bg-[#ef4444]/5",
            )}
          >
            <TableCell className="pl-5 font-medium text-sm text-[#033e66]">
              {row.entregavel}
            </TableCell>
            <TableCell className="text-sm text-[#045ba3]">{row.labelPeriodo}</TableCell>
            <TableCell className="text-sm font-mono text-[#045ba3]">
              {row.prazo ? fmtDate(row.prazo) : "—"}
            </TableCell>
            <TableCell className="text-sm font-mono text-[#045ba3]">
              {fmtDate(row.data_status)}
            </TableCell>
            <TableCell className="text-center text-sm font-mono">
              <DiasDiff dias={row.diasAtraso} />
            </TableCell>
            <TableCell className="text-sm text-[#045ba3]">
              {row.instituicao ?? "—"}
            </TableCell>
            <TableCell className="text-center">
              <StatusBadge item={row} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ── Card KPI ──────────────────────────────────────────────────────────────────

function KpiCard({
  titulo, valor, subtitulo, cor, icon: Icon,
}: {
  titulo: string; valor: number; subtitulo?: string;
  cor: string; icon: React.ElementType;
}) {
  return (
    <Card className="bg-white shadow-sm rounded-xl border-0 border-l-4" style={{ borderLeftColor: cor }}>
      <CardContent className="p-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#045ba3] uppercase tracking-wide">{titulo}</p>
          <p className="text-2xl font-extrabold text-[#033e66] mt-0.5">{valor}</p>
          {subtitulo && <p className="text-xs text-[#045ba3] mt-0.5">{subtitulo}</p>}
        </div>
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${cor}18` }}>
          <Icon className="h-5 w-5" style={{ color: cor }} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Tab trigger com badge ─────────────────────────────────────────────────────

function TabTrigger({
  value, label, count, alert,
}: {
  value: string; label: string; count: number; alert?: boolean;
}) {
  return (
    <TabsTrigger value={value} className="gap-1.5 text-xs sm:text-sm">
      {alert && <AlertTriangle className="w-3.5 h-3.5 text-[#ef4444]" />}
      {label}
      {count > 0 && value !== "painel" && (
        <Badge
          className="ml-1 h-4 text-[10px] px-1.5 shrink-0"
          style={{
            backgroundColor: alert ? "#ef444420" : "#008ded20",
            color: alert ? "#ef4444" : "#008ded",
            border: "none",
          }}
        >
          {count}
        </Badge>
      )}
    </TabsTrigger>
  );
}

// ── Painel de Situação (matriz instituição × período) ─────────────────────────

type CellStatus = "entregue" | "intempestivo" | "nao_entregue" | "futuro";

/** Períodos esperados com base na periodicidade do entregável */
function getExpectedPeriods(periodicidade: string, tipoRelatorio: string | null): number[] {
  const p = periodicidade?.trim();
  const t = tipoRelatorio?.trim();
  if (p === "B" && t !== "S") return [1, 2, 3, 4, 5, 6];
  if (p === "S" || t === "S")  return [1, 2];
  if (p === "Q")               return [1, 2, 3];
  if (p === "M")               return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  if (p === "A")               return [1];
  return [1];
}

/** Label curto para cabeçalho de coluna */
function periodoHeaderLabel(periodo: number, periodicidade: string): string {
  if (periodicidade?.trim() === "M") return MESES[periodo] ?? `M${periodo}`;
  if (periodicidade?.trim() === "B") return `${periodo}°Bim`;
  if (periodicidade?.trim() === "Q") return `${periodo}°Quad`;
  if (periodicidade?.trim() === "S") return `${periodo}°Sem`;
  return `P${periodo}`;
}

/** Célula visual da matriz */
function CelulaStatus({ status }: { status: CellStatus }) {
  if (status === "entregue") return (
    <div className="flex justify-center">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#00e1a4]/20 border border-[#00e1a4]">
        <CheckCircle2 className="w-4 h-4 text-[#059669]" />
      </span>
    </div>
  );
  if (status === "intempestivo") return (
    <div className="flex justify-center">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#ffb85a]/20 border border-[#ffb85a]">
        <AlertTriangle className="w-3.5 h-3.5 text-[#b45309]" />
      </span>
    </div>
  );
  if (status === "nao_entregue") return (
    <div className="flex justify-center">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#ef4444]/15 border border-[#ef4444]/60">
        <XCircle className="w-4 h-4 text-[#ef4444]" />
      </span>
    </div>
  );
  // futuro
  return (
    <div className="flex justify-center">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#e3eef6] border border-[#e3eef6]">
        <Minus className="w-4 h-4 text-[#045ba3]/40" />
      </span>
    </div>
  );
}

/** Matriz de um entregável: linhas = instituições, colunas = períodos */
function MatrizEntregavel({
  entregavel, items, anoSelecionado,
}: {
  entregavel: string;
  items: EntregaEnriquecida[];
  anoSelecionado: number;
}) {
  const hoje = new Date();

  // Periodicidade e tipo do primeiro item (representa o entregável)
  const periodicidade  = items[0]?.periodicidade?.trim() ?? "B";
  const tipoRelatorio  = items[0]?.tipo_relatorio?.trim() ?? null;
  const expectedPeriods = getExpectedPeriods(periodicidade, tipoRelatorio);

  // Instituições únicas para este entregável
  const instituicoes = useMemo(
    () => [...new Set(items.map((i) => i.instituicao ?? "—"))].sort(),
    [items],
  );

  // Mapa: instituição → periodo → pior status (intempestivo > entregue)
  const lookup = useMemo(() => {
    const map = new Map<string, Map<number, CellStatus>>();
    for (const item of items) {
      const inst = item.instituicao ?? "—";
      if (!map.has(inst)) map.set(inst, new Map());
      const periMap = map.get(inst)!;
      const atual   = periMap.get(item.periodo);
      const novo: CellStatus = item.intempestiva ? "intempestivo" : "entregue";
      // Intempestivo prevalece sobre entregue
      if (!atual || (novo === "intempestivo" && atual === "entregue")) {
        periMap.set(item.periodo, novo);
      }
    }
    return map;
  }, [items]);

  const getCellStatus = (inst: string, periodo: number): CellStatus => {
    const delivered = lookup.get(inst)?.get(periodo);
    if (delivered) return delivered;
    // Não entregue: checar se prazo já passou
    const prazo = calcPrazo({ ...items[0], periodo }, anoSelecionado);
    if (!prazo || prazo > hoje) return "futuro";
    return "nao_entregue";
  };

  return (
    <div className="overflow-x-auto">
      <p className="text-xs font-semibold text-[#033e66] uppercase tracking-wide mb-2 px-1">
        {entregavel}
      </p>
      <Table>
        <TableHeader>
          <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
            <TableHead className="text-[#033e66] font-semibold pl-4 min-w-[200px]">
              Instituição
            </TableHead>
            {expectedPeriods.map((p) => (
              <TableHead key={p} className="text-[#033e66] font-semibold text-center px-2 whitespace-nowrap">
                {periodoHeaderLabel(p, periodicidade)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {instituicoes.map((inst) => (
            <TableRow key={inst} className="hover:bg-[#e3eef6]/30">
              <TableCell className="pl-4 text-sm text-[#045ba3] font-medium">{inst}</TableCell>
              {expectedPeriods.map((p) => (
                <TableCell key={p} className="text-center px-2 py-2">
                  <CelulaStatus status={getCellStatus(inst, p)} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Painel de situação: uma MatrizEntregavel por entregável */
function PainelSituacao({
  filtrados, anoSelecionado,
}: {
  filtrados: EntregaEnriquecida[];
  anoSelecionado: number;
}) {
  // Agrupa por entregável mantendo ordem de aparição
  const grupos = useMemo(() => {
    const map = new Map<string, EntregaEnriquecida[]>();
    for (const item of filtrados) {
      if (!map.has(item.entregavel)) map.set(item.entregavel, []);
      map.get(item.entregavel)!.push(item);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [filtrados]);

  if (grupos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
        <Database className="w-9 h-9 text-[#008ded]/40" />
        <p className="text-sm text-[#045ba3]">Nenhum dado disponível para exibir o painel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-[#045ba3]">
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#00e1a4]/20 border border-[#00e1a4]">
            <CheckCircle2 className="w-3 h-3 text-[#059669]" />
          </span>
          Entregue no prazo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#ffb85a]/20 border border-[#ffb85a]">
            <AlertTriangle className="w-3 h-3 text-[#b45309]" />
          </span>
          Intempestivo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#ef4444]/15 border border-[#ef4444]/60">
            <XCircle className="w-3 h-3 text-[#ef4444]" />
          </span>
          Não entregue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#e3eef6] border border-[#e3eef6]">
            <Minus className="w-3 h-3 text-[#045ba3]/40" />
          </span>
          Prazo não vencido
        </span>
      </div>

      {grupos.map(([entregavel, items]) => (
        <MatrizEntregavel
          key={entregavel}
          entregavel={entregavel}
          items={items}
          anoSelecionado={anoSelecionado}
        />
      ))}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function SiconfiEntregasPage() {
  const { municipio } = useAppContext();
  const qc = useQueryClient();
  const [anoSelecionado, setAnoSelecionado] = useState(ANO_ATUAL);
  const [instFiltro, setInstFiltro]         = useState<string>("todos");

  const municipioId = municipio?.municipioId;

  const { data, isLoading } = useQuery<ExtratoResponse>({
    queryKey: ["siconfi-extrato", municipioId, anoSelecionado],
    queryFn: () =>
      api.get<ExtratoResponse>(`/siconfi/extrato/${municipioId}?ano=${anoSelecionado}`),
    enabled: !!municipioId,
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      api.post<{ total: number }>(`/siconfi/sincronizar-extrato/${municipioId}`, {
        ano: anoSelecionado,
      }),
    onSuccess: (d) => {
      toast.success("Extrato sincronizado!", {
        description: `${d.total} registro(s) carregados do SICONFI — exercício ${anoSelecionado}.`,
      });
      qc.invalidateQueries({ queryKey: ["siconfi-extrato", municipioId, anoSelecionado] });
    },
    onError: (err: Error) => {
      toast.error("Erro ao sincronizar", { description: err.message });
    },
  });

  const items      = data?.items ?? [];
  const ultimaSync = data?.ultima_sync ?? null;

  const enriquecidos = useMemo(() => enriquecer(items, anoSelecionado), [items, anoSelecionado]);

  // Lista de instituições únicas para o filtro
  const instituicoes = useMemo(() => {
    const set = new Set<string>();
    enriquecidos.forEach((i) => { if (i.instituicao) set.add(i.instituicao); });
    return Array.from(set).sort();
  }, [enriquecidos]);

  // Aplicar filtro de instituição
  const filtrados = useMemo(() =>
    instFiltro === "todos"
      ? enriquecidos
      : enriquecidos.filter((i) => i.instituicao === instFiltro),
  [enriquecidos, instFiltro]);

  // KPIs (sobre lista filtrada)
  const noPrazo       = filtrados.filter((i) => !i.intempestiva && i.data_status).length;
  const intempestivos = filtrados.filter((i) => i.intempestiva).length;

  // Filtros por grupo
  const grp = (g: TipoGrupo) => filtrados.filter((i) => i.tipoGrupo === g);
  const intempLista   = filtrados.filter((i) => i.intempestiva);

  if (!municipioId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <AlertTriangle className="w-10 h-10 text-[#ffb85a]" />
        <p className="text-[#045ba3]">Selecione um município para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-gradient-to-r from-[#008ded] to-[#00bfcf]">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#033e66]">Entregas SICONFI</h1>
          </div>
          <p className="text-sm text-[#045ba3]">
            {municipio.municipioNome}
            {ultimaSync && (
              <> · Sincronizado em {fmtDateTime(ultimaSync)}</>
            )}
            {!ultimaSync && " · Dados ainda não sincronizados"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-[#008ded] text-[#008ded] hover:bg-[#008ded]/10 gap-1.5"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending || isLoading}
        >
          {syncMutation.isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <RefreshCw className="h-4 w-4" />}
          {syncMutation.isPending ? "Sincronizando…" : `Sincronizar ${anoSelecionado}`}
        </Button>
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <Card className="bg-white shadow-sm rounded-xl border-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Filter className="h-4 w-4 text-[#008ded]" />
            <span className="text-sm font-semibold text-[#033e66]">Filtros</span>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <p className="text-xs text-[#045ba3] font-medium">Exercício</p>
              <Select
                value={String(anoSelecionado)}
                onValueChange={(v) => { setAnoSelecionado(Number(v)); setInstFiltro("todos"); }}
              >
                <SelectTrigger className="w-[130px] h-9 text-sm border-[#e3eef6] text-[#045ba3]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANOS.map((a) => (
                    <SelectItem key={a} value={String(a)}>
                      {a}{a === ANO_ATUAL ? " (atual)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {instituicoes.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-[#045ba3] font-medium">Instituição</p>
                <Select value={instFiltro} onValueChange={setInstFiltro}>
                  <SelectTrigger className="w-[260px] h-9 text-sm border-[#e3eef6] text-[#045ba3]">
                    <SelectValue placeholder="Todas as instituições" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as instituições</SelectItem>
                    {instituicoes.map((inst) => (
                      <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Estado vazio ────────────────────────────────────────────────────── */}
      {!isLoading && items.length === 0 && (
        <Card className="bg-white shadow-sm rounded-xl border-0">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="p-4 rounded-full bg-[#e3eef6]">
              <Database className="w-10 h-10 text-[#008ded]/60" />
            </div>
            <div>
              <p className="font-semibold text-[#033e66]">
                Nenhum dado sincronizado para {municipio.municipioNome} — {anoSelecionado}
              </p>
              <p className="text-sm text-[#045ba3] mt-1">
                Clique em "Sincronizar" para buscar o extrato de entregas na API SICONFI.
              </p>
            </div>
            <Button
              className="gap-1.5 bg-[#008ded] hover:bg-[#027fc4] text-white"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <RefreshCw className="h-4 w-4" />}
              Sincronizar agora
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      {(isLoading || items.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            titulo="Total Registros"
            valor={isLoading ? 0 : filtrados.length}
            subtitulo="no extrato SICONFI"
            cor="#033e66"
            icon={Database}
          />
          <KpiCard
            titulo="No Prazo"
            valor={isLoading ? 0 : noPrazo}
            subtitulo="entregues dentro do prazo"
            cor="#00e1a4"
            icon={CheckCircle2}
          />
          <KpiCard
            titulo="Intempestivos"
            valor={isLoading ? 0 : intempestivos}
            subtitulo="entregues fora do prazo"
            cor="#ef4444"
            icon={XCircle}
          />
          <KpiCard
            titulo="Retificações"
            valor={isLoading ? 0 : filtrados.filter((i) => i.status_relatorio?.trim() === "RE").length}
            subtitulo="demonstrativos retificados"
            cor="#ffb85a"
            icon={Clock}
          />
        </div>
      )}

      {/* ── Aviso intempestividade ───────────────────────────────────────────── */}
      {intempestivos > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-[#ef4444] shrink-0" />
          <p className="text-sm text-[#ef4444] font-medium">
            {intempestivos} entrega{intempestivos > 1 ? "s foram realizadas" : " foi realizada"} fora do prazo
            no exercício {anoSelecionado}. Verifique a aba <strong>Intempestividade</strong>.
          </p>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      {(isLoading || items.length > 0) && (
        <Card className="bg-white shadow-sm rounded-xl border-0">
          <CardHeader className="px-5 pt-5 pb-0">
            <CardTitle className="text-base font-bold text-[#033e66] flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[#008ded]" />
              Situação dos Demonstrativos — {anoSelecionado}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-4">
            <Tabs defaultValue="painel">
              <TabsList className="flex flex-wrap h-auto gap-1 bg-[#e3eef6]/60 p-1 rounded-lg mb-4">
                <TabTrigger value="painel"             label="Painel de Situação" count={0} />
                <TabTrigger value="todos"              label="Todos"              count={filtrados.length} />
                <TabTrigger value="rreo"               label="RREO"               count={grp("rreo").length} />
                <TabTrigger value="rgf"                label="RGF"                count={grp("rgf").length} />
                <TabTrigger value="msc"                label="MSC"                count={grp("msc").length} />
                <TabTrigger value="dca"                label="DCA"                count={grp("dca").length} />
                {grp("outros").length > 0 && (
                  <TabTrigger value="outros"           label="Outros"             count={grp("outros").length} />
                )}
                <TabTrigger value="intempestividade"   label="Intempestividade"   count={intempLista.length} alert />
              </TabsList>

              <TabsContent value="painel">
                <PainelSituacao filtrados={filtrados} anoSelecionado={anoSelecionado} />
              </TabsContent>

              <TabsContent value="todos">
                <TabelaEntregas rows={filtrados} />
              </TabsContent>
              <TabsContent value="rreo">
                <TabelaEntregas rows={grp("rreo")} />
              </TabsContent>
              <TabsContent value="rgf">
                <TabelaEntregas rows={grp("rgf")} />
              </TabsContent>
              <TabsContent value="msc">
                <TabelaEntregas rows={grp("msc")} />
              </TabsContent>
              <TabsContent value="dca">
                <TabelaEntregas rows={grp("dca")} />
              </TabsContent>
              <TabsContent value="outros">
                <TabelaEntregas rows={grp("outros")} />
              </TabsContent>

              <TabsContent value="intempestividade">
                {intempLista.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                    <CheckCircle2 className="w-9 h-9 text-[#00e1a4]" />
                    <p className="font-semibold text-[#033e66]">Nenhuma entrega intempestiva!</p>
                    <p className="text-sm text-[#045ba3]">
                      Todos os demonstrativos foram entregues dentro do prazo em {anoSelecionado}.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/5 px-4 py-3 mb-4">
                      <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0" />
                      <p className="text-sm text-[#ef4444]">
                        <strong>{intempLista.length}</strong> entrega{intempLista.length > 1 ? "s" : ""}{" "}
                        realizada{intempLista.length > 1 ? "s" : ""} fora do prazo neste exercício.
                        A análise considera a data de homologação (HO) em relação ao prazo legal.
                      </p>
                    </div>
                    <TabelaEntregas rows={intempLista} />
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* ── Rodapé ──────────────────────────────────────────────────────────── */}
      <p className="text-xs text-[#045ba3]/60 text-center">
        Verus · VH Contabilidade Pública · Dados SICONFI — STN · {anoSelecionado}
      </p>
    </div>
  );
}
