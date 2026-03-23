import { useState, useRef } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import { parseMSCData, validateMSC, compararInterMeses } from "@/lib/siconfi/mscValidation";
import { gerarRelatorioPDF } from "@/lib/siconfi/pdfGenerator";
import type {
  MscType,
  ValidationReport,
  ValidationResult,
  ValidacaoHistorico,
} from "@/lib/siconfi/types";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileUp, CheckCircle2, AlertTriangle, XCircle, Download,
  Save, ChevronDown, ChevronRight, History, ClipboardCheck,
  X, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ── Helpers visuais ────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  pass: "text-green-600 dark:text-green-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  fail: "text-red-600 dark:text-red-400",
};
const STATUS_BG: Record<string, string> = {
  pass: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
  warning: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800",
  fail: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
};
const STATUS_LABEL: Record<string, string> = { pass: "OK", warning: "Aviso", fail: "Erro" };
const OVERALL_BADGE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  regular: { variant: "default", label: "Regular" },
  warning: { variant: "secondary", label: "Com Avisos" },
  irregular: { variant: "destructive", label: "Irregular" },
};
const OVERALL_COLOR: Record<string, string> = {
  regular: "text-green-600 dark:text-green-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  irregular: "text-red-600 dark:text-red-400",
};

// ── Card de resultado individual ───────────────────────────────────────────────

