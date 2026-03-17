import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, CheckCircle, FileCheck } from "lucide-react";
import { toast } from "sonner";

interface UltimoLog {
  status: string;
  total_registros: number;
  finalizado_em: string;
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function SincronizacaoBalancetesCard() {
  const { usuario } = useAppContext();
  const [carregando, setCarregando] = useState(false);
  const [ultimoLog, setUltimoLog] = useState<UltimoLog | null>(null);

  const anoAtual = new Date().getFullYear();
  const anos = Array.from({ length: 6 }, (_, i) => anoAtual - i);
  const [anoSelecionado, setAnoSelecionado] = useState(String(anoAtual));

  useEffect(() => {
    api.get<UltimoLog[]>("/tcmgo/sync-log?tipo=balancetes&status=sucesso&limit=1")
      .then((data) => { if (data[0]) setUltimoLog(data[0]); })
      .catch(() => {});
  }, []);

  async function handleSincronizar() {
    setCarregando(true);
    try {
      const data = await api.post<any>("/tcmgo/verificar-balancetes", {
        usuario_id: usuario?.id,
        ano_referencia: Number(anoSelecionado),
      });
      if (!data?.sucesso) throw new Error(data?.mensagem ?? "Erro desconhecido");
      toast.success(`✅ ${data.mensagem}`);
      setUltimoLog({ status: "sucesso", total_registros: data.total, finalizado_em: new Date().toISOString() });
    } catch (erro: any) {
      toast.error(`❌ Erro: ${erro.message}`);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <CardTitle className="text-base font-semibold">Balancetes TCM-GO</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Fonte: ws.tcm.go.gov.br</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Verifica automaticamente se os balancetes eletrônicos de todos os órgãos dos clientes ativos foram enviados ao TCM-GO.
        </p>
        <p className="text-sm font-medium text-destructive bg-destructive/10 rounded-md px-3 py-2">
          ⚠️ Pré-requisito: os municípios e órgãos do TCM-GO devem ser importados antes, e os clientes devem estar vinculados ao município TCM-GO.
        </p>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Ano de referência</label>
          <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o ano" />
            </SelectTrigger>
            <SelectContent>
              {anos.map((ano) => (
                <SelectItem key={ano} value={String(ano)}>{ano}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {ultimoLog && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex items-center gap-2 text-accent-foreground font-medium">
              <CheckCircle className="w-4 h-4 text-accent" />
              Última sincronização: {formatarData(ultimoLog.finalizado_em)}
            </div>
            <div className="text-muted-foreground">
              Total de registros: <strong>{ultimoLog.total_registros} verificações</strong>
            </div>
          </div>
        )}
        <Button onClick={handleSincronizar} disabled={carregando} className="w-full">
          {carregando ? <><RefreshCw className="mr-2 w-4 h-4 animate-spin" />Sincronizando...</> : <><RefreshCw className="mr-2 w-4 h-4" />Sincronizar Agora</>}
        </Button>
        <p className="text-xs text-muted-foreground text-center">A sincronização é manual. Clique no botão para buscar dados atualizados.</p>
      </CardContent>
    </Card>
  );
}
