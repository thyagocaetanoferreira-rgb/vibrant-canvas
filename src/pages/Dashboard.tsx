import { useAppContext } from "@/contexts/AppContext";
import KpiCard from "@/components/dashboard/KpiCard";
import { ListTodo, Send, ShieldAlert, Scale, Clock, CheckCircle2, AlertTriangle, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const entregas = [
  { mes: "Jan", enviadas: 18, pendentes: 2 },
  { mes: "Fev", enviadas: 16, pendentes: 4 },
  { mes: "Mar", enviadas: 20, pendentes: 0 },
  { mes: "Abr", enviadas: 15, pendentes: 5 },
  { mes: "Mai", enviadas: 19, pendentes: 1 },
  { mes: "Jun", enviadas: 12, pendentes: 8 },
];

const demandaStatus = [
  { name: "Concluídas", value: 45, color: "hsl(160, 100%, 44%)" },
  { name: "Em Andamento", value: 28, color: "hsl(207, 100%, 46%)" },
  { name: "Pendentes", value: 12, color: "hsl(38, 92%, 50%)" },
  { name: "Atrasadas", value: 5, color: "hsl(0, 84%, 60%)" },
];

const recentActivities = [
  { id: 1, action: "Entrega TCM-GO enviada", entity: "Ipameri - MSC Maio/2025", time: "Há 15 min", type: "success" as const },
  { id: 2, action: "Nova diligência recebida", entity: "Processo #2025-0342", time: "Há 1h", type: "warning" as const },
  { id: 3, action: "Tarefa concluída", entity: "Conferência Balancete - Catalão", time: "Há 2h", type: "info" as const },
  { id: 4, action: "Alerta CAUC", entity: "Ouvidor - Item 14 irregular", time: "Há 3h", type: "danger" as const },
  { id: 5, action: "Visita aprovada", entity: "Pires do Rio - 18/03/2025", time: "Há 4h", type: "info" as const },
];

const Dashboard = () => {
  const { municipio, anoExercicio } = useAppContext();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão geral — {municipio} · Exercício {anoExercicio}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Tarefas Pendentes" value={12} change="3 vencem hoje" changeType="negative" icon={ListTodo} />
        <KpiCard label="Entregas no Prazo" value="94%" change="+2% vs mês anterior" changeType="positive" icon={Send} iconColor="bg-secondary/20" />
        <KpiCard label="Diligências Abertas" value={7} change="2 vencem esta semana" changeType="negative" icon={Scale} iconColor="bg-warning/20" />
        <KpiCard label="Itens CAUC Regulares" value="26/29" change="3 pendências" changeType="neutral" icon={ShieldAlert} iconColor="bg-success/20" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5 animate-fade-in">
          <h3 className="font-heading font-semibold text-card-foreground mb-4">Entregas por Mês</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={entregas} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 87%)" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "hsl(210, 15%, 45%)" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(210, 15%, 45%)" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(210, 20%, 87%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="enviadas" fill="hsl(207, 100%, 46%)" radius={[4, 4, 0, 0]} name="Enviadas" />
              <Bar dataKey="pendentes" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name="Pendentes" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
          <h3 className="font-heading font-semibold text-card-foreground mb-4">Demandas por Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={demandaStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {demandaStatus.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {demandaStatus.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-muted-foreground">{s.name}</span>
                </div>
                <span className="font-medium text-card-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity + Quick stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity feed */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5 animate-fade-in">
          <h3 className="font-heading font-semibold text-card-foreground mb-4">Atividade Recente</h3>
          <div className="space-y-3">
            {recentActivities.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  a.type === "success" ? "bg-success/10" :
                  a.type === "warning" ? "bg-warning/10" :
                  a.type === "danger" ? "bg-destructive/10" : "bg-info/10"
                }`}>
                  {a.type === "success" ? <CheckCircle2 className="w-4 h-4 text-success" /> :
                   a.type === "warning" ? <AlertTriangle className="w-4 h-4 text-warning" /> :
                   a.type === "danger" ? <AlertTriangle className="w-4 h-4 text-destructive" /> :
                   <Clock className="w-4 h-4 text-info" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground">{a.action}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.entity}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team overview */}
        <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
          <h3 className="font-heading font-semibold text-card-foreground mb-4">Equipe Online</h3>
          <div className="space-y-3">
            {["Maria Silva", "João Santos", "Ana Costa", "Pedro Lima", "Lucas Oliveira"].map((name, i) => (
              <div key={name} className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${i < 3 ? "bg-success" : "bg-muted-foreground/40"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-card-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">{i < 3 ? "Online" : "Offline"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
