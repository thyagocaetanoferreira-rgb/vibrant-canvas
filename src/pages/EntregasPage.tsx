import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

const orgaos = ["Prefeitura", "Câmara", "Fundo Saúde", "Fundo Educação", "Prev. Social", "Fundo Assistência"];
const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const generateStatus = () => {
  const statuses: Record<string, Record<string, "enviado" | "pendente" | "atrasado" | "futuro">> = {};
  orgaos.forEach((o) => {
    statuses[o] = {};
    meses.forEach((m, i) => {
      if (i < 4) statuses[o][m] = Math.random() > 0.15 ? "enviado" : "atrasado";
      else if (i === 4) statuses[o][m] = Math.random() > 0.5 ? "enviado" : "pendente";
      else statuses[o][m] = "futuro";
    });
  });
  return statuses;
};

const statusData = generateStatus();

const statusConfig = {
  enviado: { bg: "bg-success/15", text: "text-success", icon: CheckCircle2, label: "Enviado" },
  pendente: { bg: "bg-warning/15", text: "text-warning", icon: Clock, label: "Pendente" },
  atrasado: { bg: "bg-destructive/15", text: "text-destructive", icon: AlertTriangle, label: "Atrasado" },
  futuro: { bg: "bg-muted/50", text: "text-muted-foreground", icon: Clock, label: "—" },
};

const EntregasPage = () => {
  const { municipio, anoExercicio } = useAppContext();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Controle de Envios</h1>
        <p className="text-sm text-muted-foreground mt-1">TCM-GO · {municipio} · {anoExercicio}</p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {(["enviado", "pendente", "atrasado"] as const).map((s) => {
          const cfg = statusConfig[s];
          return (
            <div key={s} className="flex items-center gap-1.5 text-xs">
              <span className={cn("w-3 h-3 rounded-full", cfg.bg)} />
              <span className="text-muted-foreground">{cfg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Matrix */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto animate-fade-in">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-heading font-semibold text-card-foreground sticky left-0 bg-card z-10 min-w-[160px]">Órgão / Fundo</th>
              {meses.map((m) => (
                <th key={m} className="py-3 px-3 font-heading font-medium text-muted-foreground text-center min-w-[70px]">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orgaos.map((orgao) => (
              <tr key={orgao} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 font-medium text-card-foreground sticky left-0 bg-card">{orgao}</td>
                {meses.map((mes) => {
                  const status = statusData[orgao][mes];
                  const cfg = statusConfig[status];
                  const Icon = cfg.icon;
                  return (
                    <td key={mes} className="py-3 px-3 text-center">
                      <div className={cn("w-8 h-8 mx-auto rounded-lg flex items-center justify-center", cfg.bg)}>
                        {status !== "futuro" && <Icon className={cn("w-3.5 h-3.5", cfg.text)} />}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EntregasPage;
