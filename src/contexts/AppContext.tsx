import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";

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
    await supabase.auth.signOut();
    setUsuario(null);
    setMunicipio(null);
    setMunicipiosDisponiveis([]);
    localStorage.removeItem("vh_municipio_ativo");
    localStorage.removeItem("vh_ano_exercicio");
  };

  const loadUserData = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setUsuario(null);
      setMunicipio(null);
      setMunicipiosDisponiveis([]);
      setAuthLoading(false);
      return;
    }

    // Find the usuario record by auth_id
    const { data: usr } = await supabase
      .from("usuarios")
      .select("id, nome, email, username, perfil, foto_url, ativo")
      .eq("auth_id", session.user.id)
      .maybeSingle();

    if (!usr) {
      toast.error("Usuário não encontrado no sistema.");
      await supabase.auth.signOut();
      setAuthLoading(false);
      return;
    }

    if (!usr.ativo) {
      toast.warning("Usuário inativo. Entre em contato com o administrador.");
      await supabase.auth.signOut();
      setAuthLoading(false);
      return;
    }

    setUsuario({
      id: usr.id,
      nome: usr.nome,
      email: usr.email,
      username: usr.username,
      perfil: usr.perfil,
      foto_url: usr.foto_url,
    });

    // Load municipalities: Admin sees all active clients, others see their linked ones
    let municipios: MunicipioAtivo[] = [];

    if (usr.perfil === "Administrador") {
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, municipio_id, status, municipios(nome)")
        .eq("status", true);

      municipios = (clientes || []).map((c: any) => ({
        clienteId: c.id,
        municipioId: c.municipio_id,
        municipioNome: c.municipios?.nome || "",
      }));
    } else {
      // Get user's linked municipality IDs
      const { data: links } = await supabase
        .from("usuario_municipios")
        .select("municipio_id")
        .eq("usuario_id", usr.id);

      if (links && links.length > 0) {
        const munIds = links.map((l) => l.municipio_id);
        // Only include municipalities that are active clients
        const { data: clientes } = await supabase
          .from("clientes")
          .select("id, municipio_id, status, municipios(nome)")
          .in("municipio_id", munIds)
          .eq("status", true);

        municipios = (clientes || []).map((c: any) => ({
          clienteId: c.id,
          municipioId: c.municipio_id,
          municipioNome: c.municipios?.nome || "",
        }));
      }
    }

    municipios.sort((a, b) => a.municipioNome.localeCompare(b.municipioNome));
    setMunicipiosDisponiveis(municipios);

    // Restore saved municipality
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

    setAuthLoading(false);
  }, []);

  useEffect(() => {
    // Set up listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Use setTimeout to avoid potential Supabase client deadlock
      setTimeout(() => loadUserData(session), 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUserData(session);
    });

    return () => subscription.unsubscribe();
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
