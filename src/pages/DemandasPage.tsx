import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";

const demandas = [
  { id: "T-001", titulo: "Conferir balancete março", responsavel: "Maria Silva", prioridade: "Alta", status: "Em Andamento", prazo: "15/03/2025" },
  { id: "T-002", titulo: "Enviar MSC abril TCM-GO", responsavel: "João Santos", prioridade: "Crítica", status: "Pendente", prazo: "10/03/2025" },
  { id: "T-003", titulo: "Ajustar empenhos FPM", responsavel: "Ana Costa", prioridade: "Média", status: "Concluída", prazo: "20/03/2025" },
  { id: "T-004", titulo: "Responder diligência #342", responsavel: "Pedro Lima", prioridade: "Alta", status: "Em Andamento", prazo: "12/03/2025" },
  { id: "T-005", titulo: "Atualizar dados CAUC", responsavel: "Lucas Oliveira", prioridade: "Baixa", status: "Pendente", prazo: "25/03/2025" },
  { id: "T-006", titulo: "Relatório RGF 1° Quad.", responsavel: "Maria Silva", prioridade: "Crítica", status: "Em Andamento", prazo: "30/03/2025" },
  { id: "T-007", titulo: "Revisão folha de pagamento", responsavel: "Ana Costa", prioridade: "Média", status: "Concluída", prazo: "08/03/2025" },
];

const prioridadeColors: Record<string, string> = {
  "Crítica": "bg-destructive/10 text-destructive border-destructive/20",
  "Alta": "bg-warning/10 text-warning border-warning/20",
  "Média": "bg-info/10 text-info border-info/20",
  "Baixa": "bg-muted text-muted-foreground border-border",
};

const statusColors: Record<string, string> = {
  "Concluída": "bg-success/10 text-success border-success/20",
  "Em Andamento": "bg-primary/10 text-primary border-primary/20",
  "Pendente": "bg-warning/10 text-warning border-warning/20",
};

const DemandasPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Gestão de Demandas</h1>
          <p className="text-sm text-muted-foreground mt-1">Tarefas e chamados da equipe</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-1" /> Filtrar
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" /> Nova Tarefa
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-3 px-4 font-heading font-semibold text-card-foreground">ID</th>
              <th className="text-left py-3 px-4 font-heading font-semibold text-card-foreground">Título</th>
              <th className="text-left py-3 px-4 font-heading font-semibold text-card-foreground">Responsável</th>
              <th className="text-left py-3 px-4 font-heading font-semibold text-card-foreground">Prioridade</th>
              <th className="text-left py-3 px-4 font-heading font-semibold text-card-foreground">Status</th>
              <th className="text-left py-3 px-4 font-heading font-semibold text-card-foreground">Prazo</th>
            </tr>
          </thead>
          <tbody>
            {demandas.map((d) => (
              <tr key={d.id} className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer">
                <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{d.id}</td>
                <td className="py-3 px-4 font-medium text-card-foreground">{d.titulo}</td>
                <td className="py-3 px-4 text-muted-foreground">{d.responsavel}</td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className={cn("text-xs font-medium", prioridadeColors[d.prioridade])}>{d.prioridade}</Badge>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className={cn("text-xs font-medium", statusColors[d.status])}>{d.status}</Badge>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{d.prazo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DemandasPage;
