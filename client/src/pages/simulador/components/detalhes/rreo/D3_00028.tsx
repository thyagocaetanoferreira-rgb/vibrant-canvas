import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DetalhesD3_00028({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length) return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;
  const fmt = (v: number | null) =>
    v === null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
          <TableHead className="text-xs font-semibold text-[#033e66]">Período</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Grupo</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Anexo 06</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Anexo 01</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Diferença</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detalhes.map((d: any, i: number) => (
          <TableRow key={i} className={!d.ok ? "bg-[#ef444408] hover:bg-[#ef444412]" : "hover:bg-[#e3eef6]/30"}>
            <TableCell className="text-sm text-[#045ba3] font-medium whitespace-nowrap">{d.label}</TableCell>
            <TableCell className="text-xs text-[#045ba3]">
              <span className="font-semibold">{d.nome}</span>
              <br />
              <span className="text-[#6b7280]">{d.descricao_an06}</span>
              <br />
              <span className="text-[#6b7280]">{d.descricao_an01}</span>
            </TableCell>
            <TableCell className="text-sm text-right font-mono text-[#045ba3]">{fmt(d.valor_an06)}</TableCell>
            <TableCell className="text-sm text-right font-mono text-[#045ba3]">{fmt(d.valor_an01)}</TableCell>
            <TableCell className={`text-sm text-right font-mono font-semibold ${
              d.diferenca === null ? "text-[#6b7280]"
              : Math.abs(d.diferenca) <= 1.00 ? "text-[#059669]"
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
