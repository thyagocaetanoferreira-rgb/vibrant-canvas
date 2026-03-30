import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DetalhesD3_00030({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length) return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;
  const fmt = (v: number | null) =>
    v === null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const LABELS: Record<string, string> = {
    ReceitasPrimariasCorrentesComFontesRPPS:       "Rec. Primárias Correntes RPPS",
    ReceitasNaoPrimariasCorrentesComFontesRPPS:    "Rec. Não-Primárias Correntes RPPS",
    ReceitasPrimariasDeCapitalComFontesRPPS:       "Rec. Primárias de Capital RPPS",
    ReceitasNaoPrimariasDeCapitalComFontesRPPS:    "Rec. Não-Primárias de Capital RPPS",
  };
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
          <TableHead className="text-xs font-semibold text-[#033e66]">Período</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Anexo 04 (total)</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Soma Anexo 06</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Componentes An06</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Diferença</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detalhes.map((d: any, i: number) => (
          <TableRow key={i} className={!d.ok ? "bg-[#ef444408] hover:bg-[#ef444412]" : "hover:bg-[#e3eef6]/30"}>
            <TableCell className="text-sm text-[#045ba3] font-medium whitespace-nowrap">{d.label}</TableCell>
            <TableCell className="text-sm text-right font-mono font-semibold text-[#045ba3]">{fmt(d.valor_an04)}</TableCell>
            <TableCell className="text-sm text-right font-mono font-semibold text-[#045ba3]">{fmt(d.soma_an06)}</TableCell>
            <TableCell className="text-xs text-[#6b7280]">
              {(d.componentes as any[]).map((c: any) => (
                <div key={c.cod_conta}>{LABELS[c.cod_conta] ?? c.cod_conta}: {fmt(c.valor)}</div>
              ))}
            </TableCell>
            <TableCell className={`text-sm text-right font-mono font-semibold ${
              Math.abs(d.diferenca) <= 1.00 ? "text-[#059669]" : "text-[#ef4444]"
            }`}>
              {fmt(d.diferenca)}
            </TableCell>
            <TableCell className="text-center">
              {d.ok
                ? <span className="text-[#059669] font-bold text-xs">✓ Igual</span>
                : <span className="text-[#ef4444] font-bold text-xs">✗ Diverge</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
