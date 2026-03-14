import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Clock } from "lucide-react";
import { formatBRL, formatPct, statusEducacao, statusFundeb, statusSaude, statusPessoal, calcResFinanceiroLiquidado } from "@/lib/calculos-lrf";
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

const indiceBadge = (s: ReturnType<typeof statusEducacao>, pct: string) => {
  const colors: Record<string, string> = {
    ok: "text-success",
    alerta: "text-warning",
    prudencial: "text-warning",
    excedido: "text-destructive",
    pendente: "text-muted-foreground",
  };
  return <span className={cn("text-xs font-medium", colors[s])}>{pct}</span>;
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

  // Compute accumulated values per month
  const acumulados = useMemo(() => {
    const result: Record<number, { receitaAcum: number; despLiqAcum: number }> = {};
    let receitaAcum = 0;
    let despLiqAcum = 0;
    for (let m = 1; m <= 12; m++) {
      const l = lancByMes[m];
      if (l) {
        receitaAcum += Number(l.receita_realizada || 0);
        despLiqAcum += Number(l.despesa_liquidada || 0);
      }
      result[m] = { receitaAcum, despLiqAcum };
    }
    return result;
  }, [lancByMes]);

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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-3 font-heading font-semibold text-card-foreground whitespace-nowrap">Mês</th>
                <th className="text-left py-3 px-3 font-heading font-semibold text-card-foreground whitespace-nowrap">Status</th>
                <th className="text-right py-3 px-3 font-heading font-semibold text-card-foreground whitespace-nowrap">Res. Orçamentário (Liq.)</th>
                <th className="text-right py-3 px-3 font-heading font-semibold text-card-foreground whitespace-nowrap">Res. Financeiro (Liq.)</th>
                <th className="text-center py-3 px-3 font-heading font-semibold text-card-foreground whitespace-nowrap">Educação</th>
                <th className="text-center py-3 px-3 font-heading font-semibold text-card-foreground whitespace-nowrap">FUNDEB</th>
                <th className="text-center py-3 px-3 font-heading font-semibold text-card-foreground whitespace-nowrap">Saúde</th>
                <th className="text-center py-3 px-3 font-heading font-semibold text-card-foreground whitespace-nowrap">Pessoal</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => {
                const l = lancByMes[mes];
                const hasData = !!l;

                // Col 2: Resultado Orçamentário acumulado
                const { receitaAcum, despLiqAcum } = acumulados[mes];
                const resOrcamento = hasData ? receitaAcum - despLiqAcum : null;

                // Col 3: Resultado Financeiro (liquidado) do mês
                const resFinLiq = hasData
                  ? calcResFinanceiroLiquidado(
                      Number(l.caixa || 0),
                      Number(l.consignacoes_tesouraria || 0),
                      Number(l.despesa_processada || 0),
                      Number(l.resto_processado || 0)
                    )
                  : null;

                // Indices
                const edIdx = l && l.receita_impostos ? Number(l.aplicacao_educacao) / Number(l.receita_impostos) : null;
                const fbIdx = l && l.receita_fundeb ? Number(l.aplicacao_fundeb_70) / Number(l.receita_fundeb) : null;
                const saIdx = l && l.receita_impostos_saude ? Number(l.aplicacao_saude) / Number(l.receita_impostos_saude) : null;
                const peIdx = l && l.receita_corrente_liquida ? Number(l.gasto_pessoal) / Number(l.receita_corrente_liquida) : null;

                return (
                  <tr
                    key={mes}
                    className={cn(
                      "border-b border-border last:border-b-0 transition-colors",
                      hasData ? "hover:bg-muted/20 cursor-pointer" : "bg-muted/5 text-muted-foreground"
                    )}
                    onClick={() => hasData && navigate(`/diagnostico/${l.id}/editar`)}
                  >
                    <td className="py-3 px-3 font-medium">{MESES[mes - 1]}</td>
                    <td className="py-3 px-3 text-right">
                      {resOrcamento !== null ? (
                        <span className={cn("font-medium", resOrcamento >= 0 ? "text-success" : "text-destructive")}>
                          {formatBRL(resOrcamento)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {resFinLiq !== null ? (
                        <span className={cn("font-medium", resFinLiq >= 0 ? "text-success" : "text-destructive")}>
                          {formatBRL(resFinLiq)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {hasData ? indiceBadge(statusEducacao(edIdx), formatPct(edIdx)) : "—"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {hasData ? indiceBadge(statusFundeb(fbIdx), formatPct(fbIdx)) : "—"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {hasData ? indiceBadge(statusSaude(saIdx), formatPct(saIdx)) : "—"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {hasData ? indiceBadge(statusPessoal(peIdx), formatPct(peIdx)) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>
        )}
      </div>
    </div>
  );
};

export default DiagnosticoListPage;
