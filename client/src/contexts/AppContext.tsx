import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, setToken, clearToken } from "@/lib/api";
import { toast } from "sonner";

interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  username: string;
  perfil: string;
  foto_url: string | null;
}

export interface MunicipioAtivo {
  clienteId: string;
  municipioId: number;
  municipioNome: string;
}

interface AppContextType {
  usuario: UsuarioLogado | null;
  municipio: MunicipioAtivo | null;
  anoExercicio: string;
  municipiosDisponiveis: MunicipioAtivo[];
  sidebarCollapsed: boolean;
  authLoading: boolean;

  setAnoExercicio: (a: string) => void;
  setSidebarCollapsed: (v: boolean) => void;
  selecionarMunicipio: (m: MunicipioAtivo) => void;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be inside AppProvider");
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [municipio, setMunicipio] = useState<MunicipioAtivo | null>(null);
  const [municipiosDisponiveis, setMunicipiosDisponiveis] = useState<MunicipioAtivo[]>([]);
  const [anoExercicio, setAnoExercicioState] = useState(() => {
    return localStorage.getItem("vh_ano_exercicio") || new Date().getFullYear().toString();
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const setAnoExercicio = (a: string) => {
    setAnoExercicioState(a);
    localStorage.setItem("vh_ano_exercicio", a);
  };

  const selecionarMunicipio = (m: MunicipioAtivo) => {
    setMunicipio(m);
    localStorage.setItem("vh_municipio_ativo", JSON.stringify(m));
  };

  const logout = async () => {
    clearToken();
    setUsuario(null);
    setMunicipio(null);
    setMunicipiosDisponiveis([]);
    localStorage.removeItem("vh_municipio_ativo");
    localStorage.removeItem("vh_ano_exercicio");
  };

  const loadUserData = useCallback(async () => {
    const token = localStorage.getItem("vh_token");
    if (!token) {
      setAuthLoading(false);
      return;
    }

    try {
      const data = await api.get<{
        usuario: UsuarioLogado;
        municipios: MunicipioAtivo[];
      }>("/auth/me");

      setUsuario(data.usuario);

      const municipios = data.municipios.sort((a, b) =>
        a.municipioNome.localeCompare(b.municipioNome)
      );
      setMunicipiosDisponiveis(municipios);

      const saved = localStorage.getItem("vh_municipio_ativo");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as MunicipioAtivo;
          const found = municipios.find((m) => m.clienteId === parsed.clienteId);
          if (found) {
            setMunicipio(found);
          } else if (municipios.length === 1) {
            selecionarMunicipio(municipios[0]);
          }
        } catch {
          if (municipios.length === 1) selecionarMunicipio(municipios[0]);
        }
      } else if (municipios.length === 1) {
        selecionarMunicipio(municipios[0]);
      }
    } catch {
      clearToken();
      toast.error("Sessão expirada. Faça login novamente.");
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  return (
    <AppContext.Provider
      value={{
        usuario,
        municipio,
        anoExercicio,
        municipiosDisponiveis,
        sidebarCollapsed,
        authLoading,
        setAnoExercicio,
        setSidebarCollapsed,
        selecionarMunicipio,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
