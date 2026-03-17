import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function SincronizacaoPpaLoaCard() {
  const { usuario } = useAppContext();
  const [carregando, setCarregando] = useState(false);
  const [anoSelecionado, setAnoSelecionado] = useState(String(new Date().getFullYear()));
  const [ultimoLog, setUltimoLog] = useState<{ status: string; total_registros: number; finalizado_em: string } | null>(null);
  const [resumo, setResumo] = useState<{ total: number; enviados: number; pendentes: number } | null>(null);

  useEffect(() => {
    carregarUltimoLog();
    carregarResumo();
  }, [anoSelecionado]);

  async function carregarUltimoLog() {
    api.get<any[]>("/tcmgo/sync-log?tipo=ppa_loa&status=sucesso&limit=1")
      .then((data) => { if (data[0]) setUltimoLog(data[0]); })
      .catch(() => {});
  }

  async function carregarResumo() {
    api.get<{ total: number; enviados: number; pendentes: number }>(`/tcmgo/ppaloa-status?ano=${anoSelecionado}`)
      .then(setResumo)
      .catch(() => {});
  }

  async function handleSincronizar() {
    setCarregando(true);
    try {
      const data = await api.post<any>("/tcmgo/verificar-ppaloa", {
        usuario_id: usuario?.id,
        ano_referencia: parseInt(anoSelecionado),
      });
      if (!data?.sucesso) throw new Error(data?.mensagem ?? "Erro desconhecido");
      toast.success(`✅ ${data.mensagem}`);
      setUltimoLog({ status: "sucesso", total_registros: data.total_verificados, finalizado_em: new Date().toISOString() });
      carregarResumo();
    } catch (erro: any) {
      toast.error(`❌ Erro: ${erro.message}`);
    } finally {
      setCarregando(false);
    }
  }

  const anoAtual = new Date().getFullYear();
  const anos = Array.from({ length: 5 }, (_, i) => String(anoAtual - i));

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <CardTitle className="text-base font-semibold">PPA/LOA Eletrônico — TCM-GO</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Fonte: ws.tcm.go.gov.br</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Verifica se o PPA e a LOA de cada município cliente foram enviados ao Tribunal de Contas de Goiás.
        </p>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Ano de Referência</label>
          <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {anos.map((ano) => <SelectItem key={ano} value={ano}>{ano}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {resumo && resumo.total > 0 && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-lg font-bold text-foreground">{resumo.total}</div>
              <div className="text-xs text-muted-foreground">Verificados</div>
            </div>
            <div className="bg-accent/10 rounded-lg p-2">
              <div className="text-lg font-bold text-accent">{resumo.enviados}</div>
              <div className="text-xs text-muted-foreground">Enviados</div>
            </div>
            <div className="bg-destructive/10 rounded-lg p-2">
              <div className="text-lg font-bold text-destructive">{resumo.pendentes}</div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </div>
          </div>
        )}
        {ultimoLog && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex items-center gap-2 text-accent-foreground font-medium">
              <CheckCircle className="w-4 h-4 text-accent" />
              Última verificação: {formatarData(ultimoLog.finalizado_em)}
            </div>
            <div className="text-muted-foreground">Total verificado: <strong>{ultimoLog.total_registros} municípios</strong></div>
          </div>
        )}
        <Button onClick={handleSincronizar} disabled={carregando} className="w-full">
          {carregando ? <><RefreshCw className="mr-2 w-4 h-4 animate-spin" />Verificando...</> : <><RefreshCw className="mr-2 w-4 h-4" />Verificar Agora</>}
        </Button>
        <p className="text-xs text-muted-foreground text-center">A verificação é manual. Clique no botão para buscar dados atualizados.</p>
      </CardContent>
    </Card>
  );
}
