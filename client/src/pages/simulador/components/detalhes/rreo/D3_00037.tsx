import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DetalhesD3_00037({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length) return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;
  const fmt = (v: number | null) =>
    v === null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
          <TableHead className="text-xs font-semibold text-[#033e66]">Comparação</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Anexo 01 — contas somadas</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Total An01</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">An09</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Diferença</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detalhes.map((d: any, i: number) => (
          <TableRow key={i} className={!d.consistente ? "bg-[#ef444408] hover:bg-[#ef444412]" : "hover:bg-[#e3eef6]/30"}>
            <TableCell className="text-sm text-[#045ba3] font-medium whitespace-nowrap align-top">
              {d.comparacao}
            </TableCell>
            <TableCell className="text-xs text-[#6b7280] align-top">
              {(d.an01_componentes as any[]).map((c: any) => (
                <div key={c.cod_conta} className="leading-5">
                  <span className="font-mono text-[#045ba3]/80">{c.cod_conta}</span>
                  <span className="text-[#6b7280]"> | {d.col_an01}</span>
                  <span className="float-right font-mono text-[#045ba3] ml-4">{fmt(c.valor)}</span>
                </div>
              ))}
              <div className="mt-1 pt-1 border-t border-[#c7dff0] text-[10px] text-[#6b7280] leading-4">
                <span className="font-mono text-[#033e66]">{d.an09_cod_conta}</span>
                <span className="text-[#6b7280]"> | {d.col_an09}</span>
                <span className="ml-1 text-[#6b7280]">(An09)</span>
              </div>
            </TableCell>
            <TableCell className="text-sm text-right font-mono font-semibold text-[#045ba3] align-top">{fmt(d.an01_valor)}</TableCell>
            <TableCell className="text-sm text-right font-mono text-[#045ba3] align-top">{fmt(d.an09_valor)}</TableCell>
            <TableCell className={`text-sm text-right font-mono font-semibold align-top ${
              Math.abs(d.diferenca) <= 0.01 ? "text-[#059669]" : "text-[#ef4444]"
            }`}>
              {fmt(d.diferenca)}
            </TableCell>
            <TableCell className="text-center align-top">
              {d.consistente
                ? <span className="text-[#059669] font-bold text-xs">✓ Igual</span>
                : <span className="text-[#ef4444] font-bold text-xs">✗ Diverge</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
