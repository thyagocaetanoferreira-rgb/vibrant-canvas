import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";
import {
  LayoutDashboard, Send, ListTodo, Scale, ShieldAlert,
  MapPin, Users, FileText, Bell, Settings, Calendar,
  BarChart3, Globe, CreditCard, ChevronLeft, ChevronRight,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Agenda", icon: Calendar, path: "/agenda" },
  { label: "Entregas", icon: Send, path: "/entregas" },
  { label: "Demandas", icon: ListTodo, path: "/demandas" },
  { label: "Relatórios", icon: BarChart3, path: "/relatorios" },
  { label: "Jurídico", icon: Scale, path: "/juridico" },
  { label: "Gestão de Riscos", icon: ShieldAlert, path: "/riscos" },
  { label: "Visitas", icon: MapPin, path: "/visitas" },
  { label: "Gente e Gestão", icon: Users, path: "/gente-gestao" },
  { label: "Portal TCM", icon: Globe, path: "/portal-tcm" },
  { label: "Financeiro", icon: CreditCard, path: "/financeiro" },
  { label: "Documentos", icon: FileText, path: "/documentos" },
  { label: "Notificações", icon: Bell, path: "/notificacoes" },
  { label: "Configurações", icon: Settings, path: "/configuracoes" },
];

const AppSidebar = () => {
  const location = useLocation();
  const { sidebarCollapsed, setSidebarCollapsed } = useAppContext();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300",
        sidebarCollapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border flex-shrink-0">
        <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-heading font-bold text-primary-foreground">VH</span>
        </div>
        {!sidebarCollapsed && (
          <div className="animate-fade-in">
            <p className="font-heading font-semibold text-sm text-sidebar-primary-foreground">IntraService</p>
            <p className="text-[10px] text-sidebar-foreground/60">VH Contabilidade</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/30"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!sidebarCollapsed && <span className="truncate animate-fade-in">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
      >
        {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
};

export default AppSidebar;
