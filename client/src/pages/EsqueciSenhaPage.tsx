import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const EsqueciSenhaPage = () => {
  const navigate = useNavigate();
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch {
      toast.error("Erro ao processar solicitação. Tente novamente.");
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

      {/* Painel direito — formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-card p-8">
        <div className="w-full max-w-md space-y-8">

          {/* Mobile: logo */}
          <div className="lg:hidden text-center mb-4">
            <div className="text-4xl font-heading font-extrabold text-primary mb-1">VH</div>
            <div className="text-lg font-heading font-bold text-foreground">Verus</div>
          </div>

          {sent ? (
            /* Estado: e-mail enviado */
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-heading font-bold text-foreground">Verifique seu e-mail</h1>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Se o endereço <strong className="text-foreground">{email}</strong> estiver cadastrado,
                  você receberá um link de redefinição em instantes.
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 px-5 py-4 text-left text-xs text-muted-foreground space-y-1">
                <p>• Verifique também a pasta de spam.</p>
                <p>• O link expira em <strong>2 horas</strong>.</p>
                <p>• Se não receber, aguarde alguns minutos e tente novamente.</p>
              </div>
              <Button
                variant="outline"
                className="w-full h-11 gap-2"
                onClick={() => navigate("/login")}
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao login
              </Button>
            </div>
          ) : (
            /* Estado: formulário */
            <>
              <div>
                <button
                  onClick={() => navigate("/login")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao login
                </button>
                <h1 className="text-2xl font-heading font-bold text-foreground">Recuperar senha</h1>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>

                <Button type="submit" className="w-full h-11 gap-2" disabled={loading || !email.trim()}>
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  ) : (
                    <><Mail className="w-4 h-4" /> Enviar link de recuperação</>
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

export default EsqueciSenhaPage;
