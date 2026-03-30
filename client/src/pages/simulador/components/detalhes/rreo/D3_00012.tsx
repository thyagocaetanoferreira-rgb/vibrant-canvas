import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DetalhesD3_00012({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length) return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;
  const fmt = (v: number | null) =>
    v === null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
          <TableHead className="text-xs font-semibold text-[#033e66]">Período</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Anexo</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Conta</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Coluna</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Valor</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detalhes.map((d: any, i: number) => (
          <TableRow key={i} className={!d.ok ? "bg-[#ef444408] hover:bg-[#ef444412]" : "hover:bg-[#e3eef6]/30"}>
            <TableCell className="text-sm text-[#045ba3] font-medium whitespace-nowrap">{d.label}</TableCell>
            <TableCell className="text-sm text-[#045ba3] whitespace-nowrap">{d.anexo}</TableCell>
            <TableCell className="text-xs text-[#045ba3] max-w-[200px] truncate" title={d.conta || d.cod_conta}>
              {d.conta || d.cod_conta}
            </TableCell>
            <TableCell className="text-xs text-[#045ba3] max-w-[180px] truncate" title={d.coluna}>
              {d.coluna}
            </TableCell>
            <TableCell className="text-sm text-right font-mono font-semibold text-[#ef4444]">
              {fmt(d.valor)}
            </TableCell>
            <TableCell className="text-center whitespace-nowrap">
              {d.ok
                ? <span className="text-[#b45309] font-bold text-xs">⚠ Exceção</span>
                : <span className="text-[#ef4444] font-bold text-xs">✗ Inválido</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
