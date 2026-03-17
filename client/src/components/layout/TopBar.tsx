import { useAppContext } from "@/contexts/AppContext";
import { Search, Bell, ChevronDown, User, MapPin, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => String(currentYear + 1 - i));

const TopBar = () => {
  const {
    usuario,
    municipio,
    municipiosDisponiveis,
    selecionarMunicipio,
    anoExercicio,
    setAnoExercicio,
    sidebarCollapsed,
    logout,
  } = useAppContext();

  const handleMunicipioChange = (clienteId: string) => {
    const found = municipiosDisponiveis.find((m) => m.clienteId === clienteId);
    if (found) {
      selecionarMunicipio(found);
      toast.success(`Município alterado para ${found.municipioNome}`);
    }
  };

  const handleAnoChange = (ano: string) => {
    setAnoExercicio(ano);
    toast.success(`Ano de exercício alterado para ${ano}`);
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-card border-b border-border flex items-center justify-between px-6 transition-all duration-300",
        sidebarCollapsed ? "left-[68px]" : "left-[240px]"
      )}
    >
      {/* Context selectors */}
      <div className="flex items-center gap-3">
        {municipiosDisponiveis.length > 1 ? (
          <Select value={municipio?.clienteId || ""} onValueChange={handleMunicipioChange}>
            <SelectTrigger className="w-[200px] h-9 text-sm border-border bg-background">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <SelectValue placeholder="Selecionar município" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {municipiosDisponiveis.map((m) => (
                <SelectItem key={m.clienteId} value={m.clienteId}>
                  {m.municipioNome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2 px-3 h-9 text-sm font-medium text-foreground">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            {municipio?.municipioNome || "—"}
          </div>
        )}

        <Select value={anoExercicio} onValueChange={handleAnoChange}>
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
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar processos, municípios... (Ctrl+K)"
            className="h-9 w-[280px] rounded-lg border border-border bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>

        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-[18px] h-[18px] text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
        </button>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground hidden lg:block">
            {usuario?.nome?.split(" ")[0] || "Usuário"}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground hidden lg:block" />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
