import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function DetalhesGenericos({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length) return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;
  return (
    <pre className="text-xs whitespace-pre-wrap break-all text-[#045ba3]/70 p-3">
      {JSON.stringify(detalhes, null, 2)}
    </pre>
  );
}

export function TabelaD3_00003Base({ detalhes }: { detalhes: any[] }) {
  const fmt = (v: number | null) =>
    v === null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
          <TableHead className="text-xs font-semibold text-[#033e66]">Período</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Categoria</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Tipo</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Anexo 01</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Anexo 06</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Diferença</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detalhes.map((d: any, i: number) => (
          <TableRow key={i} className={!d.ok ? "bg-[#ef444408] hover:bg-[#ef444412]" : "hover:bg-[#e3eef6]/30"}>
            <TableCell className="text-sm text-[#045ba3] font-medium">{d.label}</TableCell>
            <TableCell className="text-sm text-[#045ba3]">{d.categoria}</TableCell>
            <TableCell className="text-sm text-[#045ba3]">{d.tipo}</TableCell>
            <TableCell className="text-sm text-right font-mono text-[#045ba3]">{fmt(d.valor_anexo01)}</TableCell>
            <TableCell className="text-sm text-right font-mono text-[#045ba3]">{fmt(d.valor_anexo06)}</TableCell>
            <TableCell className={`text-sm text-right font-mono font-semibold ${
              d.diferenca === null ? "text-[#6b7280]"
              : Math.abs(d.diferenca) <= 0.02 ? "text-[#059669]"
              : "text-[#ef4444]"
            }`}>
              {d.diferenca === null ? "—" : fmt(d.diferenca)}
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
