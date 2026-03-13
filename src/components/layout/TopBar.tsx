import { useAppContext, municipios } from "@/contexts/AppContext";
import { Search, Bell, ChevronDown, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const years = ["2025", "2024", "2023", "2022"];

const TopBar = () => {
  const { municipio, setMunicipio, anoExercicio, setAnoExercicio, sidebarCollapsed } = useAppContext();

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-card border-b border-border flex items-center justify-between px-6 transition-all duration-300",
        sidebarCollapsed ? "left-[68px]" : "left-[240px]"
      )}
    >
      {/* Context selectors */}
      <div className="flex items-center gap-3">
        <Select value={municipio} onValueChange={setMunicipio}>
          <SelectTrigger className="w-[180px] h-9 text-sm border-border bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {municipios.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={anoExercicio} onValueChange={setAnoExercicio}>
          <SelectTrigger className="w-[100px] h-9 text-sm border-border bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Search + actions */}
      <div className="flex items-center gap-4">
        {/* Omnisearch */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar processos, municípios... (Ctrl+K)"
            className="h-9 w-[280px] rounded-lg border border-border bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-[18px] h-[18px] text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
        </button>

        {/* User */}
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground hidden lg:block">Admin</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground hidden lg:block" />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
