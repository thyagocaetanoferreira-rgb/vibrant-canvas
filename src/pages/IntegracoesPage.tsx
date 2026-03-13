import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle, XCircle, Building2, Plug } from "lucide-react";
import { toast } from "sonner";

interface UltimoLog {
  status: string;
  total_registros: number;
  finalizado_em: string;
}

function SincronizacaoTCMGO() {
  const { usuario } = useAppContext();
  const [carregando, setCarregando] = useState(false);
  const [ultimoLog, setUltimoLog] = useState<UltimoLog | null>(null);

  useEffect(() => {
    async function carregarUltimoLog() {
      const { data } = await supabase
        .from("tcmgo_sync_log")
        .select("status, total_registros, finalizado_em")
        .eq("status", "sucesso")
        .order("finalizado_em", { ascending: false })
        .limit(1)
        .single();
      if (data) setUltimoLog(data);
    }
    carregarUltimoLog();
  }, []);

  async function handleSincronizar() {
    setCarregando(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "sincronizar-tcmgo-municipios",
        { body: { usuario_id: usuario?.id } }
      );

      if (error) throw new Error(error.message);
      if (!data?.sucesso) throw new Error(data?.mensagem ?? "Erro desconhecido");

      toast.success(`✅ ${data.mensagem}`);
      setUltimoLog({
        status: "sucesso",
        total_registros: data.total,
        finalizado_em: new Date().toISOString(),
      });
    } catch (erro: any) {
      toast.error(`❌ Erro: ${erro.message}`);
    } finally {
      setCarregando(false);
    }
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <CardTitle className="text-base font-semibold">
            Municípios TCM-GO
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fonte: ws.tcm.go.gov.br
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Importa a lista oficial de municípios do Tribunal de Contas de Goiás
          via API pública. Os dados ficam disponíveis para cruzamento nos módulos
          Jurídico, Controle de Envios e Gestão de Riscos.
        </p>

        {ultimoLog && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex items-center gap-2 text-accent-foreground font-medium">
              <CheckCircle className="w-4 h-4 text-accent" />
              Última sincronização: {formatarData(ultimoLog.finalizado_em)}
            </div>
            <div className="text-muted-foreground">
              Total de registros:{" "}
              <strong>{ultimoLog.total_registros} municípios</strong>
            </div>
          </div>
        )}

        <Button
          onClick={handleSincronizar}
          disabled={carregando}
          className="w-full"
        >
          {carregando ? (
            <>
              <RefreshCw className="mr-2 w-4 h-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 w-4 h-4" />
              Sincronizar Agora
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          A sincronização é manual. Clique no botão para buscar dados
          atualizados.
        </p>
      </CardContent>
    </Card>
  );
}

export default function IntegracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          Integrações
        </h1>
        <p className="text-muted-foreground mt-1">
          Conecte-se a APIs externas para importar dados para o sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <SincronizacaoTCMGO />
      </div>
    </div>
  );
}
