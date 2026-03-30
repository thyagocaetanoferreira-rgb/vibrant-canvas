import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "Mínimo 6 caracteres", ok: password.length >= 6 },
    { label: "Letra maiúscula",      ok: /[A-Z]/.test(password) },
    { label: "Número",               ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ["bg-red-400", "bg-yellow-400", "bg-green-500"];

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={cn("h-1 flex-1 rounded-full transition-all", i < score ? colors[score - 1] : "bg-muted")}
          />
        ))}
      </div>
      <div className="space-y-1">
        {checks.map(c => (
          <p key={c.label} className={cn("text-xs flex items-center gap-1.5", c.ok ? "text-green-600" : "text-muted-foreground")}>
            <span className={cn("w-1 h-1 rounded-full inline-block", c.ok ? "bg-green-500" : "bg-muted-foreground/40")} />
            {c.label}
          </p>
        ))}
      </div>
    </div>
  );
}

const ResetPasswordPage = () => {
  const navigate           = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [token, setToken]       = useState<string | null>(null);
  const [tokenInvalido, setTokenInvalido] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (!t) {
      setTokenInvalido(true);
    } else {
      setToken(t);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.toLowerCase().includes("expirado") || msg.toLowerCase().includes("inválido")) {
        setTokenInvalido(true);
      } else {
        toast.error(msg || "Erro ao redefinir senha. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo — identidade visual */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ background: "linear-gradient(135deg, #033e66 0%, #008ded 50%, #00bfcf 100%)" }}
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

      {/* Painel direito */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-card p-8">
        <div className="w-full max-w-md space-y-8">

          {/* Mobile: logo */}
          <div className="lg:hidden text-center mb-4">
            <div className="text-4xl font-heading font-extrabold text-primary mb-1">VH</div>
            <div className="text-lg font-heading font-bold text-foreground">Verus</div>
          </div>

          {/* Link inválido / expirado */}
          {tokenInvalido && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-heading font-bold text-foreground">Link inválido</h1>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Este link de redefinição é inválido ou expirou.<br />
                  Os links são válidos por <strong>2 horas</strong>.
                </p>
              </div>
              <Button className="w-full h-11" onClick={() => navigate("/esqueci-senha")}>
                Solicitar novo link
              </Button>
              <button
                onClick={() => navigate("/login")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors block w-full text-center"
              >
                Voltar ao login
              </button>
            </div>
          )}

          {/* Senha redefinida com sucesso */}
          {!tokenInvalido && done && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-heading font-bold text-foreground">Senha redefinida!</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Sua nova senha foi salva com sucesso. Você já pode fazer login.
                </p>
              </div>
              <Button className="w-full h-11" onClick={() => navigate("/login")}>
                Ir para o login
              </Button>
            </div>
          )}

          {/* Formulário */}
          {!tokenInvalido && !done && token && (
            <>
              <div>
                <h1 className="text-2xl font-heading font-bold text-foreground">Criar nova senha</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha uma senha segura para sua conta.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPass ? "text" : "password"}
                      placeholder="Nova senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-11"
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPass ? "text" : "password"}
                    placeholder="Confirmar nova senha"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={cn(
                      "pl-10 h-11",
                      confirm && confirm !== password && "border-red-400 focus-visible:ring-red-400"
                    )}
                    autoComplete="new-password"
                  />
                </div>
                {confirm && confirm !== password && (
                  <p className="text-xs text-red-500 -mt-3">As senhas não coincidem.</p>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 gap-2"
                  disabled={loading || password.length < 6 || password !== confirm}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                  ) : (
                    "Salvar nova senha"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
