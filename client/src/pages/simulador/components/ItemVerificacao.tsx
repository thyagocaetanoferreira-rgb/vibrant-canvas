import { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import StatusBadge from "./StatusBadge";
import { DETALHE_COMPONENTE } from "./detalhes";
import { DetalhesGenericos } from "./detalhes/shared";

interface ResultadoVerificacao {
  no_verificacao: string;
  no_desc: string;
  no_finalidade: string;
  co_dimensao: string;
  capag: boolean;
  status: "consistente" | "inconsistente" | "aviso" | "nao_aplicavel";
  resumo: string;
  detalhes: any[];
  nota: number;
  nota_max: number;
  temRetificacao?: boolean;
  observacoes_rodape?: string;
}

export default function ItemVerificacao({ r }: { r: ResultadoVerificacao }) {
  const [open, setOpen] = useState(false);
  const DetalheComp = DETALHE_COMPONENTE[r.no_verificacao] ?? DetalhesGenericos;

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-[#e3eef6]/30 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <TableCell className="w-28">
          <div className="flex items-center gap-1.5 font-mono text-xs text-[#045ba3]">
            {open
              ? <ChevronDown  className="w-3.5 h-3.5 text-[#008ded]" />
              : <ChevronRight className="w-3.5 h-3.5 text-[#008ded]" />}
            {r.no_verificacao}
          </div>
        </TableCell>
        <TableCell className="text-sm font-medium text-[#033e66]">{r.no_desc}</TableCell>
        <TableCell className="w-28 text-center">
          <Badge style={{ backgroundColor: "#008ded15", color: "#045ba3", border: "none", fontSize: 11, fontFamily: "monospace" }}>
            {r.co_dimensao}
          </Badge>
          {r.capag && (
            <Badge className="ml-1" style={{ backgroundColor: "#033e6615", color: "#033e66", border: "none", fontSize: 10 }}>
              CAPAG
            </Badge>
          )}
        </TableCell>
        <TableCell className="w-36">
          <StatusBadge status={r.status} />
        </TableCell>
        <TableCell className="w-24 text-center">
          {r.status === "nao_aplicavel" ? (
            <span className="text-xs text-[#6b7280]">—</span>
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              <span
                className="text-sm font-bold"
                style={{ color: r.nota >= 0.8 ? "#059669" : r.nota >= 0.5 ? "#b45309" : "#ef4444" }}
              >
                {r.nota.toFixed(2)}
              </span>
              <div className="w-12 h-1.5 rounded-full bg-[#e3eef6] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${r.nota * 100}%`,
                    backgroundColor: r.nota >= 0.8 ? "#00e1a4" : r.nota >= 0.5 ? "#ffb85a" : "#ef4444",
                  }}
                />
              </div>
            </div>
          )}
        </TableCell>
        <TableCell className="text-xs text-[#045ba3] max-w-xs">
          {r.resumo}
          {r.no_verificacao === "D1_00006" && r.temRetificacao && (
            <div className="flex items-start gap-1 mt-1 text-[10px] text-[#b45309] leading-tight">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-px" />
              <span>Há períodos com retificação (RE). A API SICONFI não fornece a data da homologação original nesses casos — a nota pode estar subestimada.</span>
            </div>
          )}
        </TableCell>
      </TableRow>

      {open && (
        <TableRow>
          <TableCell colSpan={6} className="p-0 bg-[#f7fbfe]">
            <div className="px-8 py-4 space-y-3 border-l-4 border-[#008ded]/30">
              <p className="text-xs text-[#045ba3] italic leading-relaxed">{r.no_finalidade}</p>
              <div className="rounded-xl border border-[#e3eef6] overflow-hidden bg-white">
                <DetalheComp detalhes={r.detalhes} />
                {r.observacoes_rodape && (
                  <p className="text-xs text-[#6b7280] px-3 pt-2 pb-1 italic border-t border-[#c7dff0] mt-1">
                    {r.observacoes_rodape}
                  </p>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
