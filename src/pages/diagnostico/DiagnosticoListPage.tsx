import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, CheckCircle2, Clock } from "lucide-react";
import { formatBRL, calcIndiceEducacao, calcIndiceFundeb, calcIndiceSaude, calcIndicePessoal, statusEducacao, statusFundeb, statusSaude, statusPessoal } from "@/lib/calculos-lrf";
import { cn } from "@/lib/utils";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const statusIcon: Record<string, React.ReactNode> = {
  finalizado: <CheckCircle2 className="w-4 h-4 text-success" />,
  rascunho: <Clock className="w-4 h-4 text-warning" />,
};

const statusLabel: Record<string, string> = {
  finalizado: "Finalizado",
  rascunho: "Rascunho",
};

const indiceBadge = (s: ReturnType<typeof statusEducacao>) => {
  const colors: Record<string, string> = {
    ok: "bg-success/10 text-success border-success/20",
    alerta: "bg-warning/10 text-warning border-warning/20",
    prudencial: "bg-warning/10 text-warning border-warning/20",
    excedido: "bg-destructive/10 text-destructive border-destructive/20",
    pendente: "bg-muted text-muted-foreground border-border",
  };
  const icons: Record<string, string> = { ok: "✅", alerta: "⚠️", prudencial: "🟠", excedido: "🔴", pendente: "—" };
  return <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded text-xs", colors[s])}>{icons[s]}</span>;
};

const DiagnosticoListPage = () => {
  const navigate = useNavigate();
  const { municipio, anoExercicio } = useAppContext();
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!municipio) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("lancamentos_mensais")
        .select("*")
        .eq("cliente_id", municipio.clienteId)
        .eq("ano_referencia", Number(anoExercicio))
        .order("mes_referencia");
      setLancamentos(data || []);
      setLoading(false);
    };
    fetch();
  }, [municipio, anoExercicio]);

  const lancByMes = lancamentos.reduce((acc: Record<number, any>, l) => {
    acc[l.mes_referencia] = l;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Diagnóstico Fiscal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {municipio ? `📍 ${municipio.municipioNome}` : "Selecione um município"} · {anoExercicio}
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/diagnostico/novo")}>
          <Plus className="w-4 h-4 mr-1" /> Novo Lançamento
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-3 px-4 font-heading font-semibold text-card-foreground">Mês</th>
              <th className="text-left py-3 px-4 font-heading font-semibold text-card-foreground">Status</th>
              <th className="text-left py-3 px-4 font-heading font-semibold text-card-foreground">Receita Realizada</th>
              <th className="text-left py-3 px-4 font-heading font-semibold text-card-foreground">Desp. Paga</th>
              <th className="text-center py-3 px-4 font-heading font-semibold text-card-foreground">Conformidade LRF</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => {
              const l = lancByMes[mes];
              const edIdx = l ? calcIndiceEducacao(l.aplicacao_educacao, l.receita_realizada) : null;
              const fbIdx = l ? calcIndiceFundeb(l.aplicacao_fundeb_70, l.receita_fundeb) : null;
              const saIdx = l ? calcIndiceSaude(l.aplicacao_saude, l.receita_corrente_liquida) : null;
              const peIdx = l ? calcIndicePessoal(l.gasto_pessoal, l.receita_corrente_liquida) : null;

              return (
                <tr
                  key={mes}
                  className={cn(
                    "border-b border-border last:border-b-0 transition-colors",
                    l ? "hover:bg-muted/20 cursor-pointer" : "bg-muted/5 text-muted-foreground"
                  )}
                  onClick={() => l && navigate(`/diagnostico/${l.id}/editar`)}
                >
                  <td className="py-3 px-4 font-medium">{MESES[mes - 1]}</td>
                  <td className="py-3 px-4">
                    {l ? (
                      <div className="flex items-center gap-1.5">
                        {statusIcon[l.status]}
                        <span className="text-xs">{statusLabel[l.status]}</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="py-3 px-4">{l ? formatBRL(l.receita_realizada) : "—"}</td>
                  <td className="py-3 px-4">{l ? formatBRL(l.despesa_paga) : "—"}</td>
                  <td className="py-3 px-4">
                    {l ? (
                      <div className="flex items-center justify-center gap-1">
                        {indiceBadge(statusEducacao(edIdx))}
                        {indiceBadge(statusFundeb(fbIdx))}
                        {indiceBadge(statusSaude(saIdx))}
                        {indiceBadge(statusPessoal(peIdx))}
                      </div>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && (
          <div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>
        )}
      </div>
    </div>
  );
};

export default DiagnosticoListPage;
