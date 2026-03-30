import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DetalhesD1_00011({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length) return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
          <TableHead className="text-xs font-semibold text-[#033e66]">Período</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-center">Status</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Data</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Instituição</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detalhes.map((d: any, i: number) => {
          const isRE = d.status_relatorio?.trim() === "RE";
          return (
            <TableRow key={i} className={isRE ? "bg-[#ef444408] hover:bg-[#ef444412]" : "hover:bg-[#e3eef6]/30"}>
              <TableCell className="text-sm text-[#045ba3] font-medium">{d.label}</TableCell>
              <TableCell className="text-center">
                <span
                  className="inline-block text-xs font-bold px-2 py-0.5 rounded-full"
                  style={isRE
                    ? { color: "#ef4444", backgroundColor: "#ef444420" }
                    : { color: "#059669", backgroundColor: "#00e1a420" }}
                >
                  {d.status_relatorio} {isRE ? "— Retificado" : "— Homologado"}
                </span>
              </TableCell>
              <TableCell className="text-sm text-[#045ba3]">
                {d.data_status ? new Date(d.data_status).toLocaleDateString("pt-BR") : "—"}
              </TableCell>
              <TableCell className="text-sm text-[#045ba3]">{d.instituicao ?? "—"}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
