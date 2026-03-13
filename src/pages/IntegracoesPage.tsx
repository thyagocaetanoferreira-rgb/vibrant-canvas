import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle, Building2, Landmark, Search } from "lucide-react";
import SincronizacaoPpaLoaCard from "@/components/integracoes/SincronizacaoPpaLoaCard";
import SincronizacaoBalancetesCard from "@/components/integracoes/SincronizacaoBalancetesCard";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface UltimoLog {
  status: string;
  total_registros: number;
  finalizado_em: string;
  detalhes?: { municipio_nome?: string } | null;
}

interface MunicipioTCMGO {
  id: number;
  descricao: string;
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

function SincronizacaoCard({
  titulo,
  descricao,
  fonte,
  icone: Icone,
  functionName,
  tipoLog,
  labelRegistros,
  aviso,
}: {
  titulo: string;
  descricao: string;
  fonte: string;
  icone: React.ElementType;
  functionName: string;
  tipoLog: string;
  labelRegistros: string;
  aviso?: string;
}) {
  const { usuario } = useAppContext();
  const [carregando, setCarregando] = useState(false);
  const [ultimoLog, setUltimoLog] = useState<UltimoLog | null>(null);

  useEffect(() => {
    async function carregarUltimoLog() {
      let query = supabase
        .from("tcmgo_sync_log")
        .select("status, total_registros, finalizado_em")
        .eq("status", "sucesso")
        .order("finalizado_em", { ascending: false })
        .limit(1);

      if (tipoLog !== "municipios") {
        query = query.eq("tipo", tipoLog);
      }

      const { data } = await query.single();
      if (data) setUltimoLog(data);
    }
    carregarUltimoLog();
  }, [tipoLog]);

  async function handleSincronizar() {
    setCarregando(true);
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { usuario_id: usuario?.id },
      });

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

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <CardTitle className="text-base font-semibold">{titulo}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Fonte: {fonte}</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{descricao}</p>

        {aviso && (
          <p className="text-sm font-medium text-destructive bg-destructive/10 rounded-md px-3 py-2">
            ⚠️ {aviso}
          </p>
        )}

        {ultimoLog && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex items-center gap-2 text-accent-foreground font-medium">
              <CheckCircle className="w-4 h-4 text-accent" />
              Última sincronização: {formatarData(ultimoLog.finalizado_em)}
            </div>
            <div className="text-muted-foreground">
              Total de registros:{" "}
              <strong>
                {ultimoLog.total_registros} {labelRegistros}
              </strong>
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
          A sincronização é manual. Clique no botão para buscar dados atualizados.
        </p>
      </CardContent>
    </Card>
  );
}

