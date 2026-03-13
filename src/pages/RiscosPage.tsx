import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";

const municipiosDemo = [
  "Ipameri", "Catalão", "Goiandira", "Ouvidor", "Corumbaíba",
  "Urutaí", "Pires do Rio", "Silvânia", "Vianópolis", "Caldas Novas",
];
import { CheckCircle2, XCircle } from "lucide-react";

const caucItems = [
  "FGTS", "INSS", "Dívida Ativa da União", "CADIN", "CAUC/STN", "Adimplência SIAFI",
  "Limites Constitucionais Saúde", "Limites Constitucionais Educação", "Publicação RREO",
  "Publicação RGF", "Envio SICONFI", "Envio MSC", "Regularidade Previdenciária",
  "Operações de Crédito",
];

const generateCaucData = () => {
  const data: Record<string, Record<string, boolean>> = {};
  municipiosDemo.forEach((m) => {
    data[m] = {};
    caucItems.forEach((item) => {
      data[m][item] = Math.random() > 0.12;
    });
  });
  return data;
};

const caucData = generateCaucData();

const RiscosPage = () => {
  const { anoExercicio } = useAppContext();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Gestão de Riscos</h1>
        <p className="text-sm text-muted-foreground mt-1">Matriz CAUC — Visão Consolidada · {anoExercicio}</p>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span className="text-muted-foreground">Regular</span>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle className="w-4 h-4 text-destructive" />
          <span className="text-muted-foreground">Irregular</span>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto animate-fade-in">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-heading font-semibold text-card-foreground sticky left-0 bg-card z-10 min-w-[140px]">Município</th>
              {caucItems.map((item) => (
                <th key={item} className="py-3 px-2 font-heading font-medium text-muted-foreground text-center min-w-[48px]">
                  <span className="text-[10px] leading-tight block" title={item}>{item.slice(0, 8)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(caucData).map(([mun, items]) => (
              <tr key={mun} className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors">
                <td className="py-2.5 px-4 font-medium text-card-foreground sticky left-0 bg-card text-xs">{mun}</td>
                {caucItems.map((item) => (
                  <td key={item} className="py-2.5 px-2 text-center">
                    {items[item] ? (
                      <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive mx-auto" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RiscosPage;
