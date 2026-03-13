import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, User, Lock } from "lucide-react";
import { toast } from "sonner";

const LoginPage = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [manterConectado, setManterConectado] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !senha) {
      toast.error("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      // If identifier is not an email, look up the email by username
      let email = identifier;
      if (!identifier.includes("@")) {
        const { data: usuario } = await supabase
          .from("usuarios")
          .select("email")
          .eq("username", identifier)
          .maybeSingle();

        if (!usuario) {
          toast.error("E-mail ou senha incorretos.");
          setLoading(false);
          return;
        }
        email = usuario.email;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        toast.error("E-mail ou senha incorretos.");
        setLoading(false);
        return;
      }

      // Auth state change in AppContext will handle the rest (redirect logic)
    } catch {
      toast.error("Erro ao fazer login. Tente novamente.");
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
        {/* Decorative shapes */}
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute bottom-32 right-10 w-48 h-48 rounded-full bg-white/8" />
        <div className="absolute top-1/3 right-1/4 w-32 h-32 rounded-full bg-white/5" />

        <div className="relative z-10 text-center px-12">
          <div className="text-7xl font-heading font-extrabold text-white mb-4 tracking-tight">VH</div>
          <div className="text-2xl font-heading font-bold text-white mb-2">IntraService</div>
          <div className="text-base text-white/80">VH Contabilidade Pública</div>
        </div>

        <div className="absolute bottom-6 left-0 right-0 text-center">
          <span className="text-xs text-white/60">Sistema de Gestão Interna</span>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-card p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="text-4xl font-heading font-extrabold text-primary mb-1">VH</div>
            <div className="text-lg font-heading font-bold text-foreground">IntraService</div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-heading font-bold text-foreground">Bem-vindo ao IntraService</h1>
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
