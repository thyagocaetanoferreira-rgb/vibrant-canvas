import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DetalhesD1_00006({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length) return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
          <TableHead className="text-xs font-semibold text-[#033e66]">Período</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Prazo</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Enviado em</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Tempestividade</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Instituição</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detalhes.map((d: any) => (
          <TableRow key={d.periodo} className="hover:bg-[#e3eef6]/30">
            <TableCell className="text-sm text-[#045ba3] font-medium">{d.label}</TableCell>
            <TableCell className="text-sm text-[#045ba3]">{d.prazo ?? "—"}</TableCell>
            <TableCell className="text-sm text-[#045ba3]">
              {d.data_status ? new Date(d.data_status).toLocaleDateString("pt-BR") : "—"}
            </TableCell>
            <TableCell className="text-sm">
              {!d.entregue
                ? <span className="text-[#6b7280]">Não entregue</span>
                : d.intempestiva
                  ? <span className="text-[#ef4444] font-semibold">✗ Intempestivo</span>
                  : <span className="text-[#059669] font-semibold">✓ No prazo</span>}
            </TableCell>
            <TableCell className="text-sm text-[#045ba3]">{d.instituicao ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
