import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, ChevronRight, LogOut } from "lucide-react";

const SelecionarMunicipioPage = () => {
  const navigate = useNavigate();
  const { usuario, municipiosDisponiveis, selecionarMunicipio, logout } = useAppContext();
  const [busca, setBusca] = useState("");

  const filtered = municipiosDisponiveis.filter((m) =>
    m.municipioNome.toLowerCase().includes(busca.toLowerCase())
  );

  const handleSelect = (m: typeof municipiosDisponiveis[0]) => {
    selecionarMunicipio(m);
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#e3eef6" }}>
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center border-b pb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl font-heading font-extrabold text-primary">VH</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm font-medium text-foreground">IntraService VH Contabilidade</span>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div>
            <h2 className="text-lg font-heading font-semibold text-foreground">
              Olá, {usuario?.nome?.split(" ")[0]} 👋
            </h2>
            <p className="text-sm text-muted-foreground">Selecione o município para continuar</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar município..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum município encontrado.</p>
            )}
            {filtered.map((m) => (
              <button
                key={m.clienteId}
                onClick={() => handleSelect(m)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left group"
              >
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="flex-1 text-sm font-medium text-foreground">{m.municipioNome}</span>
                <span className="text-xs text-muted-foreground">GO</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>

          <div className="pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
              <LogOut className="w-4 h-4 mr-2" />
              Sair da conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SelecionarMunicipioPage;
