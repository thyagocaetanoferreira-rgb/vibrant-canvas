import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DetalhesD3_00032({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length) return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;
  const fmt = (v: number | null) =>
    v === null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function IconPresenca({ existe }: { existe: boolean }) {
    return existe
      ? <span className="text-[#059669] font-bold">✓</span>
      : <span className="text-[#9ca3af]">–</span>;
  }

  function StatusComparacao({ ok }: { ok: boolean | null }) {
    if (ok === null) return <span className="text-[#9ca3af] text-xs">—</span>;
    return ok
      ? <span className="text-[#059669] font-bold text-xs">✓</span>
      : <span className="text-[#ef4444] font-bold text-xs">✗</span>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
          <TableHead className="text-xs font-semibold text-[#033e66]">Período</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-center">Presença<br/>An01/An04/An06</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Coluna An01</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">An01</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">An04</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">An06</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-center">01=04 / 01=06 / 04=06</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detalhes.map((d: any, i: number) => (
          <TableRow key={i} className={!d.consistente ? "bg-[#ef444408] hover:bg-[#ef444412]" : "hover:bg-[#e3eef6]/30"}>
            <TableCell className="text-sm text-[#045ba3] font-medium whitespace-nowrap align-top">{d.label}</TableCell>
            <TableCell className="text-center align-top">
              <div className={`inline-flex gap-1 text-sm ${!d.presenca_ok ? "text-[#ef4444]" : ""}`}>
                <IconPresenca existe={d.an01_existe} />
                <span className="text-[#9ca3af]">/</span>
                <IconPresenca existe={d.an04_existe} />
                <span className="text-[#9ca3af]">/</span>
                <IconPresenca existe={d.an06_existe} />
              </div>
              {!d.presenca_ok && (
                <div className="text-[10px] text-[#ef4444] mt-0.5 whitespace-nowrap">presença parcial</div>
              )}
            </TableCell>
            <TableCell className="text-xs text-[#6b7280] align-top whitespace-nowrap">
              {d.an01_coluna_usada ?? <span className="text-[#9ca3af]">—</span>}
            </TableCell>
            <TableCell className="text-sm text-right font-mono text-[#045ba3] align-top">{fmt(d.an01_valor)}</TableCell>
            <TableCell className="text-sm text-right font-mono text-[#045ba3] align-top">{fmt(d.an04_valor)}</TableCell>
            <TableCell className="text-sm text-right font-mono text-[#045ba3] align-top">{fmt(d.an06_valor)}</TableCell>
            <TableCell className="text-center align-top">
              <div className="flex gap-2 justify-center text-sm">
                <StatusComparacao ok={d.ok_01x04} />
                <span className="text-[#9ca3af]">/</span>
                <StatusComparacao ok={d.ok_01x06} />
                <span className="text-[#9ca3af]">/</span>
                <StatusComparacao ok={d.ok_04x06} />
              </div>
            </TableCell>
            <TableCell className="text-center align-top">
              {d.consistente
                ? <span className="text-[#059669] font-bold text-xs">✓ OK</span>
                : <span className="text-[#ef4444] font-bold text-xs">✗ Diverge</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
