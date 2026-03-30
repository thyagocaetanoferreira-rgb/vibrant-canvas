import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DetalhesD3_00001({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length) return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;
  const fmt = (v: number) =>
    Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const calculado = detalhes.find((d: any) => d.item === "Resultado Calculado (Rec − Desp)");
  const superavit = detalhes.find((d: any) => d.item === "Superávit Informado no Demonstrativo");
  const diverge = calculado && superavit && Math.abs(calculado.valor - superavit.valor) > 0.01;
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
          <TableHead className="text-xs font-semibold text-[#033e66]">Item</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Coluna</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Valor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detalhes.map((d: any, i: number) => {
          const isCalculado = d.item === "Resultado Calculado (Rec − Desp)";
          const isSuperavit = d.item === "Superávit Informado no Demonstrativo";
          const highlight = (isCalculado || isSuperavit) && diverge;
          return (
            <TableRow key={i} className={highlight ? "bg-[#ef444408] hover:bg-[#ef444412]" : "hover:bg-[#e3eef6]/30"}>
              <TableCell className={`text-sm font-medium ${isCalculado || isSuperavit ? "text-[#033e66]" : "text-[#045ba3]"}`}>
                {d.item}
              </TableCell>
              <TableCell className="text-sm text-[#045ba3]/70">{d.coluna}</TableCell>
              <TableCell className={`text-sm text-right font-mono ${
                isCalculado ? (d.valor >= 0 ? "text-[#059669] font-bold" : "text-[#ef4444] font-bold")
                : isSuperavit && highlight ? "text-[#ef4444] font-bold"
                : "text-[#045ba3]"
              }`}>
                {fmt(d.valor ?? 0)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