function SincronizacaoOrgaosCard() {
  const { usuario } = useAppContext();
  const [carregando, setCarregando] = useState(false);
  const [ultimoLog, setUltimoLog] = useState<UltimoLog | null>(null);

  // Municipality selector state
  const [municipios, setMunicipios] = useState<MunicipioTCMGO[]>([]);
  const [busca, setBusca] = useState("");
  const [municipioSelecionado, setMunicipioSelecionado] = useState<MunicipioTCMGO | null>(null);
  const [popoverAberto, setPopoverAberto] = useState(false);
  const [carregandoMunicipios, setCarregandoMunicipios] = useState(false);

  // Load municipalities from tcmgo_municipios (paginated)
  useEffect(() => {
    async function carregarMunicipios() {
      setCarregandoMunicipios(true);
      const todos: MunicipioTCMGO[] = [];
      const PAGE_SIZE = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data } = await supabase
          .from("tcmgo_municipios")
          .select("id, descricao")
          .order("descricao")
          .range(from, to);

        if (data && data.length > 0) {
          todos.push(...data);
          if (data.length < PAGE_SIZE) hasMore = false;
          page++;
        } else {
          hasMore = false;
        }
      }

      setMunicipios(todos);
      setCarregandoMunicipios(false);
    }
    carregarMunicipios();
  }, []);

  useEffect(() => {
    async function carregarUltimoLog() {
      const { data } = await supabase
        .from("tcmgo_sync_log")
        .select("status, total_registros, finalizado_em, detalhes")
        .eq("status", "sucesso")
        .eq("tipo", "orgaos")
        .order("finalizado_em", { ascending: false })
        .limit(1)
        .single();
      if (data) setUltimoLog(data as UltimoLog);
    }
    carregarUltimoLog();
  }, []);

  const municipiosFiltrados = busca.trim()
    ? municipios.filter((m) =>
        m.descricao.toLowerCase().includes(busca.toLowerCase())
      )
    : municipios;

  async function handleSincronizar() {
    if (!municipioSelecionado) {
      toast.error("Selecione um município antes de sincronizar.");
      return;
    }

    setCarregando(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "sincronizar-tcmgo-orgaos",
        {
          body: {
            usuario_id: usuario?.id,
            municipio_id: municipioSelecionado.id,
          },
        }
      );

      if (error) throw new Error(error.message);
      if (!data?.sucesso) throw new Error(data?.mensagem ?? "Erro desconhecido");

      toast.success(`✅ ${data.mensagem}`);
      setUltimoLog({
        status: "sucesso",
        total_registros: data.total,
        finalizado_em: new Date().toISOString(),
        detalhes: { municipio_nome: municipioSelecionado.descricao },
      });
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
          <Landmark className="w-5 h-5 text-primary" />
        </div>
        <div>
          <CardTitle className="text-base font-semibold">
            Órgãos TCM-GO
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fonte: ws.tcm.go.gov.br
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Importa os órgãos de um município do TCM-GO. Selecione o município
          desejado e clique em sincronizar.
        </p>

        {/* Municipality selector */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Município *
          </label>
          <Popover open={popoverAberto} onOpenChange={setPopoverAberto}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between font-normal"
                disabled={carregandoMunicipios}
              >
                {carregandoMunicipios
                  ? "Carregando municípios..."
                  : municipioSelecionado
                  ? municipioSelecionado.descricao
                  : "Selecione o município"}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <div className="p-2 border-b border-border">
                <Input
                  placeholder="Buscar município..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="h-8"
                  autoFocus
                />
              </div>
              <ScrollArea className="h-[200px]">
                {municipiosFiltrados.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 text-center">
                    Nenhum município encontrado
                  </p>
                ) : (
                  municipiosFiltrados.slice(0, 100).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setMunicipioSelecionado(m);
                        setPopoverAberto(false);
                        setBusca("");
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                        municipioSelecionado?.id === m.id
                          ? "bg-primary/10 text-primary font-medium"
                          : ""
                      }`}
                    >
                      {m.descricao}
                    </button>
                  ))
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        {ultimoLog && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex items-center gap-2 text-accent-foreground font-medium">
              <CheckCircle className="w-4 h-4 text-accent" />
              Última sincronização: {formatarData(ultimoLog.finalizado_em)}
            </div>
            {ultimoLog.detalhes?.municipio_nome && (
              <div className="text-muted-foreground">
                Município: <strong>{ultimoLog.detalhes.municipio_nome}</strong>
              </div>
            )}
            <div className="text-muted-foreground">
              Total de registros:{" "}
              <strong>{ultimoLog.total_registros} órgãos</strong>
            </div>
          </div>
        )}

        <Button
          onClick={handleSincronizar}
          disabled={carregando || !municipioSelecionado}
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
          Selecione um município e clique para importar seus órgãos.
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
        <SincronizacaoCard
          titulo="Municípios TCM-GO"
          descricao="Importa a lista oficial de municípios do Tribunal de Contas de Goiás via API pública. Os dados ficam disponíveis para cruzamento nos módulos Jurídico, Controle de Envios e Gestão de Riscos."
          fonte="ws.tcm.go.gov.br"
          icone={Building2}
          functionName="sincronizar-tcmgo-municipios"
          tipoLog="municipios"
          labelRegistros="municípios"
        />

        <SincronizacaoOrgaosCard />

        <SincronizacaoCard
          titulo="Balancetes TCM-GO"
          descricao="Verifica automaticamente se os balancetes eletrônicos de todos os órgãos dos clientes ativos foram enviados ao TCM-GO. A verificação cobre todos os meses do ano vigente."
          fonte="ws.tcm.go.gov.br"
          icone={FileCheck}
          functionName="verificar-balancetes-tcmgo"
          tipoLog="balancetes"
          labelRegistros="verificações"
          aviso="Pré-requisito: os municípios e órgãos do TCM-GO devem ser importados antes, e os clientes devem estar vinculados ao município TCM-GO."
        />

        <SincronizacaoPpaLoaCard />
      </div>
    </div>
  );
}