function ValidationCard({ v }: { v: ValidationResult }) {
  const [open, setOpen] = useState(false);
  const Icon = v.status === "pass" ? CheckCircle2 : v.status === "warning" ? AlertTriangle : XCircle;
  const hasDetails = v.details && (Array.isArray(v.details) ? v.details.length > 0 : true);

  return (
    <div className={cn("rounded-lg border p-3 transition-all", STATUS_BG[v.status])}>
      <button
        className="w-full flex items-start gap-3 text-left"
        onClick={() => hasDetails && setOpen((o) => !o)}
      >
        <Icon className={cn("mt-0.5 shrink-0 w-4 h-4", STATUS_COLOR[v.status])} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold text-muted-foreground">{v.id}</span>
            <Badge
              variant="outline"
              className={cn("text-xs h-4 px-1", STATUS_COLOR[v.status])}
            >
              {STATUS_LABEL[v.status]}
            </Badge>
          </div>
          <p className="text-sm font-medium mt-0.5 leading-snug">{v.description}</p>
          {v.message && (
            <p className="text-xs text-muted-foreground mt-1">{v.message}</p>
          )}
        </div>
        {hasDetails && (
          open
            ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
            : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
        )}
      </button>

      {open && hasDetails && (
        <div className="mt-3 ml-7 bg-background/70 rounded border p-2 max-h-48 overflow-auto">
          <pre className="text-xs whitespace-pre-wrap break-all">
            {JSON.stringify(v.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Área de upload de arquivo ──────────────────────────────────────────────────

function FileDropZone({
  label,
  file,
  onFile,
  onClear,
}: {
  label: string;
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-dashed p-4 text-center transition-colors cursor-pointer",
        dragging
          ? "border-primary bg-primary/5"
          : file
          ? "border-green-400 bg-green-50 dark:bg-green-950/20"
          : "border-muted-foreground/30 hover:border-primary/50"
      )}
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
    >
      <input
        ref={ref}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      {file ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-green-600 shrink-0" />
            <span className="text-sm text-green-700 dark:text-green-400 truncate font-medium">
              {file.name}
            </span>
          </div>
          <button
            className="text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 py-2">
          <FileUp className="w-6 h-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xs text-muted-foreground/60">CSV · arraste ou clique</p>
        </div>
      )}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function ValidadorSiconfiPage() {
  const { municipio, anoExercicio } = useAppContext();
  const qc = useQueryClient();

  const [mscType, setMscType] = useState<MscType>("agregada");
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pass" | "warning" | "fail">("all");

  const municipioId = municipio?.municipioId;

  // Histórico de validações
  const { data: historico = [] } = useQuery<ValidacaoHistorico[]>({
    queryKey: ["siconfi-validacoes", municipioId, anoExercicio],
    queryFn: () =>
      api.get(`/siconfi/validacoes?municipio_id=${municipioId}&ano=${anoExercicio}`),
    enabled: !!municipioId,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => api.post("/siconfi/validacoes", payload),
    onSuccess: () => {
      toast.success("Validação salva no histórico");
      qc.invalidateQueries({ queryKey: ["siconfi-validacoes", municipioId] });
    },
    onError: () => toast.error("Erro ao salvar no histórico"),
  });

  // ── Executar validação ────────────────────────────────────────────────────────

  const handleValidar = async () => {
    if (!file1) { toast.error("Selecione o arquivo CSV da MSC"); return; }
    setLoading(true);
    setReport(null);
    try {
      const text1 = await file1.text();
      const data1 = parseMSCData(text1);
      if (!data1.length) throw new Error("Arquivo CSV vazio ou inválido");

      const baseReport = await validateMSC(data1, mscType);

      let finalReport = baseReport;
      if (file2 && mscType === "agregada") {
        const text2 = await file2.text();
        const data2 = parseMSCData(text2);
        const interResults = compararInterMeses(data1, data2);
        const allValidations = [...baseReport.validations, ...interResults];
        const passed = allValidations.filter((v) => v.status === "pass").length;
        const warnings = allValidations.filter((v) => v.status === "warning").length;
        const failed = allValidations.filter((v) => v.status === "fail").length;
        finalReport = {
          ...baseReport,
          validations: allValidations,
          summary: { total: allValidations.length, passed, warnings, failed },
          overallStatus: failed > 0 ? "irregular" : warnings > 0 ? "warning" : "regular",
        };
      }

      setReport(finalReport);
      setFilter("all");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao processar o arquivo");
    } finally {
      setLoading(false);
    }
  };

  // ── Salvar histórico ──────────────────────────────────────────────────────────

  const handleSalvar = () => {
    if (!report || !municipioId) return;
    saveMutation.mutate({
      municipio_id: municipioId,
      tipo_msc: report.mscType,
      arquivo_nome: file1?.name ?? null,
      ano_exercicio: parseInt(anoExercicio),
      total: report.summary.total,
      ok: report.summary.passed,
      avisos: report.summary.warnings,
      erros: report.summary.failed,
      status_geral: report.overallStatus,
      resultado_json: report.validations,
    });
  };

  // ── Filtro de resultados ──────────────────────────────────────────────────────

  const filtered = report
    ? filter === "all"
      ? report.validations
      : report.validations.filter((v) => v.status === filter)
    : [];

  const overallInfo = report ? OVERALL_BADGE[report.overallStatus] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-primary">Validador SICONFI</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Valide a qualidade das Matrizes de Saldos Contábeis conforme critérios do SICONFI
          {municipio && (
            <span className="font-medium text-foreground"> · {municipio.municipioNome}</span>
          )}
        </p>
      </div>

      <Tabs defaultValue="validador">
        <TabsList>
          <TabsTrigger value="validador" className="gap-1.5">
            <ClipboardCheck className="w-4 h-4" /> Nova Validação
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5">
            <History className="w-4 h-4" /> Histórico
            {historico.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 text-xs px-1">
                {historico.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Aba Validador ───────────────────────────────────────────────── */}
        <TabsContent value="validador" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">

            {/* Painel esquerdo */}
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-4 space-y-4">
                <h2 className="font-semibold text-sm">Configuração</h2>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Tipo de MSC</label>
                  <Select value={mscType} onValueChange={(v) => { setMscType(v as MscType); setReport(null); setFile1(null); setFile2(null); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agregada">MSC Agregada (Mensal)</SelectItem>
                      <SelectItem value="encerramento">MSC Encerramento (Dezembro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">
                    Arquivo MSC {mscType === "agregada" ? "(mês de referência)" : "(encerramento)"}
                  </label>
                  <FileDropZone
                    label="Selecione o arquivo CSV"
                    file={file1}
                    onFile={setFile1}
                    onClear={() => setFile1(null)}
                  />
                </div>

                {mscType === "agregada" && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">
                      Arquivo MSC anterior <span className="text-muted-foreground/60">(opcional — comparação inter-meses)</span>
                    </label>
                    <FileDropZone
                      label="Arquivo do mês anterior (opcional)"
                      file={file2}
                      onFile={setFile2}
                      onClear={() => setFile2(null)}
                    />
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={!file1 || loading}
                  onClick={handleValidar}
                >
                  {loading ? "Validando..." : "Validar"}
                </Button>
              </div>

              {/* Arquivo de exemplo */}
              <p className="text-xs text-muted-foreground text-center">
                <a href="/msc-teste.csv" download className="underline underline-offset-2 hover:text-primary">
                  Baixar arquivo de exemplo
                </a>
              </p>
            </div>

            {/* Painel direito */}
            <div className="space-y-4">
              {!report && !loading && (
                <div className="rounded-xl border bg-muted/20 flex flex-col items-center justify-center py-20 text-center gap-3">
                  <ClipboardCheck className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Selecione o tipo de MSC, carregue o arquivo CSV e clique em <strong>Validar</strong>
                  </p>
                </div>
              )}

              {loading && (
                <div className="rounded-xl border bg-muted/20 flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Processando arquivo e aplicando regras SICONFI…</p>
                </div>
              )}

              {report && (
                <>
                  {/* Resumo */}
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h2 className="font-semibold">Resultado da Validação</h2>
                        <p className="text-xs text-muted-foreground">
                          MSC {report.mscType === "agregada" ? "Agregada" : "Encerramento"} · {file1?.name}
                        </p>
                      </div>
                      {overallInfo && (
                        <Badge variant={overallInfo.variant} className="text-sm px-3 py-1">
                          {overallInfo.label}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "Total", value: report.summary.total, cls: "text-foreground" },
                        { label: "OK", value: report.summary.passed, cls: "text-green-600 dark:text-green-400" },
                        { label: "Avisos", value: report.summary.warnings, cls: "text-yellow-600 dark:text-yellow-400" },
                        { label: "Erros", value: report.summary.failed, cls: "text-red-600 dark:text-red-400" },
                      ].map((s) => (
                        <div key={s.label} className="rounded-lg border bg-muted/30 p-2 text-center">
                          <div className={cn("text-2xl font-bold", s.cls)}>{s.value}</div>
                          <div className="text-xs text-muted-foreground">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() =>
                          gerarRelatorioPDF(report, municipio?.municipioNome ?? "", file1?.name ?? "")
                        }
                      >
                        <Download className="w-4 h-4" /> Exportar PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={handleSalvar}
                        disabled={saveMutation.isPending}
                      >
                        <Save className="w-4 h-4" />
                        {saveMutation.isPending ? "Salvando…" : "Salvar no Histórico"}
                      </Button>
                    </div>
                  </div>

                  {/* Filtros */}
                  <div className="flex gap-1.5 flex-wrap">
                    {(["all", "pass", "warning", "fail"] as const).map((f) => {
                      const counts: Record<string, number> = {
                        all: report.summary.total,
                        pass: report.summary.passed,
                        warning: report.summary.warnings,
                        fail: report.summary.failed,
                      };
                      const labels: Record<string, string> = {
                        all: "Todos",
                        pass: "OK",
                        warning: "Avisos",
                        fail: "Erros",
                      };
                      return (
                        <button
                          key={f}
                          onClick={() => setFilter(f)}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                            filter === f
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/40 text-muted-foreground border-transparent hover:border-border"
                          )}
                        >
                          {labels[f]} ({counts[f]})
                        </button>
                      );
                    })}
                  </div>

                  {/* Lista de validações */}
                  <div className="space-y-2">
                    {filtered.map((v) => (
                      <ValidationCard key={v.id} v={v} />
                    ))}
                    {filtered.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Nenhum resultado para este filtro
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Aba Histórico ───────────────────────────────────────────────── */}
        <TabsContent value="historico" className="mt-4">
          {!municipioId ? (
            <p className="text-muted-foreground text-sm">Selecione um município para ver o histórico.</p>
          ) : historico.length === 0 ? (
            <div className="rounded-xl border bg-muted/20 flex flex-col items-center justify-center py-16 gap-3">
              <History className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhuma validação salva para este município.</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead className="text-center">OK</TableHead>
                    <TableHead className="text-center">Avisos</TableHead>
                    <TableHead className="text-center">Erros</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usuário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map((h) => {
                    const badge = OVERALL_BADGE[h.status_geral];
                    const color = OVERALL_COLOR[h.status_geral];
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(h.criado_em).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-xs">
                          {h.tipo_msc === "agregada" ? "Agregada" : "Encerramento"}
                          {h.ano_exercicio && (
                            <span className="ml-1 text-muted-foreground">({h.ano_exercicio})</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-[160px] truncate text-muted-foreground">
                          {h.arquivo_nome ?? "—"}
                        </TableCell>
                        <TableCell className="text-center text-green-600 dark:text-green-400 font-medium">
                          {h.ok}
                        </TableCell>
                        <TableCell className="text-center text-yellow-600 dark:text-yellow-400 font-medium">
                          {h.avisos}
                        </TableCell>
                        <TableCell className="text-center text-red-600 dark:text-red-400 font-medium">
                          {h.erros}
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.variant} className={cn("text-xs", color)}>
                            {badge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {h.usuario_nome ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
