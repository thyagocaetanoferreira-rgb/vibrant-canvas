import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";

const EsqueciSenhaPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast.error("Erro ao enviar e-mail de recuperação.");
      return;
    }

    setSent(true);
    toast.success("E-mail de recuperação enviado!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-card p-8">
      <div className="w-full max-w-md space-y-6">
        <button onClick={() => navigate("/login")} className="flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" /> Voltar ao login
        </button>

        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Recuperar senha</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Informe seu e-mail para receber um link de redefinição.
          </p>
        </div>

        {sent ? (
          <div className="bg-muted rounded-lg p-6 text-center space-y-2">
            <Mail className="w-10 h-10 text-primary mx-auto" />
            <p className="text-sm text-foreground font-medium">E-mail enviado!</p>
            <p className="text-xs text-muted-foreground">Verifique sua caixa de entrada e siga as instruções.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default EsqueciSenhaPage;
