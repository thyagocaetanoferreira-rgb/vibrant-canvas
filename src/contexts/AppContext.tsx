import React, { createContext, useContext, useState } from "react";

interface AppContextType {
  municipio: string;
  setMunicipio: (m: string) => void;
  anoExercicio: string;
  setAnoExercicio: (a: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const municipios = [
  "Ipameri", "Catalão", "Goiandira", "Ouvidor", "Corumbaíba",
  "Urutaí", "Pires do Rio", "Silvânia", "Vianópolis", "Caldas Novas",
  "Rio Quente", "Morrinhos", "Piracanjuba", "Cromínia", "Pontalina",
  "Joviânia", "Buriti Alegre", "Itumbiara", "Goiatuba", "Bom Jesus de Goiás",
];

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be inside AppProvider");
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [municipio, setMunicipio] = useState("Ipameri");
  const [anoExercicio, setAnoExercicio] = useState("2025");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <AppContext.Provider value={{ municipio, setMunicipio, anoExercicio, setAnoExercicio, sidebarCollapsed, setSidebarCollapsed }}>
      {children}
    </AppContext.Provider>
  );
};
