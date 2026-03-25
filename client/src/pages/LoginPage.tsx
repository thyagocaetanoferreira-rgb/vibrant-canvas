import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "@/lib/api";
import { useAppContext } from "@/contexts/AppContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, User, Lock } from "lucide-react";
import { toast } from "sonner";

const LoginPage = () => {
  const navigate = useNavigate();
  const { usuario, authLoading } = useAppContext();
  const [identifier, setIdentifier] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [manterConectado, setManterConectado] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && usuario) {
      navigate("/", { replace: true });
    }
  }, [usuario, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !senha) {
      toast.error("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      const data = await api.post<{ token: string; usuario: any; municipios: any[] }>("/auth/login", {
        identifier,
        senha,
      });
      setToken(data.token);
      // Reload page so AppContext re-initializes with the new token
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err.message || "E-mail ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - brand */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #033e66 0%, #008ded 50%, #00bfcf 100%)",
        }}
      >
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute bottom-32 right-10 w-48 h-48 rounded-full bg-white/8" />
        <div className="absolute top-1/3 right-1/4 w-32 h-32 rounded-full bg-white/5" />

        <div className="relative z-10 text-center px-12">
          <img src="/logo-verus-branca.webp" alt="Verus" className="h-24 w-auto object-contain mx-auto" />
        </div>

        <div className="absolute bottom-6 left-0 right-0 text-center">
          <span className="text-xs text-white/60">Sistema elaborado pela VH Contabilidade Pública</span>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-card p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-8">
            <div className="text-4xl font-heading font-extrabold text-primary mb-1">VH</div>
            <div className="text-lg font-heading font-bold text-foreground">Verus</div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-heading font-bold text-foreground">Bem-vindo ao Verus</h1>
            <p className="text-muted-foreground mt-1">Faça login para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="E-mail ou usuário"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="pl-10 h-11"
                autoComplete="username"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="pl-10 pr-10 h-11"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="manter"
                checked={manterConectado}
                onCheckedChange={(v) => setManterConectado(!!v)}
              />
              <label htmlFor="manter" className="text-sm text-muted-foreground cursor-pointer">
                Manter conectado
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="text-center">
            <button
              onClick={() => navigate("/esqueci-senha")}
              className="text-sm text-primary hover:underline"
            >
              Esqueci minha senha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
