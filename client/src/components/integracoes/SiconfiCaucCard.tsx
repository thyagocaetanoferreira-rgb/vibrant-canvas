import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, XCircle, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";

interface SyncLog {
  status: string;
  total_registros: number;
  finalizado_em: string;
  mensagem_erro?: string;
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function SiconfiCaucCard() {
  const [carregando, setCarregando] = useState(false);
  const [ultimoLog, setUltimoLog] = useState<SyncLog | null>(null);

  useEffect(() => {
    api.get<SyncLog>("/siconfi/cauc-log")
      .then((data) => { if (data) setUltimoLog(data); })
      .catch(() => {});
  }, []);

  async function handleSincronizar() {
    setCarregando(true);
    try {
      const data = await api.post<any>("/siconfi/sincronizar-cauc", {});
      if (!data?.sucesso) throw new Error(data?.mensagem ?? "Erro desconhecido");
      toast.success(`✅ ${data.mensagem}`);
      setUltimoLog({
        status: "sucesso",
        total_registros: data.total,
        finalizado_em: new Date().toISOString(),
      });
    } catch (err: any) {
      toast.error(`❌ Erro: ${err.message}`);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <CardTitle className="text-base font-semibold">Situação CAUC</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fonte: tesourotransparente.gov.br
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Importa o relatório de situação do CAUC (Cadastro Único de Convênios) de todos os
          municípios brasileiros. Atualizado automaticamente todos os dias às 06h.
        </p>

        {ultimoLog && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1.5">
            <div className="flex items-center gap-2 font-medium">
              {ultimoLog.status === "sucesso" ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" />
              )}
              <span>
                {ultimoLog.status === "sucesso" ? "Última importação: " : "Último erro: "}
                {formatarData(ultimoLog.finalizado_em)}
              </span>
            </div>
            {ultimoLog.status === "sucesso" && (
              <div className="text-muted-foreground flex items-center gap-1.5">
                <Badge variant="secondary">{ultimoLog.total_registros.toLocaleString("pt-BR")} municípios</Badge>
              </div>
            )}
            {ultimoLog.mensagem_erro && (
              <p className="text-xs text-destructive">{ultimoLog.mensagem_erro}</p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          Atualização automática diária às 06:00
        </div>

        <Button onClick={handleSincronizar} disabled={carregando} className="w-full">
          {carregando ? (
            <><RefreshCw className="mr-2 w-4 h-4 animate-spin" />Importando...</>
          ) : (
            <><RefreshCw className="mr-2 w-4 h-4" />Importar Agora</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
