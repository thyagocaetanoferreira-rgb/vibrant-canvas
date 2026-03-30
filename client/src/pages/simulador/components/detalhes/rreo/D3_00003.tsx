import { TabelaD3_00003Base } from "../shared";

export default function DetalhesD3_00003({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length) return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;
  return <TabelaD3_00003Base detalhes={detalhes} />;
}
