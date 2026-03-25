import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Download, RefreshCw, CheckCircle2, XCircle, Clock,
  AlertCircle, Loader2, Database, Calendar, RotateCcw,
  TrendingUp, FileCheck, FileX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ImportJob {
  id: number;
  status: "em_andamento" | "concluido" | "erro";
  an_exercicio: number;
  periodos_total: number;
  periodos_importados: number;
  mensagem_erro: string | null;
  iniciado_em: string;
  finalizado_em: string | null;
}

interface PeriodoStatus {
  nr_periodo: number;
  total_linhas: number;
  importado_em: string | null;
}

interface AnoResume {
  ano: number;
  periodos_importados: number;
  ultima_importacao: string | null;
}

interface StatusResponse {
  job: ImportJob | null;
  periodos: PeriodoStatus[];
  anos: AnoResume[];
}

// ── Constantes ────────────────────────────────────────────────────────────────

const ANO_ATUAL = new Date().getFullYear();
const ANOS_DISPONIVEIS = Array.from(
  { length: ANO_ATUAL - 2024 + 1 },
  (_, i) => ANO_ATUAL - i,
); // [2026, 2025, 2024] (dinâmico)

const BIMESTRES = [
  { nr: 1, label: "1° Bimestre", meses: "Jan – Fev" },
  { nr: 2, label: "2° Bimestre", meses: "Mar – Abr" },
  { nr: 3, label: "3° Bimestre", meses: "Mai – Jun" },
  { nr: 4, label: "4° Bimestre", meses: "Jul – Ago" },
  { nr: 5, label: "5° Bimestre", meses: "Set – Out" },
  { nr: 6, label: "6° Bimestre", meses: "Nov – Dez" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
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

// ── Card de resumo de ano ─────────────────────────────────────────────────────

function AnoCard({
  resumo,
  anoSelecionado,
  onClick,
}: {
  resumo: AnoResume;
  anoSelecionado: number;
  onClick: () => void;
}) {
  const ativo = resumo.ano === anoSelecionado;
  const completo = resumo.periodos_importados === 6;

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-all w-full",
        ativo
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/30",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={cn("font-bold text-lg", ativo ? "text-primary" : "text-foreground")}>
          {resumo.ano}
        </span>
        {completo ? (
          <FileCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
        ) : (
          <FileX className="w-4 h-4 text-yellow-500" />
        )}
      </div>
      <div className="text-2xl font-bold text-foreground mb-0.5">
        {resumo.periodos_importados}
        <span className="text-sm font-normal text-muted-foreground"> / 6 bim.</span>
      </div>
      <p className="text-xs text-muted-foreground truncate">
        {resumo.ultima_importacao ? `Última: ${fmtDate(resumo.ultima_importacao)}` : "—"}
      </p>
    </button>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function ImportacaoSiconfiPage() {
  const { municipio } = useAppContext();
  const qc = useQueryClient();
  const [anoSelecionado, setAnoSelecionado] = useState(ANO_ATUAL);
  const [isImporting, setIsImporting] = useState(false);

  const municipioId = municipio?.municipioId;

  const { data, isLoading } = useQuery<StatusResponse>({
    queryKey: ["siconfi-status", municipioId, anoSelecionado],
    queryFn: () =>
      api.get<StatusResponse>(
        `/siconfi/status-importacao/${municipioId}?ano=${anoSelecionado}`,
      ),
    enabled: !!municipioId,
    refetchInterval: (query) => {
      const job = query.state.data?.job;
      return job?.status === "em_andamento" ? 2000 : false;
    },
    onSuccess: (d) => {
      if (d.job?.status === "concluido" && isImporting) {
        setIsImporting(false);
        toast.success("Importação concluída!", {
          description: `${d.job.periodos_importados} período(s) importado(s) — exercício ${d.job.an_exercicio}.`,
        });
        qc.invalidateQueries({ queryKey: ["siconfi-status", municipioId] });
      }
      if (d.job?.status === "erro" && isImporting) {
        setIsImporting(false);
        toast.error("Erro na importação", {
          description: d.job.mensagem_erro ?? "Erro desconhecido",
        });
      }
    },
  });

  const importarMutation = useMutation({
    mutationFn: () =>
      api.post<{ job_id: number }>(`/siconfi/importar-rreo/${municipioId}`, {
        ano: anoSelecionado,
      }),
    onMutate: () => {
      setIsImporting(true);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["siconfi-status", municipioId, anoSelecionado] });
    },
    onError: (err: Error) => {
      toast.error("Erro ao iniciar importação", { description: err.message });
    },
  });

  const job      = data?.job ?? null;
  const periodos = data?.periodos ?? [];
  const anos     = data?.anos ?? [];
  const jobAtivo = job?.status === "em_andamento";

  const progresso =
    job && job.periodos_total > 0
      ? Math.round((job.periodos_importados / job.periodos_total) * 100)
      : 0;

  // Mescla bimestres fixos com status importado
  const linhas = BIMESTRES.map((bim) => ({
    ...bim,
    periodo: periodos.find((p) => p.nr_periodo === bim.nr) ?? null,
  }));

  const totalImportados = periodos.length;
  const totalPendentes  = 6 - totalImportados;

  if (!municipioId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
        <AlertCircle className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground">Selecione um município para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-primary flex items-center gap-2">
          <Database className="w-6 h-6" />
          Importação SICONFI — RREO
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Importação automática via API pública do Tesouro Nacional.
          Município: <span className="font-medium text-foreground">{municipio.municipioNome}</span>
        </p>
      </div>

      {/* ── Histórico por ano ──────────────────────────────────────────────── */}
      {anos.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Histórico importado
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {anos.map((r) => (
              <AnoCard
                key={r.ano}
                resumo={r}
                anoSelecionado={anoSelecionado}
                onClick={() => setAnoSelecionado(r.ano)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Seletor de ano + ações ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Exercício
          </label>
          <Select
            value={String(anoSelecionado)}
            onValueChange={(v) => setAnoSelecionado(Number(v))}
          >
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANOS_DISPONIVEIS.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}{a === ANO_ATUAL ? " (atual)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Contadores rápidos */}
        {!isLoading && (
          <div className="flex items-center gap-3 text-sm pb-0.5">
            <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
              <CheckCircle2 className="w-4 h-4" /> {totalImportados}/6 importado(s)
            </span>
            {totalPendentes > 0 && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-4 h-4" /> {totalPendentes} sem dados no SICONFI
              </span>
            )}
          </div>
        )}

        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              qc.invalidateQueries({ queryKey: ["siconfi-status", municipioId, anoSelecionado] })
            }
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => importarMutation.mutate()}
            disabled={jobAtivo || importarMutation.isPending || isLoading}
          >
            {jobAtivo || importarMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {jobAtivo ? "Importando…" : `Importar ${anoSelecionado}`}
          </Button>
          {totalImportados > 0 && !jobAtivo && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => importarMutation.mutate()}
              disabled={importarMutation.isPending}
              title="Re-importar mesmo que já importado (atualiza valores)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Re-importar
            </Button>
          )}
        </div>
      </div>

      {/* ── Barra de progresso ─────────────────────────────────────────────── */}
      {job && (
        <div className={cn(
          "rounded-xl border p-4 space-y-2.5",
          job.status === "concluido" && "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20",
          job.status === "erro"      && "border-red-200   bg-red-50   dark:border-red-800   dark:bg-red-950/20",
          job.status === "em_andamento" && "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20",
        )}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              {job.status === "em_andamento" && `Importando exercício ${job.an_exercicio}…`}
              {job.status === "concluido"    && `Exercício ${job.an_exercicio} importado com sucesso`}
              {job.status === "erro"         && `Falha na importação do exercício ${job.an_exercicio}`}
            </span>
            <JobStatusBadge status={job.status} />
          </div>

          {job.status === "em_andamento" && (
            <div className="space-y-1">
              <Progress value={progresso} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {job.periodos_importados} de {job.periodos_total} período(s) concluído(s) ({progresso}%)
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Iniciado: <b className="text-foreground">{fmtDateTime(job.iniciado_em)}</b></span>
            {job.finalizado_em && (
              <span>Finalizado: <b className="text-foreground">{fmtDateTime(job.finalizado_em)}</b></span>
            )}
          </div>

          {job.status === "erro" && job.mensagem_erro && (
            <p className="text-xs font-mono text-red-700 dark:text-red-400 bg-white/60 dark:bg-black/20 rounded p-2 break-all">
              {job.mensagem_erro}
            </p>
          )}
        </div>
      )}

      {/* ── Tabela de extrato ─────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/20">
          <div>
            <h2 className="font-semibold text-sm">Extrato de Entregas — RREO {anoSelecionado}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Situação das declarações no SICONFI e status de importação no sistema
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-14 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Carregando extrato…</span>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[150px] pl-5">Bimestre</TableHead>
                  <TableHead className="w-[100px] text-muted-foreground">Meses</TableHead>
                  <TableHead className="w-[140px] text-center">No Sistema</TableHead>
                  <TableHead className="w-[160px] text-right">Linhas importadas</TableHead>
                  <TableHead className="text-right pr-5">Última atualização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map(({ nr, label, meses, periodo }) => {
                  const importado = !!periodo;

                  return (
                    <TableRow
                      key={nr}
                      className={cn(
                        "transition-colors",
                        !importado && "opacity-60",
                        importado && "bg-green-50/40 dark:bg-green-950/10",
                      )}
                    >
                      <TableCell className="pl-5 font-medium">{label}</TableCell>

                      <TableCell className="text-muted-foreground text-sm">{meses}</TableCell>

                      <TableCell>
                        <div className="flex justify-center">
                          {importado ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Importado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3.5 h-3.5" /> Sem dados no SICONFI
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right text-sm">
                        {importado ? (
                          <span className="font-medium tabular-nums">
                            {periodo!.total_linhas.toLocaleString("pt-BR")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right pr-5 text-sm text-muted-foreground">
                        {fmtDateTime(periodo?.importado_em)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Legenda */}
            <div className="flex flex-wrap items-center gap-5 px-5 py-3 border-t bg-muted/10 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                Dados importados do SICONFI
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Período sem dados disponíveis na API SICONFI
              </span>
              {periodos.length === 0 && (
                <span className="italic">
                  Nenhum dado importado — clique em "Importar {anoSelecionado}" para buscar via API.
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Dados via API pública SICONFI — STN. Rate limit: 1 req/1,5 s com retry automático.
      </p>
    </div>
  );
}

// ── Badge de status do job ────────────────────────────────────────────────────

function JobStatusBadge({ status }: { status: ImportJob["status"] }) {
  if (status === "em_andamento")
    return (
      <Badge variant="secondary" className="gap-1 shrink-0">
        <Loader2 className="w-3 h-3 animate-spin" /> Em andamento
      </Badge>
    );
  if (status === "concluido")
    return (
      <Badge className="gap-1 shrink-0 bg-green-600 hover:bg-green-700 text-white">
        <CheckCircle2 className="w-3 h-3" /> Concluído
      </Badge>
    );
  return (
    <Badge variant="destructive" className="gap-1 shrink-0">
      <XCircle className="w-3 h-3" /> Erro
    </Badge>
  );
}
