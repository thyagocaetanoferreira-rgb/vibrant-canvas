import { Star, BarChart3, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import KpiCard from "./KpiCard";

interface KpisType {
  analisadas: number;
  consistentes: number;
  inconsistentes: number;
  avisos: number;
  notaTotal: number;
  notaMaxima: number;
  notaPercent: number;
}

export default function ResumoNotas({ kpis }: { kpis: KpisType }) {
  return (
    <div className="space-y-4">
      {/* Card de nota em destaque */}
      <Card className="bg-white shadow-sm rounded-xl border-0 border-l-4" style={{ borderLeftColor: "#008ded" }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: "#008ded18" }}>
                <Star className="h-6 w-6" style={{ color: "#008ded" }} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#045ba3] uppercase tracking-wide">Nota da Análise</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-extrabold text-[#033e66]">{kpis.notaTotal}</span>
                  <span className="text-sm text-[#045ba3]/70">/ {kpis.notaMaxima} pontos</span>
                  <span
                    className="text-sm font-bold px-2 py-0.5 rounded-full ml-1"
                    style={{
                      color:           kpis.notaPercent >= 80 ? "#059669" : kpis.notaPercent >= 50 ? "#b45309" : "#ef4444",
                      backgroundColor: kpis.notaPercent >= 80 ? "#00e1a420" : kpis.notaPercent >= 50 ? "#ffb85a20" : "#ef444420",
                    }}
                  >
                    {kpis.notaPercent}%
                  </span>
                </div>
                <p className="text-xs text-[#045ba3]/60 mt-0.5">
                  Cada verificação vale 1 pt — pontuação proporcional para itens parciais
                </p>
              </div>
            </div>
            {/* Barra de progresso */}
            <div className="flex-1 min-w-[200px] max-w-xs">
              <div className="flex justify-between text-xs text-[#045ba3]/70 mb-1">
                <span>0</span>
                <span>{kpis.notaMaxima}</span>
              </div>
              <div className="h-3 rounded-full bg-[#e3eef6] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${kpis.notaPercent}%`,
                    background: kpis.notaPercent >= 80
                      ? "linear-gradient(90deg, #00e1a4, #008ded)"
                      : kpis.notaPercent >= 50
                      ? "linear-gradient(90deg, #ffb85a, #f97316)"
                      : "linear-gradient(90deg, #ef4444, #dc2626)",
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de contagem */}
      <div className="flex gap-4 flex-wrap">
        <KpiCard title="Analisadas"     value={kpis.analisadas}     icon={BarChart3}   borderColor="#033e66" subtitle="verificações executadas" />
        <KpiCard title="Consistentes"   value={kpis.consistentes}   icon={ShieldCheck} borderColor="#00e1a4" subtitle="dentro da conformidade" />
        <KpiCard title="Inconsistentes" value={kpis.inconsistentes} icon={ShieldX}     borderColor="#ef4444" subtitle="requerem atenção" />
        <KpiCard title="Avisos"         value={kpis.avisos}         icon={ShieldAlert} borderColor="#ffb85a" subtitle="pontos de atenção" />
      </div>
    </div>
  );
}
