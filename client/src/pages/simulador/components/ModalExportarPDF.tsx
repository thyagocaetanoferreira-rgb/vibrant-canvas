import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { FileDown, Loader2, MapPin, CalendarDays, ClipboardCheck, AlertTriangle, Copy } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import RelatorioPDF, { ResultadoPDF, KpisPDF } from "../pdf/RelatorioPDF";
import { STATUS_META, StatusVerificacao } from "../constants";
import { log } from "@/lib/verusLog";

interface Props {
  aberto: boolean;
  onFechar: () => void;
  resultados: ResultadoPDF[];
  municipioNome: string;
  anoExercicio: string;
  tipoAnalise: string;
  executadoEm: string;
  kpis: KpisPDF;
}

const STATUS_OPCOES: { value: StatusVerificacao; label: string; descricao: string }[] = [
  { value: "inconsistente", label: "Inconsistentes", descricao: "Detalhamento completo com tabela de dados" },
  { value: "aviso",         label: "Avisos",         descricao: "Detalhamento completo com tabela de dados" },
  { value: "consistente",   label: "Consistentes",   descricao: "Apenas resumo (formato compacto)" },
  { value: "nao_aplicavel", label: "Não Aplicáveis", descricao: "Listagem compacta sem detalhamento" },
];

export default function ModalExportarPDF({
  aberto, onFechar, resultados, municipioNome, anoExercicio,
  tipoAnalise, executadoEm, kpis,
}: Props) {
  const [selecionados, setSelecionados] = useState<Set<StatusVerificacao>>(
    new Set(["inconsistente", "aviso", "consistente", "nao_aplicavel"])
  );
  const [gerando, setGerando] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);

  const toggle = (s: StatusVerificacao) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const contagem = (s: StatusVerificacao) => resultados.filter((r) => r.status === s).length;
  const totalSelecionado = resultados.filter((r) => selecionados.has(r.status)).length;

  const handleGerar = async () => {
    if (!selecionados.size || !totalSelecionado) {
      toast.warning("Selecione pelo menos um status para incluir no relatório.");
      return;
    }

    setGerando(true);
    setErroDetalhe(null);

    const ctx = { municipioNome, anoExercicio, tipoAnalise, total: totalSelecionado };
    log.info("pdf", "Iniciando geração", ctx);

    try {
      const filtrados = resultados.filter((r) => selecionados.has(r.status));
      const logoUrl = `${window.location.origin}/verus-logotipo.png`;

      log.info("pdf", "Renderizando documento", { logoUrl, verificacoes: filtrados.length });

      const blob = await pdf(
        <RelatorioPDF
          resultados={filtrados}
          municipioNome={municipioNome}
          anoExercicio={anoExercicio}
          tipoAnalise={tipoAnalise}
          executadoEm={executadoEm}
          kpis={kpis}
          logoUrl={logoUrl}
        />
      ).toBlob();

      log.info("pdf", "Blob gerado com sucesso", { sizeKB: Math.round(blob.size / 1024) });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = `${tipoAnalise}-${municipioNome}-${anoExercicio}`
        .replace(/[^a-zA-Z0-9\-]/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase();
      a.href = url;
      a.download = `verus-siconfi-${slug}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      log.info("pdf", "Download iniciado", { arquivo: a.download });
      toast.success("PDF gerado com sucesso!");
      onFechar();
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      log.error("pdf", "Falha ao gerar PDF", err);
      setErroDetalhe(msg);
      toast.error("Erro ao gerar o PDF — veja detalhes abaixo.");
    } finally {
      setGerando(false);
    }
  };

  const copiarLog = () => {
    const texto = log.exportarTexto();
    navigator.clipboard.writeText(texto).then(() => toast.success("Log copiado!"));
  };

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#033e66] flex items-center gap-2">
            <FileDown className="w-4 h-4 text-[#008ded]" />
            Exportar Relatório SICONFI
          </DialogTitle>
        </DialogHeader>

        {/* Contexto — somente leitura */}
        <div className="rounded-lg bg-[#e3eef6]/60 px-4 py-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-[#045ba3]">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="font-semibold">{municipioNome}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#045ba3]">
            <CalendarDays className="w-3 h-3 flex-shrink-0" />
            <span>Exercício <strong>{anoExercicio}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#045ba3]">
            <ClipboardCheck className="w-3 h-3 flex-shrink-0" />
            <span>{tipoAnalise}</span>
          </div>
        </div>

        <Separator />

        {/* Seleção de status */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#033e66] mb-3">Incluir no relatório:</p>
          {STATUS_OPCOES.map(({ value, label, descricao }) => {
            const meta = STATUS_META[value];
            const qtd  = contagem(value);
            return (
              <label
                key={value}
                className="flex items-start gap-3 p-3 rounded-lg border border-transparent hover:border-[#e3eef6] hover:bg-[#f7fbfe] cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selecionados.has(value)}
                  onCheckedChange={() => toggle(value)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: meta.bgColor, color: meta.textColor }}
                    >
                      {label}
                    </span>
                    <span className="text-xs text-[#6b7280]">{qtd} verificaç{qtd !== 1 ? "ões" : "ão"}</span>
                  </div>
                  <p className="text-[11px] text-[#6b7280] mt-0.5 leading-relaxed">{descricao}</p>
                </div>
              </label>
            );
          })}
        </div>

        <Separator />

        <p className="text-[11px] text-[#6b7280] leading-relaxed">
          O PDF incluirá <strong className="text-[#033e66]">{totalSelecionado}</strong> verificaç{totalSelecionado !== 1 ? "ões" : "ão"} com base nos filtros acima.
        </p>

        {/* Painel de erro detalhado */}
        {erroDetalhe && (
          <div className="rounded-lg bg-[#fee2e2] border border-[#ef444430] p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#ef4444]">
              <AlertTriangle className="w-3.5 h-3.5" />
              Erro ao gerar o PDF
            </div>
            <p className="text-[11px] text-[#b91c1c] font-mono break-all leading-relaxed">
              {erroDetalhe}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1.5 border-[#ef444440] text-[#b91c1c] hover:bg-[#fee2e2]"
              onClick={copiarLog}
            >
              <Copy className="w-3 h-3" />
              Copiar log completo
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onFechar}
            disabled={gerando}
            className="border-[#e3eef6] text-[#045ba3]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGerar}
            disabled={gerando || !selecionados.size || !totalSelecionado}
            className="gap-2 bg-[#033e66] hover:bg-[#045ba3] text-white border-0"
          >
            {gerando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando PDF…</>
              : <><FileDown className="w-4 h-4" /> Gerar e Baixar PDF</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
