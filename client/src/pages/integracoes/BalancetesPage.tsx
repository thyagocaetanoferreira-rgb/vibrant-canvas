import { useState, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileArchive, CheckCircle, XCircle, Clock, AlertTriangle, Building2, Play, Zap, BarChart2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

const MESES = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const ANOS = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i));

function statusBadge(status: string) {
  const map: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "destructive" | "secondary" | "outline" }> = {
    pendente:       { label: "Pendente",       icon: <Clock className="w-3 h-3" />,          variant: "secondary" },
    recebida:       { label: "Recebida",       icon: <Clock className="w-3 h-3" />,          variant: "secondary" },
    processando:    { label: "Processando",    icon: <Clock className="w-3 h-3" />,          variant: "secondary" },
    staging_pronta:  { label: "Staging Pronta",  icon: <CheckCircle className="w-3 h-3" />,   variant: "default" },
    concluida:       { label: "Parse OK",        icon: <CheckCircle className="w-3 h-3" />,   variant: "default" },
    analitico_pronto:{ label: "Analítico Pronto",icon: <CheckCircle className="w-3 h-3" />,   variant: "default" },
    erro:           { label: "Erro",           icon: <XCircle className="w-3 h-3" />,       variant: "destructive" },
    substituida:    { label: "Substituída",    icon: <AlertTriangle className="w-3 h-3" />, variant: "outline" },
  };
  const s = map[status] ?? { label: status, icon: null, variant: "secondary" as const };
  return (
    <Badge variant={s.variant} className="gap-1 text-xs">
      {s.icon}{s.label}
    </Badge>
  );
}

