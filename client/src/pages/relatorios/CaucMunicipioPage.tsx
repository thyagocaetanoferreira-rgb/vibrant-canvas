import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext, MunicipioAtivo } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  MinusCircle, ShieldCheck, ExternalLink, Clock, Building2, MapPin, CalendarDays,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Mapeamento dos grupos e itens do CAUC
// ─────────────────────────────────────────────────────────────
interface CaucItem {
  cod: string;
  campo: string;
  descricao: string;
  orgao: string;
  fundamento: string;
}
interface CaucGrupo {
  id: string;
  nome: string;
  itens: CaucItem[];
}

const CAUC_GRUPOS: CaucGrupo[] = [
  {
    id: "1",
    nome: "Regularidade Fiscal e Cadastral",
    itens: [
      { cod: "1.1", campo: "req_1_1", descricao: "Regularidade Cadastral (CNPJ)", orgao: "Receita Federal", fundamento: "Art. 25, §1º, IV, a, da Lei 8.666/93" },
      { cod: "1.2", campo: "req_1_2", descricao: "Regularidade Fiscal Federal", orgao: "Receita Federal", fundamento: "Art. 25, §1º, IV, b, da Lei 8.666/93" },
      { cod: "1.3", campo: "req_1_3", descricao: "Regularidade Previdenciária (INSS/RPPS)", orgao: "INSS / MPS", fundamento: "Art. 195, §3º, CF/88" },
      { cod: "1.4", campo: "req_1_4", descricao: "Regularidade Trabalhista (FGTS/CADIN)", orgao: "CEF / MTE", fundamento: "Art. 27, IV, da Lei 8.036/90" },
      { cod: "1.5", campo: "req_1_5", descricao: "Regularidade perante TCE/TCM/TCU", orgao: "Tribunal de Contas", fundamento: "Art. 26 e 27 da Lei 8.443/92" },
    ],
  },
  {
    id: "2",
    nome: "Adimplência com a União",
    itens: [
      { cod: "2.1.1", campo: "req_2_1_1", descricao: "Dívida Ativa da União", orgao: "PGFN", fundamento: "Art. 4º, III, da LC 101/2000" },
      { cod: "2.1.2", campo: "req_2_1_2", descricao: "Parcelamentos perante a PGFN", orgao: "PGFN", fundamento: "Port. MF 321/2006" },
    ],
  },
  {
    id: "3",
    nome: "LRF e Prestação de Contas",
    itens: [
      { cod: "3.1.1", campo: "req_3_1_1", descricao: "Despesa com Pessoal — Executivo (LRF)", orgao: "STN", fundamento: "Art. 19 e 20 da LC 101/2000" },
      { cod: "3.1.2", campo: "req_3_1_2", descricao: "Despesa com Pessoal — Legislativo (LRF)", orgao: "STN", fundamento: "Art. 19 e 20 da LC 101/2000" },
      { cod: "3.2.1", campo: "req_3_2_1", descricao: "Operações de Crédito", orgao: "STN", fundamento: "Art. 32 da LC 101/2000" },
      { cod: "3.2.2", campo: "req_3_2_2", descricao: "Concessão de Garantias", orgao: "STN", fundamento: "Art. 40 da LC 101/2000" },
      { cod: "3.2.3", campo: "req_3_2_3", descricao: "Restos a Pagar", orgao: "STN", fundamento: "Art. 42 da LC 101/2000" },
      { cod: "3.2.4", campo: "req_3_2_4", descricao: "Dívida Consolidada Líquida", orgao: "STN", fundamento: "Art. 31 da LC 101/2000" },
      { cod: "3.3",   campo: "req_3_3",   descricao: "RREO e RGF", orgao: "STN", fundamento: "Art. 52 e 55 da LC 101/2000" },
      { cod: "3.4.1", campo: "req_3_4_1", descricao: "Prestação de Contas ao TCE/TCM", orgao: "TCE/TCM", fundamento: "Art. 56 da LC 101/2000" },
      { cod: "3.4.2", campo: "req_3_4_2", descricao: "Prestação de Contas ao TCU", orgao: "TCU", fundamento: "Art. 56 da LC 101/2000" },
      { cod: "3.5",   campo: "req_3_5",   descricao: "Aplicação em Saúde (SIOPS)", orgao: "MS/CONASS", fundamento: "EC 29/2000 e Lei 141/2012" },
      { cod: "3.6",   campo: "req_3_6",   descricao: "Aplicação em Educação (SIOPE)", orgao: "MEC/FNDE", fundamento: "Art. 212 da CF/88" },
      { cod: "3.7",   campo: "req_3_7",   descricao: "Alimentação Escolar (PNAE)", orgao: "FNDE", fundamento: "Lei 11.947/2009" },
    ],
  },
  {
    id: "4",
    nome: "Habitação",
    itens: [
      { cod: "4.1", campo: "req_4_1", descricao: "Adesão ao SNHIS", orgao: "MCidades", fundamento: "Lei 11.124/2005" },
      { cod: "4.2", campo: "req_4_2", descricao: "Fundo Municipal de Habitação (FMHIS)", orgao: "MCidades", fundamento: "Art. 12 da Lei 11.124/2005" },
    ],
  },
  {
    id: "5",
    nome: "Outros Requisitos",
    itens: [
      { cod: "5.1", campo: "req_5_1", descricao: "Requisito 5.1", orgao: "—", fundamento: "—" },
      { cod: "5.2", campo: "req_5_2", descricao: "Requisito 5.2", orgao: "—", fundamento: "—" },
      { cod: "5.3", campo: "req_5_3", descricao: "Requisito 5.3", orgao: "—", fundamento: "—" },
      { cod: "5.4", campo: "req_5_4", descricao: "Requisito 5.4", orgao: "—", fundamento: "—" },
      { cod: "5.5", campo: "req_5_5", descricao: "Requisito 5.5", orgao: "—", fundamento: "—" },
      { cod: "5.6", campo: "req_5_6", descricao: "Requisito 5.6", orgao: "—", fundamento: "—" },
      { cod: "5.7", campo: "req_5_7", descricao: "Requisito 5.7", orgao: "—", fundamento: "—" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// Tipos e helpers
// ─────────────────────────────────────────────────────────────
type ItemStatus = "regular" | "irregular" | "nao_avaliado";

interface CaucData {
  uf: string;
  nome_ente: string;
  codigo_ibge: number;
  codigo_siafi: string;
  regiao: string;
  populacao: number;
  situacao_global: string;
  importado_em: string;
  [key: string]: any;
}

function getItemStatus(valor: string | null): ItemStatus {
  if (!valor) return "nao_avaliado";
  if (valor === "!") return "irregular";
  return "regular";
}

function StatusBadge({ status }: { status: ItemStatus }) {
  if (status === "regular") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle2 className="w-3 h-3" /> Regular
      </span>
    );
  }
  if (status === "irregular") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <XCircle className="w-3 h-3" /> Irregular
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
      <MinusCircle className="w-3 h-3" /> Não Avaliado
    </span>
  );
}

function formatarDataBR(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatPop(n: number | null): string {
  if (!n) return "—";
  return n.toLocaleString("pt-BR") + " hab.";
}

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────
export default function CaucMunicipioPage() {
  const navigate = useNavigate();
  const { municipio, municipiosDisponiveis } = useAppContext();

  // Município selecionado para visualização (pode diferir do contexto global)
  const [municipioVis, setMunicipioVis] = useState<MunicipioAtivo | null>(municipio);

  const [cauc, setCauc] = useState<CaucData | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Filtro de status na listagem
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");

  useEffect(() => {
    if (!municipioVis) return;
    fetchCauc(municipioVis.clienteId);
  }, [municipioVis]);

  async function fetchCauc(clienteId: string) {
    setLoading(true);
    setErro(null);
    try {
      const data = await api.get<CaucData>(`/siconfi/cauc-status?cliente_id=${clienteId}`);
      if (!data?.codigo_ibge) {
        setErro("Dados do CAUC ainda não importados para este município. Acesse Integrações → SICONFI para importar.");
        setCauc(null);
      } else {
        setCauc(data);
      }
    } catch (e: any) {
      setErro(e.message);
      setCauc(null);
    } finally {
      setLoading(false);
    }
  }

  // ── Cálculo de métricas ─────────────────────────────────────
  const metricas = useMemo(() => {
    if (!cauc) return null;
    const todos = CAUC_GRUPOS.flatMap((g) => g.itens).map((item) => ({
      ...item,
      valor: cauc[item.campo] as string | null,
      status: getItemStatus(cauc[item.campo] as string | null),
    }));
    const regulares = todos.filter((i) => i.status === "regular").length;
    const irregulares = todos.filter((i) => i.status === "irregular").length;
    const naoAvaliados = todos.filter((i) => i.status === "nao_avaliado").length;
    const avaliados = todos.length - naoAvaliados;
    const conformidade = avaliados > 0 ? Math.round((regulares / avaliados) * 100) : 0;
    return { total: todos.length, regulares, irregulares, naoAvaliados, conformidade };
  }, [cauc]);

  // ── Filtro de itens ─────────────────────────────────────────
  function itensDaGrupo(grupo: CaucGrupo) {
    return grupo.itens
      .map((item) => ({
        ...item,
        valor: cauc ? (cauc[item.campo] as string | null) : null,
        status: getItemStatus(cauc ? (cauc[item.campo] as string | null) : null),
      }))
      .filter((item) => {
        if (filtroStatus === "todos") return true;
        if (filtroStatus === "irregular") return item.status === "irregular";
        if (filtroStatus === "regular") return item.status === "regular";
        if (filtroStatus === "nao_avaliado") return item.status === "nao_avaliado";
        return true;
      });
  }

  function countGrupo(grupo: CaucGrupo): Record<ItemStatus, number> {
    const counts: Record<ItemStatus, number> = { regular: 0, irregular: 0, nao_avaliado: 0 };
    grupo.itens.forEach((item) => {
      const s = getItemStatus(cauc ? (cauc[item.campo] as string | null) : null);
      counts[s]++;
    });
    return counts;
  }

  // ── Accordion aberto por padrão nos grupos com pendências ──
  const defaultOpen = useMemo(() => {
    if (!cauc) return [];
    return CAUC_GRUPOS
      .filter((g) => countGrupo(g).irregular > 0)
      .map((g) => g.id);
  }, [cauc]);

  // ── Situação global ─────────────────────────────────────────
  const situacaoGlobal: "regular" | "irregular" | "nao_avaliado" = !cauc
    ? "nao_avaliado"
    : cauc.situacao_global === "Regular"
    ? "regular"
    : "irregular";

  return (
    <div className="space-y-6 pb-10">

      {/* ── Cabeçalho da página ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span className="hover:underline cursor-pointer" onClick={() => navigate("/relatorios")}>Relatórios</span>
            <span>/</span>
            <span className="text-foreground font-medium">Painel CAUC</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-primary flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" />
            Painel CAUC do Município
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhamento da situação cadastral, fiscal e legal para transferências voluntárias
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/relatorios")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => municipioVis && fetchCauc(municipioVis.clienteId)}
            disabled={loading || !municipioVis}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => window.open("https://www.tesourotransparente.gov.br/publicacoes/relatorio-de-situacao-de-varios-entes/2024/114", "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-1" /> Tesouro Transparente
          </Button>
        </div>
      </div>

      {/* ── Seletor de município (multi-município) ── */}
      {municipiosDisponiveis.length > 1 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">Consultar município:</span>
              <Select
                value={municipioVis?.clienteId ?? ""}
                onValueChange={(val) => {
                  const m = municipiosDisponiveis.find((x) => x.clienteId === val);
                  if (m) setMunicipioVis(m);
                }}
              >
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Selecione o município" />
                </SelectTrigger>
                <SelectContent>
                  {municipiosDisponiveis.map((m) => (
                    <SelectItem key={m.clienteId} value={m.clienteId}>
                      {m.municipioNome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Sem município selecionado ── */}
      {!municipioVis && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Nenhum município selecionado. Faça login e selecione um município.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      )}

      {/* ── Erro / sem dados ── */}
      {!loading && erro && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-destructive opacity-70" />
            <p className="text-sm text-destructive">{erro}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/integracoes")}>
              Ir para Integrações
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Conteúdo principal ── */}
      {!loading && cauc && metricas && (
        <>
          {/* ── Cabeçalho executivo do município ── */}
          <Card className="border-2" style={{ borderColor: situacaoGlobal === "regular" ? "#22c55e" : "#ef4444" }}>
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-foreground">{cauc.nome_ente}</h2>
                    <span className="text-muted-foreground font-medium">{cauc.uf}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {cauc.codigo_ibge && (
                      <span><span className="font-medium text-foreground">IBGE:</span> {cauc.codigo_ibge}</span>
                    )}
                    {cauc.codigo_siafi && (
                      <span><span className="font-medium text-foreground">SIAFI:</span> {cauc.codigo_siafi}</span>
                    )}
                    {cauc.regiao && (
                      <span><span className="font-medium text-foreground">Região:</span> {{N:"Norte",NE:"Nordeste",CO:"Centro-Oeste",SE:"Sudeste",S:"Sul"}[cauc.regiao] ?? cauc.regiao}</span>
                    )}
                    {cauc.populacao && (
                      <span><span className="font-medium text-foreground">População:</span> {formatPop(cauc.populacao)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    Dados importados em: {formatarDataBR(cauc.importado_em)}
                  </div>
                </div>
                <div className="flex flex-col items-start md:items-end gap-2">
                  {situacaoGlobal === "regular" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-700 border border-green-300">
                      <CheckCircle2 className="w-4 h-4" /> Regular
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-700 border border-red-300">
                      <XCircle className="w-4 h-4" /> Com Restrições
                    </span>
                  )}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-foreground">{metricas.conformidade}%</div>
                    <div className="text-xs text-muted-foreground">conformidade</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Cards resumo ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <div className="text-3xl font-bold text-foreground">{metricas.total}</div>
                <div className="text-xs text-muted-foreground mt-1">Total de Itens</div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50/40">
              <CardContent className="pt-4 pb-4 text-center">
                <div className="text-3xl font-bold text-green-600">{metricas.regulares}</div>
                <div className="text-xs text-green-600 mt-1">Regulares</div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50/40">
              <CardContent className="pt-4 pb-4 text-center">
                <div className="text-3xl font-bold text-red-600">{metricas.irregulares}</div>
                <div className="text-xs text-red-600 mt-1">Irregulares</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <div className="text-3xl font-bold text-muted-foreground">{metricas.naoAvaliados}</div>
                <div className="text-xs text-muted-foreground mt-1">Não Avaliados</div>
              </CardContent>
            </Card>
          </div>

          {/* ── Alerta de pendências críticas ── */}
          {metricas.irregulares > 0 && (
            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-2 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    <strong>{metricas.irregulares} pendência{metricas.irregulares > 1 ? "s" : ""} irregular{metricas.irregulares > 1 ? "s" : ""}</strong> identificada{metricas.irregulares > 1 ? "s" : ""}.
                    {metricas.irregulares > 0 && " As restrições impedem a habilitação do município para receber transferências voluntárias da União."}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          {/* ── Filtro de status ── */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-muted-foreground">Filtrar:</span>
            {[
              { val: "todos", label: "Todos" },
              { val: "irregular", label: `Irregulares (${metricas.irregulares})` },
              { val: "regular", label: `Regulares (${metricas.regulares})` },
              { val: "nao_avaliado", label: `Não Avaliados (${metricas.naoAvaliados})` },
            ].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => setFiltroStatus(val)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  filtroStatus === val
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Grupos do CAUC (acordeão) ── */}
          <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-3">
            {CAUC_GRUPOS.map((grupo) => {
              const counts = countGrupo(grupo);
              const itens = itensDaGrupo(grupo);
              if (filtroStatus !== "todos" && itens.length === 0) return null;

              return (
                <AccordionItem
                  key={grupo.id}
                  value={grupo.id}
                  className="border rounded-xl px-0 overflow-hidden bg-white"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50 [&[data-state=open]]:bg-gray-50">
                    <div className="flex flex-wrap items-center gap-3 w-full text-left">
                      <span className="font-semibold text-sm">
                        Grupo {grupo.id} — {grupo.nome}
                      </span>
                      <div className="flex items-center gap-1.5 ml-auto mr-4">
                        {counts.irregular > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3" /> {counts.irregular}
                          </span>
                        )}
                        {counts.irregular === 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3" /> OK
                          </span>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-t">
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground w-16">Código</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Descrição</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden md:table-cell">Órgão</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Situação</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground whitespace-nowrap">
                              <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Validade</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {itens.map((item) => (
                            <tr
                              key={item.cod}
                              className={`transition-colors ${
                                item.status === "irregular"
                                  ? "bg-red-50/40 hover:bg-red-50/70"
                                  : "hover:bg-gray-50"
                              }`}
                            >
                              <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{item.cod}</td>
                              <td className="px-4 py-2.5">
                                <div className="font-medium">{item.descricao}</div>
                                <div className="text-xs text-muted-foreground hidden lg:block">{item.fundamento}</div>
                              </td>
                              <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{item.orgao}</td>
                              <td className="px-4 py-2.5">
                                <StatusBadge status={item.status} />
                              </td>
                              <td className="px-4 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                                {item.valor && item.valor !== "!" ? item.valor : "—"}
                              </td>
                            </tr>
                          ))}
                          {itens.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground text-xs">
                                Nenhum item com este status neste grupo
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {/* ── Rodapé técnico ── */}
          <Card className="bg-muted/30">
            <CardContent className="py-4 px-5 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-foreground/70">
                <ShieldCheck className="w-3.5 h-3.5" />
                Informações técnicas
              </div>
              <p>
                <strong>Fonte:</strong> Secretaria do Tesouro Nacional — Tesouro Transparente
                (tesourotransparente.gov.br). Dados do relatório CAUC — Municípios — Abrangência Nacional.
              </p>
              <p><strong>Última importação:</strong> {formatarDataBR(cauc.importado_em)}</p>
              <p><strong>Código IBGE:</strong> {cauc.codigo_ibge} | <strong>SIAFI:</strong> {cauc.codigo_siafi}</p>
              <p className="pt-1 text-[11px] leading-relaxed">
                ⚠️ As informações exibidas refletem a situação na data da última importação e podem não corresponder
                à situação atual no CAUC. Consulte sempre o portal oficial para decisões que envolvam
                habilitação de transferências.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
