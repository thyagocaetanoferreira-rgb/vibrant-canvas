import { ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ItemVerificacao from "./ItemVerificacao";
import { TIPOS_ANALISE } from "../constants";

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
}

export default function ListaVerificacoes({ resultados, total, executado_em, tipo }: {
  resultados: ResultadoVerificacao[];
  total?: number;
  executado_em: string;
  tipo: string;
}) {
  const tipoInfo = TIPOS_ANALISE.find(t => t.value === tipo);
  const filtrado = total !== undefined && total !== resultados.length;
  return (
    <Card className="bg-white shadow-sm rounded-xl border-0">
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="text-base font-bold text-[#033e66] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-[#008ded]" />
            {tipoInfo?.label ?? tipo}
            {" — "}
            {filtrado
              ? <>{resultados.length} <span className="font-normal text-[#045ba3]/60">de {total}</span></>
              : <>{resultados.length}</>
            }
            {" "}verificações
          </div>
          <span className="text-xs font-normal text-[#045ba3]/70">
            {new Date(executado_em).toLocaleString("pt-BR")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="rounded-xl border border-[#e3eef6] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
                <TableHead className="text-xs font-semibold text-[#033e66] w-28">Código</TableHead>
                <TableHead className="text-xs font-semibold text-[#033e66]">Verificação</TableHead>
                <TableHead className="text-xs font-semibold text-[#033e66] w-28 text-center">Dimensão</TableHead>
                <TableHead className="text-xs font-semibold text-[#033e66] w-36">Status</TableHead>
                <TableHead className="text-xs font-semibold text-[#033e66] w-24 text-center">Nota</TableHead>
                <TableHead className="text-xs font-semibold text-[#033e66]">Resumo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultados.map(r => <ItemVerificacao key={r.no_verificacao} r={r} />)}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
