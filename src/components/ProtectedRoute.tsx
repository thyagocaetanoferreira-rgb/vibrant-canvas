import { Navigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { usuario, municipio, municipiosDisponiveis, authLoading } = useAppContext();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="text-3xl font-heading font-extrabold text-primary">VH</div>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  // User authenticated but no municipality selected and has multiple options
  if (!municipio && municipiosDisponiveis.length > 1) {
    return <Navigate to="/selecionar-municipio" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
