import jsPDF from "jspdf";
import type { ValidationReport } from "./types";

const STATUS_LABEL: Record<string, string> = {
  pass: "OK",
  warning: "AVISO",
  fail: "ERRO",
};

const MSC_TYPE_LABEL: Record<string, string> = {
  agregada: "Agregada (Mensal)",
  encerramento: "Encerramento (Dezembro)",
};

const OVERALL_LABEL: Record<string, string> = {
  regular: "REGULAR",
  warning: "COM AVISOS",
  irregular: "IRREGULAR",
};

export const gerarRelatorioPDF = (
  report: ValidationReport,
  municipioNome: string,
  arquivoNome: string
): void => {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxW = W - 2 * margin;
  let y = 20;

  const checkBreak = (needed: number) => {
    if (y + needed > H - 20) { doc.addPage(); y = 20; }
  };

  // ── Cabeçalho ──────────────────────────────────────────────
  try {
    doc.addImage("/favicon.png", "PNG", W - margin - 18, y - 5, 18, 18);
  } catch (_) { /* logo opcional */ }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Validação SICONFI", W / 2, y, { align: "center" });

  y += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Município: ${municipioNome}`, W / 2, y, { align: "center" });

  y += 8;
  doc.setFontSize(9);
  doc.text(`Tipo: MSC ${MSC_TYPE_LABEL[report.mscType]}`, margin, y);
  y += 5;
  doc.text(`Arquivo: ${arquivoNome}`, margin, y);
  y += 5;
  doc.text(`Data: ${new Date().toLocaleString("pt-BR")}`, margin, y);

  y += 6;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, W - margin, y);

  // ── Resumo ──────────────────────────────────────────────────
  y += 8;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo", margin, y);

  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const { summary, overallStatus } = report;
  [
    `Total de validações: ${summary.total}`,
    `OK: ${summary.passed}`,
    `Avisos: ${summary.warnings}`,
    `Erros: ${summary.failed}`,
    `Status geral: ${OVERALL_LABEL[overallStatus]}`,
  ].forEach((line) => {
    doc.text(line, margin, y);
    y += 5;
  });

  y += 4;
  doc.line(margin, y, W - margin, y);

  // ── Detalhes ────────────────────────────────────────────────
  y += 8;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Detalhes das Validações", margin, y);
  y += 6;

  report.validations.forEach((v, idx) => {
    checkBreak(20);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(
      `${idx + 1}. [${v.id}] ${STATUS_LABEL[v.status] ?? v.status}`,
      margin,
      y
    );
    y += 5;

    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(`Descrição: ${v.description}`, maxW - 4);
    descLines.forEach((l: string) => { checkBreak(5); doc.text(l, margin + 2, y); y += 4; });

    if (v.message) {
      const msgLines = doc.splitTextToSize(`Resultado: ${v.message}`, maxW - 4);
      msgLines.forEach((l: string) => { checkBreak(5); doc.text(l, margin + 2, y); y += 4; });
    }

    y += 3;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, W - margin, y);
    y += 4;
  });

  // ── Rodapé ──────────────────────────────────────────────────
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${p} de ${totalPages}`, W / 2, H - 8, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
  doc.save(`validacao-siconfi-${report.mscType}-${ts}.pdf`);
};
