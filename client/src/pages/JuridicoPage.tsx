import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Scale, FileText, Clock } from "lucide-react";

const diligencias = [
  { processo: "2025-0342", tipo: "Prestação de Contas Anual", municipio: "Ipameri", prazo: "15/04/2025", status: "Em Análise - TCM", responsavel: "Maria Silva" },
  { processo: "2025-0198", tipo: "Diligência de Folha", municipio: "Catalão", prazo: "20/03/2025", status: "Respondida", responsavel: "João Santos" },
  { processo: "2024-1455", tipo: "Julgamento de Contas 2023", municipio: "Ouvidor", prazo: "—", status: "Transitado em Julgado", responsavel: "Ana Costa" },
  { processo: "2025-0501", tipo: "Prestação de Contas Mensal", municipio: "Goiandira", prazo: "30/03/2025", status: "Pendente Resposta", responsavel: "Pedro Lima" },
  { processo: "2025-0089", tipo: "Diligência Licitação", municipio: "Pires do Rio", prazo: "10/04/2025", status: "Em Análise - TCM", responsavel: "Lucas Oliveira" },
];

const statusColor: Record<string, string> = {
  "Em Análise - TCM": "bg-info/10 text-info border-info/20",
  "Respondida": "bg-success/10 text-success border-success/20",
  "Transitado em Julgado": "bg-muted text-muted-foreground border-border",
  "Pendente Resposta": "bg-warning/10 text-warning border-warning/20",
};

const JuridicoPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Jurídico</h1>
        <p className="text-sm text-muted-foreground mt-1">Diligências, julgamentos e processos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Diligências Abertas", value: 7, icon: Scale, color: "text-primary" },
          { label: "Processos em Análise", value: 3, icon: FileText, color: "text-warning" },
          { label: "Prazos esta Semana", value: 2, icon: Clock, color: "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4 animate-fade-in">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <s.icon className={cn("w-5 h-5", s.color)} />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-card-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-3 px-4 font-heading font-semibold text-card-foreground">Processo</th>
              <th className="text-left py-3 px-4 font-heading font-semibold text-card-foreground">Tipo</th>
              <th className="text-left py-3 px-4 font-heading font-semibold text-card-foreground">Município</th>
              <th className="text-left py-3 px-4 font-heading font-semibold text-card-foreground">Prazo</th>
              <th className="text-left py-3 px-4 font-heading font-semibold text-card-foreground">Status</th>
              <th className="text-left py-3 px-4 font-heading font-semibold text-card-foreground">Responsável</th>
            </tr>
          </thead>
          <tbody>
            {diligencias.map((d) => (
              <tr key={d.processo} className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer">
                <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{d.processo}</td>
                <td className="py-3 px-4 font-medium text-card-foreground">{d.tipo}</td>
                <td className="py-3 px-4 text-muted-foreground">{d.municipio}</td>
                <td className="py-3 px-4 text-muted-foreground">{d.prazo}</td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className={cn("text-xs font-medium", statusColor[d.status] || "")}>{d.status}</Badge>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{d.responsavel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default JuridicoPage;