function nomeMes(n: number) {
  return MESES.find((m) => m.value === String(n))?.label ?? String(n);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function BalancetesPage() {
  const { municipio } = useAppContext();
  const qc = useQueryClient();

  const [orgaoId, setOrgaoId] = useState("");
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<any>(null);
  const [remessaExpandida, setRemessaExpandida] = useState<number | null>(null);

  const clienteId = municipio?.clienteId ?? null;
  const temTcmgo = !!(municipio?.municipioTcmgoId);

  // ── Órgãos do município ativo ──────────────────────────────────────────
  const { data: orgaos = [] } = useQuery({
    queryKey: ["importacao-orgaos", clienteId],
    queryFn: () => api.get<any[]>(`/tcmgo/importacao/orgaos?cliente_id=${clienteId}`),
    enabled: !!clienteId && temTcmgo,
  });

  // ── Histórico de remessas ──────────────────────────────────────────────
  const { data: remessas = [], isLoading: loadingHistorico } = useQuery({
    queryKey: ["importacao-remessas", clienteId, orgaoId],
    queryFn: () => {
      let url = `/tcmgo/importacao/remessas?cliente_id=${clienteId}`;
      if (orgaoId) url += `&orgao_id=${orgaoId}`;
      return api.get<any[]>(url);
    },
    enabled: !!clienteId && temTcmgo,
  });

  // ── Upload ─────────────────────────────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!arquivo || !clienteId || !orgaoId || !ano || !mes) {
        throw new Error("Preencha todos os campos e selecione o arquivo ZIP.");
      }

      const formData = new FormData();
      formData.append("arquivo", arquivo);
      formData.append("cliente_id", clienteId);
      formData.append("orgao_id", orgaoId);
      formData.append("ano_referencia", ano);
      formData.append("mes_referencia", mes);

      const token = localStorage.getItem("vh_token");
      const baseUrl = import.meta.env.VITE_API_URL ?? "/api";
      const resp = await fetch(`${baseUrl}/tcmgo/importacao/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.mensagem ?? "Erro no upload");
      return data;
    },
    onSuccess: (data) => {
      setResultado(data);
      setArquivo(null);
      toast.success(`Balancete importado! ${data.total_linhas?.toLocaleString("pt-BR")} linhas gravadas.`);
      qc.invalidateQueries({ queryKey: ["importacao-remessas"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ── Parse ─────────────────────────────────────────────────────────────
  const parseMutation = useMutation({
    mutationFn: async (remessaId: number) => {
      const token = localStorage.getItem("vh_token");
      const baseUrl = import.meta.env.VITE_API_URL ?? "/api";
      const resp = await fetch(`${baseUrl}/tcmgo/importacao/parsear/${remessaId}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.mensagem ?? "Erro no parse");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Parse concluído! ${data.total_parsed?.toLocaleString("pt-BR")} linhas distribuídas.`);
      qc.invalidateQueries({ queryKey: ["importacao-remessas"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ── Processar ETL (stg_* → fato_*) ────────────────────────────────────
  const etlMutation = useMutation({
    mutationFn: async (remessaId: number) => {
      const token = localStorage.getItem("vh_token");
      const baseUrl = import.meta.env.VITE_API_URL ?? "/api";
      const resp = await fetch(`${baseUrl}/tcmgo/importacao/processar/${remessaId}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.mensagem ?? "Erro no ETL");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`ETL concluído! ${data.total_inserido?.toLocaleString("pt-BR")} registros nas tabelas analíticas.`);
      qc.invalidateQueries({ queryKey: ["importacao-remessas"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ── Sumário analítico da remessa expandida ─────────────────────────────
  const { data: analitico, isLoading: loadingAnalitico } = useQuery({
    queryKey: ["importacao-analitico", remessaExpandida],
    queryFn: () => api.get<any>(`/tcmgo/importacao/analitico/${remessaExpandida}`),
    enabled: remessaExpandida !== null,
  });

  const temRemessaAtiva = remessas.some(
    (r: any) =>
      r.ativa &&
      String(r.orgao_id) === orgaoId &&
      String(r.ano_referencia) === ano &&
      String(r.mes_referencia) === mes
  );

  const podeEnviar = !!clienteId && temTcmgo && !!orgaoId && !!ano && !!mes && !!arquivo && !uploadMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-primary">Importação de Balancetes</h1>
        <p className="text-muted-foreground mt-1">
          Envie o arquivo ZIP com os TXTs do SIAFIC no layout TCM-GO 2025.
        </p>
      </div>

      {/* Nenhum município selecionado */}
      {!municipio && (
        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertDescription>
            Selecione um município no topo da página para acessar a importação de balancetes.
          </AlertDescription>
        </Alert>
      )}

      {/* Município sem TCM-GO configurado */}
      {municipio && !temTcmgo && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            O município <strong>{municipio.municipioNome}</strong> não possui código TCM-GO configurado.
            Acesse <strong>Configurações → Clientes</strong>, edite o cliente e vincule ao município TCM-GO correspondente.
          </AlertDescription>
        </Alert>
      )}

      {/* Município ativo com TCM-GO */}
      {municipio && temTcmgo && (
        <>
          {/* Indicador do município ativo */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20 w-fit">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{municipio.municipioNome}</span>
            <Badge variant="secondary" className="text-xs ml-1">TCM-GO: {municipio.municipioTcmgoId}</Badge>
          </div>

          {/* Formulário de upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-4 h-4" /> Novo Balancete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                {/* Órgão */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Órgão / Fundo</label>
                  <Select value={orgaoId} onValueChange={setOrgaoId}>
                    <SelectTrigger>
                      <SelectValue placeholder={orgaos.length === 0 ? "Nenhum órgão sincronizado" : "Selecione o órgão"} />
                    </SelectTrigger>
                    <SelectContent>
                      {orgaos.map((o: any) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.codigo_orgao} — {o.descricao_orgao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {orgaos.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Sincronize os órgãos em <strong>Integrações → TCM-GO</strong>.
                    </p>
                  )}
                </div>

                {/* Ano */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Ano de Referência</label>
                  <Select value={ano} onValueChange={setAno}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ANOS.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Mês */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Competência (Mês)</label>
                  <Select value={mes} onValueChange={setMes}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MESES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seleção de arquivo */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Arquivo ZIP</label>
                <label className="flex items-center gap-3 px-4 py-3 rounded-md border border-dashed border-input bg-background cursor-pointer hover:bg-accent transition-colors w-full sm:w-96">
                  <FileArchive className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">
                    {arquivo ? arquivo.name : "Clique para selecionar o arquivo ZIP"}
                  </span>
                  <input
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => {
                      setArquivo(e.target.files?.[0] ?? null);
                      setResultado(null);
                    }}
                  />
                </label>
                {arquivo && (
                  <p className="text-xs text-muted-foreground">
                    {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>

              {/* Alerta de reimportação */}
              {temRemessaAtiva && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Já existe uma remessa ativa para este período. O envio irá substituí-la e inativar a versão atual.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={!podeEnviar}
                className="w-full sm:w-auto"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Processando…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar Balancete
                  </>
                )}
              </Button>

              {/* Resultado do upload */}
              {resultado && (
                <div className="rounded-md border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 space-y-2">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {resultado.mensagem}
                  </p>
                  <div className="text-xs text-green-700 dark:text-green-400 space-y-0.5">
                    <p>Remessa ID: <strong>{resultado.remessa_id}</strong></p>
                    <p>Arquivos processados: <strong>{resultado.total_arquivos}</strong></p>
                    <p>Total de linhas: <strong>{resultado.total_linhas?.toLocaleString("pt-BR")}</strong></p>
                  </div>
                  {resultado.arquivos?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {resultado.arquivos.map((a: any) => (
                        <Badge key={a.sigla} variant="secondary" className="text-xs">
                          {a.sigla}: {a.total_linhas?.toLocaleString("pt-BR")} linhas
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico de remessas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Remessas</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHistorico ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Carregando…</p>
              ) : remessas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma remessa encontrada para este município.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Órgão</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Versão</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Linhas</TableHead>
                        <TableHead>Importado por</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {remessas.map((r: any) => (
                        <Fragment key={r.id}>
                          <TableRow className={r.ativa ? "" : "opacity-50"}>
                            <TableCell className="font-mono text-xs">{r.id}</TableCell>
                            <TableCell className="text-xs max-w-[160px] truncate">{r.descricao_orgao}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">
                              {nomeMes(r.mes_referencia)}/{r.ano_referencia}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">v{r.versao}</Badge>
                            </TableCell>
                            <TableCell>{statusBadge(r.status)}</TableCell>
                            <TableCell className="text-xs">
                              {r.total_linhas != null ? r.total_linhas.toLocaleString("pt-BR") : "—"}
                            </TableCell>
                            <TableCell className="text-xs">{r.importado_por_nome ?? "—"}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">
                              {formatDate(r.iniciado_em)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {r.status === "staging_pronta" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    disabled={parseMutation.isPending || etlMutation.isPending}
                                    onClick={() => parseMutation.mutate(r.id)}
                                  >
                                    {parseMutation.isPending ? (
                                      <Clock className="w-3 h-3 mr-1 animate-spin" />
                                    ) : (
                                      <Play className="w-3 h-3 mr-1" />
                                    )}
                                    Parsear
                                  </Button>
                                )}
                                {(r.status === "concluida" || r.status === "analitico_pronto") && (
                                  <Button
                                    size="sm"
                                    variant={r.status === "analitico_pronto" ? "outline" : "default"}
                                    className="h-7 text-xs"
                                    disabled={etlMutation.isPending || parseMutation.isPending}
                                    onClick={() => etlMutation.mutate(r.id)}
                                  >
                                    {etlMutation.isPending ? (
                                      <Clock className="w-3 h-3 mr-1 animate-spin" />
                                    ) : (
                                      <Zap className="w-3 h-3 mr-1" />
                                    )}
                                    {r.status === "analitico_pronto" ? "Reprocessar ETL" : "Processar ETL"}
                                  </Button>
                                )}
                                {r.status === "analitico_pronto" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => setRemessaExpandida(remessaExpandida === r.id ? null : r.id)}
                                  >
                                    {remessaExpandida === r.id ? (
                                      <ChevronDown className="w-3 h-3 mr-1" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 mr-1" />
                                    )}
                                    <BarChart2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {remessaExpandida === r.id && (
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={9} className="p-4">
                                {loadingAnalitico ? (
                                  <p className="text-xs text-muted-foreground">Carregando sumário…</p>
                                ) : analitico ? (
                                  <AnaliticoSumario data={analitico} />
                                ) : null}
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Componente: sumário analítico expandível ──────────────────────────────
function AnaliticoSumario({ data }: { data: any }) {
  const { sumario } = data;
  if (!sumario) return null;

  const brl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const cards = [
    {
      label: "Empenhos",
      count: sumario.empenho.count,
      linhas: [
        { label: "Empenhado",  value: brl(sumario.empenho.total_empenhado) },
        { label: "Anulado",    value: brl(sumario.anulacao_empenho.total_anulado) },
        { label: "Líquido",    value: brl(sumario.empenho.total_empenhado - sumario.anulacao_empenho.total_anulado) },
      ],
    },
    {
      label: "Liquidações",
      count: sumario.liquidacao.count,
      linhas: [
        { label: "Liquidado", value: brl(sumario.liquidacao.total_liquidado) },
      ],
    },
    {
      label: "Pagamentos",
      count: sumario.pagamento.count,
      linhas: [
        { label: "Pago", value: brl(sumario.pagamento.total_pago) },
      ],
    },
    {
      label: "Receitas",
      count: sumario.receita.count,
      linhas: [
        { label: "Previsto",    value: brl(sumario.receita.total_previsto) },
        { label: "Arrecadado",  value: brl(sumario.receita.total_arrecadado) },
      ],
    },
    {
      label: "Restos a Pagar",
      count: sumario.restos_pagar.count,
      linhas: [
        { label: "Inscrito", value: brl(sumario.restos_pagar.total_inscrito) },
        { label: "Pago",     value: brl(sumario.restos_pagar.total_pago) },
      ],
    },
    {
      label: "Extraorçamentário",
      count: sumario.extraorcamentario.count,
      linhas: [
        { label: "Total", value: brl(sumario.extraorcamentario.total_movimento) },
      ],
    },
    {
      label: "Lançamentos Contábeis",
      count: sumario.lancamento_contabil.count,
      linhas: [],
    },
    {
      label: "Movimentações Bancárias",
      count: sumario.movimentacao_bancaria.count,
      linhas: [],
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-primary">Resumo Analítico</span>
      </div>
      <Separator />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-md border bg-background p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
            <p className="text-lg font-bold text-foreground">{c.count.toLocaleString("pt-BR")}</p>
            {c.linhas.map((l) => (
              <p key={l.label} className="text-xs text-muted-foreground">
                {l.label}: <span className="font-medium text-foreground">{l.value}</span>
              </p>
            ))}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Endpoints Power BI disponíveis em{" "}
        <code className="bg-muted px-1 rounded text-xs">/api/tcmgo/pbi/&lt;view&gt;?cliente_id=…&amp;ano=…&amp;mes=…</code>
      </p>
    </div>
  );
}
