import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";
import {
  LayoutDashboard, Send, ListTodo, Scale, ShieldAlert,
  MapPin, Users, FileText, Bell, Settings, Calendar,
  BarChart3, Globe, CreditCard, ChevronLeft, ChevronRight, Building2,
  ChevronDown, Upload,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup => "children" in entry;

const navEntries: NavEntry[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Agenda", icon: Calendar, path: "/agenda" },
  { label: "Entregas", icon: Send, path: "/entregas" },
  {
    label: "Demandas",
    icon: ListTodo,
    children: [
      { label: "Tarefas", icon: ListTodo, path: "/demandas" },
      { label: "Diagnóstico", icon: FileText, path: "/diagnostico" },
    ],
  },
  {
    label: "Relatórios",
    icon: BarChart3,
    children: [
      { label: "Boletim Contábil", icon: FileText, path: "/relatorios/boletim-contabil" },
    ],
  },
  { label: "Jurídico", icon: Scale, path: "/juridico" },
  { label: "Gestão de Riscos", icon: ShieldAlert, path: "/riscos" },
  { label: "Visitas", icon: MapPin, path: "/visitas" },
  { label: "Gente e Gestão", icon: Users, path: "/gente-gestao" },
  { label: "Portal TCM", icon: Globe, path: "/portal-tcm" },
  { label: "Financeiro", icon: CreditCard, path: "/financeiro" },
  { label: "Documentos", icon: FileText, path: "/documentos" },
  { label: "Notificações", icon: Bell, path: "/notificacoes" },
  {
    label: "Integrações",
    icon: Globe,
    children: [
      { label: "TCM-GO", icon: Globe, path: "/integracoes" },
      { label: "Importar Lançamentos", icon: Upload, path: "/importar-lancamentos" },
    ],
  },
  {
    label: "Configurações",
    icon: Settings,
    children: [
      { label: "Clientes", icon: Building2, path: "/clientes" },
      { label: "Usuários", icon: Users, path: "/usuarios" },
    ],
  },
];

const AppSidebar = () => {
  const location = useLocation();
  const { sidebarCollapsed, setSidebarCollapsed } = useAppContext();

  // Auto-open group if current route is inside it
  const isChildActive = (group: NavGroup) =>
    group.children.some((c) => location.pathname.startsWith(c.path));

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navEntries.forEach((entry) => {
      if (isGroup(entry) && isChildActive(entry)) {
        initial[entry.label] = true;
      }
    });
    return initial;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const renderLink = (item: NavItem, nested = false) => {
    const isActive = location.pathname === item.path ||
      (item.path !== "/" && location.pathname.startsWith(item.path));

    return (
      <Link
        key={item.path}
        to={item.path}
        className={cn(
          "flex items-center gap-3 rounded-lg text-sm transition-all duration-150 group",
          nested ? "px-3 py-2 ml-5" : "px-3 py-2.5",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/30"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
        {!sidebarCollapsed && <span className="truncate animate-fade-in">{item.label}</span>}
      </Link>
    );
  };

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
        {navEntries.map((entry) => {
          if (!isGroup(entry)) {
            return renderLink(entry);
          }

          const groupOpen = openGroups[entry.label] || isChildActive(entry);
          const childActive = isChildActive(entry);

          return (
            <div key={entry.label}>
              <button
                onClick={() => toggleGroup(entry.label)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                  childActive
                    ? "text-sidebar-primary-foreground/90"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <entry.icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="truncate animate-fade-in flex-1 text-left">{entry.label}</span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 flex-shrink-0 transition-transform duration-200",
                        groupOpen && "rotate-180"
                      )}
                    />
                  </>
                )}
              </button>
              {groupOpen && !sidebarCollapsed && (
                <div className="space-y-0.5 mt-0.5 animate-fade-in">
                  {entry.children.map((child) => renderLink(child, true))}
                </div>
              )}
              {/* When collapsed, show children as direct icons */}
              {sidebarCollapsed &&
                entry.children.map((child) => renderLink(child))}
            </div>
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
