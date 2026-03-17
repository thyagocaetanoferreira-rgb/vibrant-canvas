import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, RefreshCw, CheckCircle2, XCircle,
  MinusCircle, ShieldCheck, Search, Download,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Definição dos requisitos
// ─────────────────────────────────────────────────────────────
interface ReqDef {
  cod: string;
  campo: string;
  descricao: string;
  grupo: string;
  grupoCor: string;
}

const REQUISITOS: ReqDef[] = [
  // Grupo 1
  { cod: "1.1", campo: "req_1_1", descricao: "Regularidade Cadastral (CNPJ)",           grupo: "1", grupoCor: "#3b82f6" },
  { cod: "1.2", campo: "req_1_2", descricao: "Regularidade Fiscal Federal",              grupo: "1", grupoCor: "#3b82f6" },
  { cod: "1.3", campo: "req_1_3", descricao: "Regularidade Previdenciária",              grupo: "1", grupoCor: "#3b82f6" },
  { cod: "1.4", campo: "req_1_4", descricao: "Regularidade Trabalhista (FGTS)",          grupo: "1", grupoCor: "#3b82f6" },
  { cod: "1.5", campo: "req_1_5", descricao: "Regularidade perante TCE/TCM/TCU",         grupo: "1", grupoCor: "#3b82f6" },
  // Grupo 2
  { cod: "2.1.1", campo: "req_2_1_1", descricao: "Dívida Ativa da União",               grupo: "2", grupoCor: "#8b5cf6" },
  { cod: "2.1.2", campo: "req_2_1_2", descricao: "Parcelamentos perante a PGFN",        grupo: "2", grupoCor: "#8b5cf6" },
  // Grupo 3
  { cod: "3.1.1", campo: "req_3_1_1", descricao: "Desp. Pessoal Executivo (LRF)",       grupo: "3", grupoCor: "#f59e0b" },
  { cod: "3.1.2", campo: "req_3_1_2", descricao: "Desp. Pessoal Legislativo (LRF)",     grupo: "3", grupoCor: "#f59e0b" },
  { cod: "3.2.1", campo: "req_3_2_1", descricao: "Operações de Crédito",                grupo: "3", grupoCor: "#f59e0b" },
  { cod: "3.2.2", campo: "req_3_2_2", descricao: "Concessão de Garantias",              grupo: "3", grupoCor: "#f59e0b" },
  { cod: "3.2.3", campo: "req_3_2_3", descricao: "Restos a Pagar",                      grupo: "3", grupoCor: "#f59e0b" },
  { cod: "3.2.4", campo: "req_3_2_4", descricao: "Dívida Consolidada Líquida",          grupo: "3", grupoCor: "#f59e0b" },
  { cod: "3.3",   campo: "req_3_3",   descricao: "RREO e RGF",                          grupo: "3", grupoCor: "#f59e0b" },
  { cod: "3.4.1", campo: "req_3_4_1", descricao: "Prest. Contas TCE/TCM",               grupo: "3", grupoCor: "#f59e0b" },
  { cod: "3.4.2", campo: "req_3_4_2", descricao: "Prest. Contas TCU",                   grupo: "3", grupoCor: "#f59e0b" },
  { cod: "3.5",   campo: "req_3_5",   descricao: "Aplicação em Saúde (SIOPS)",          grupo: "3", grupoCor: "#f59e0b" },
  { cod: "3.6",   campo: "req_3_6",   descricao: "Aplicação em Educação (SIOPE)",       grupo: "3", grupoCor: "#f59e0b" },
  { cod: "3.7",   campo: "req_3_7",   descricao: "Alimentação Escolar (PNAE)",          grupo: "3", grupoCor: "#f59e0b" },
  // Grupo 4
  { cod: "4.1", campo: "req_4_1", descricao: "Adesão ao SNHIS",                         grupo: "4", grupoCor: "#10b981" },
  { cod: "4.2", campo: "req_4_2", descricao: "Fundo Municipal de Habitação",            grupo: "4", grupoCor: "#10b981" },
  // Grupo 5
  { cod: "5.1", campo: "req_5_1", descricao: "Requisito 5.1",                           grupo: "5", grupoCor: "#6b7280" },
  { cod: "5.2", campo: "req_5_2", descricao: "Requisito 5.2",                           grupo: "5", grupoCor: "#6b7280" },
  { cod: "5.3", campo: "req_5_3", descricao: "Requisito 5.3",                           grupo: "5", grupoCor: "#6b7280" },
  { cod: "5.4", campo: "req_5_4", descricao: "Requisito 5.4",                           grupo: "5", grupoCor: "#6b7280" },
  { cod: "5.5", campo: "req_5_5", descricao: "Requisito 5.5",                           grupo: "5", grupoCor: "#6b7280" },
  { cod: "5.6", campo: "req_5_6", descricao: "Requisito 5.6",                           grupo: "5", grupoCor: "#6b7280" },
  { cod: "5.7", campo: "req_5_7", descricao: "Requisito 5.7",                           grupo: "5", grupoCor: "#6b7280" },
];

const GRUPOS = [
  { id: "1", nome: "Fiscal e Cadastral",  cor: "#3b82f6" },
  { id: "2", nome: "Adimplência União",   cor: "#8b5cf6" },
  { id: "3", nome: "LRF e Prest. Contas", cor: "#f59e0b" },
  { id: "4", nome: "Habitação",           cor: "#10b981" },
  { id: "5", nome: "Outros",              cor: "#6b7280" },
];

const UF_MAP: Record<number, string> = {
  11:"RO",12:"AC",13:"AM",14:"RR",15:"PA",16:"AP",17:"TO",21:"MA",22:"PI",
  23:"CE",24:"RN",25:"PB",26:"PE",27:"AL",28:"SE",29:"BA",31:"MG",32:"ES",
  33:"RJ",35:"SP",41:"PR",42:"SC",43:"RS",50:"MS",51:"MT",52:"GO",53:"DF",
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
type ItemStatus = "regular" | "irregular" | "nao_avaliado";

function getStatus(valor: string | null): ItemStatus {
  if (!valor) return "nao_avaliado";
  if (valor === "!") return "irregular";
  return "regular";
}

function conformidade(row: any): number {
  const statuses = REQUISITOS.map((r) => getStatus(row[r.campo]));
  const avaliados = statuses.filter((s) => s !== "nao_avaliado").length;
  if (!avaliados) return 0;
  const ok = statuses.filter((s) => s === "regular").length;
  return Math.round((ok / avaliados) * 100);
}

function irregularCount(row: any): number {
  return REQUISITOS.filter((r) => getStatus(row[r.campo]) === "irregular").length;
}

// ─────────────────────────────────────────────────────────────
// Célula da matriz
// ─────────────────────────────────────────────────────────────
function CellDot({ valor, title }: { valor: string | null; title: string }) {
  const status = getStatus(valor);
  const base = "w-6 h-6 rounded-full flex items-center justify-center cursor-default transition-transform hover:scale-125";
  if (status === "regular")   return <div className={`${base} bg-green-500`} title={`✔ Regular — ${title}${valor ? `\nValidade: ${valor}` : ""}`}><CheckCircle2 className="w-3.5 h-3.5 text-white" /></div>;
  if (status === "irregular") return <div className={`${base} bg-red-500`}   title={`✖ Irregular — ${title}`}><XCircle className="w-3.5 h-3.5 text-white" /></div>;
  return <div className={`${base} bg-gray-200`} title={`— Não Avaliado — ${title}`}><MinusCircle className="w-3 h-3 text-gray-400" /></div>;
}

// ─────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────
export default function CaucGeralPage() {
  const navigate = useNavigate();
  const [dados, setDados]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca]   = useState("");
  const [filtroUF, setFiltroUF] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  useEffect(() => { fetchDados(); }, []);

  async function fetchDados() {
    setLoading(true);
    try {
      const data = await api.get<any[]>("/siconfi/cauc-geral");
      setDados(data);
    } catch (e: any) {
      setDados([]);
    } finally {
      setLoading(false);
    }
  }

  // ── UFs disponíveis ─────────────────────────────────────────
  const ufsDisponiveis = useMemo(() => {
    const set = new Set(dados.map((d) => d.uf || UF_MAP[d.codigo_uf] || "—"));
    return Array.from(set).filter(Boolean).sort();
  }, [dados]);

  // ── Dados filtrados ─────────────────────────────────────────
  const filtrados = useMemo(() => {
    return dados.filter((row) => {
      if (busca && !row.municipio_nome?.toLowerCase().includes(busca.toLowerCase())) return false;
      const uf = row.uf || UF_MAP[row.codigo_uf] || "";
      if (filtroUF !== "todas" && uf !== filtroUF) return false;
      if (filtroStatus === "irregular" && irregularCount(row) === 0) return false;
      if (filtroStatus === "regular"   && (irregularCount(row) > 0 || !row.situacao_global)) return false;
      if (filtroStatus === "sem_dados" && row.situacao_global) return false;
      return true;
    });
  }, [dados, busca, filtroUF, filtroStatus]);

  // ── Métricas globais ─────────────────────────────────────────
  const metricas = useMemo(() => {
    const comDados   = dados.filter((d) => !!d.situacao_global);
    const regulares  = comDados.filter((d) => d.situacao_global === "Regular").length;
    const irregulares = comDados.filter((d) => d.situacao_global === "Irregular").length;
    const semDados   = dados.filter((d) => !d.situacao_global).length;
    const totalIrreg = dados.reduce((acc, d) => acc + irregularCount(d), 0);
    return { total: dados.length, regulares, irregulares, semDados, totalIrreg };
  }, [dados]);

  // ── Export CSV ───────────────────────────────────────────────
  function exportarCSV() {
    const header = ["Município", "UF", "Situação", "Conformidade(%)", ...REQUISITOS.map((r) => r.cod)];
    const linhas = filtrados.map((row) => {
      const uf = row.uf || UF_MAP[row.codigo_uf] || "—";
      return [
        row.municipio_nome,
        uf,
        row.situacao_global || "Sem dados",
        conformidade(row),
        ...REQUISITOS.map((r) => row[r.campo] || ""),
      ].join(";");
    });
    const csv = [header.join(";"), ...linhas].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "cauc-geral.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5 pb-10">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span className="hover:underline cursor-pointer" onClick={() => navigate("/relatorios")}>Relatórios</span>
            <span>/</span>
            <span className="text-foreground font-medium">CAUC Geral</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-primary flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" />
            CAUC Geral — Municípios Clientes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Situação CAUC de todos os municípios clientes ativos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/relatorios")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <Button variant="outline" size="sm" onClick={fetchDados} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportarCSV} disabled={loading || filtrados.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* ── Cards de resumo ── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-2xl font-bold">{metricas.total}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Clientes ativos</div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/40">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-2xl font-bold text-green-600">{metricas.regulares}</div>
              <div className="text-xs text-green-600 mt-0.5">Regulares</div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/40">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-2xl font-bold text-red-600">{metricas.irregulares}</div>
              <div className="text-xs text-red-600 mt-0.5">Com restrições</div>
            </CardContent>
          </Card>
          <Card className="border-red-100 bg-red-50/20">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-2xl font-bold text-red-400">{metricas.totalIrreg}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Total pendências</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-2xl font-bold text-muted-foreground">{metricas.semDados}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Sem dados CAUC</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar município..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8 w-52"
          />
        </div>
        <Select value={filtroUF} onValueChange={setFiltroUF}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="UF" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as UFs</SelectItem>
            {ufsDisponiveis.map((uf) => (
              <SelectItem key={uf} value={uf}>{uf}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as situações</SelectItem>
            <SelectItem value="irregular">Com restrições</SelectItem>
            <SelectItem value="regular">Regulares</SelectItem>
            <SelectItem value="sem_dados">Sem dados CAUC</SelectItem>
          </SelectContent>
        </Select>
        {(busca || filtroUF !== "todas" || filtroStatus !== "todos") && (
          <Button variant="ghost" size="sm" onClick={() => { setBusca(""); setFiltroUF("todas"); setFiltroStatus("todos"); }}>
            Limpar filtros
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtrados.length} de {dados.length} municípios
        </span>
      </div>

      {/* ── Legenda ── */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-green-500 inline-block" /> Regular</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-red-500 inline-block" /> Irregular</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-gray-200 inline-block" /> Não Avaliado</span>
        <span className="ml-2 italic">Passe o cursor sobre o ícone para ver a data de validade</span>
      </div>

      {/* ── Tabela matriz ── */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum município encontrado com os filtros aplicados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                {/* Linha de grupos */}
                <tr className="border-b bg-gray-50">
                  <th rowSpan={2} className="sticky left-0 z-20 bg-gray-50 text-left px-4 py-3 font-semibold text-foreground border-r min-w-[200px]">
                    Município
                  </th>
                  <th rowSpan={2} className="sticky left-[200px] z-20 bg-gray-50 text-center px-2 py-3 font-semibold text-foreground border-r w-10">
                    UF
                  </th>
                  <th rowSpan={2} className="sticky left-[248px] z-20 bg-gray-50 text-center px-2 py-3 font-semibold text-foreground border-r w-24">
                    Situação
                  </th>
                  <th rowSpan={2} className="bg-gray-50 text-center px-2 py-3 font-semibold text-foreground border-r w-16 text-xs">
                    Conf.%
                  </th>
                  {GRUPOS.map((g) => {
                    const cols = REQUISITOS.filter((r) => r.grupo === g.id).length;
                    return (
                      <th
                        key={g.id}
                        colSpan={cols}
                        className="text-center px-1 py-2 text-xs font-semibold border-r last:border-r-0"
                        style={{ borderBottom: `3px solid ${g.cor}`, color: g.cor }}
                      >
                        Grupo {g.id} — {g.nome}
                      </th>
                    );
                  })}
                </tr>
                {/* Linha de códigos dos requisitos */}
                <tr className="border-b bg-white">
                  {REQUISITOS.map((r) => (
                    <th
                      key={r.campo}
                      className="text-center px-1 py-2 font-mono text-xs text-muted-foreground w-10 border-r last:border-r-0"
                      title={r.descricao}
                      style={{ borderTop: `2px solid ${r.grupoCor}20` }}
                    >
                      {r.cod}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtrados.map((row, idx) => {
                  const uf = row.uf || UF_MAP[row.codigo_uf] || "—";
                  const conf = conformidade(row);
                  const irreg = irregularCount(row);
                  const semDados = !row.situacao_global;

                  return (
                    <tr
                      key={row.cliente_id}
                      className={`transition-colors ${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      } hover:bg-blue-50/30`}
                    >
                      {/* Município — fixo */}
                      <td className={`sticky left-0 z-10 px-4 py-2.5 font-medium border-r ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                        <button
                          className="hover:text-primary hover:underline text-left transition-colors"
                          onClick={() => navigate(`/relatorios/cauc`)}
                          title="Ver painel CAUC individual"
                        >
                          {row.municipio_nome}
                        </button>
                      </td>
                      {/* UF — fixo */}
                      <td className={`sticky left-[200px] z-10 px-2 py-2.5 text-center font-mono text-xs text-muted-foreground border-r ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                        {uf}
                      </td>
                      {/* Situação — fixo */}
                      <td className={`sticky left-[248px] z-10 px-2 py-2.5 text-center border-r ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                        {semDados ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : irreg > 0 ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700 whitespace-nowrap">
                            <XCircle className="w-3 h-3" /> {irreg} irreg.
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3" /> OK
                          </span>
                        )}
                      </td>
                      {/* Conformidade */}
                      <td className="px-2 py-2.5 text-center border-r">
                        {semDados ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <span className={`text-xs font-semibold ${conf >= 90 ? "text-green-600" : conf >= 70 ? "text-yellow-600" : "text-red-600"}`}>
                            {conf}%
                          </span>
                        )}
                      </td>
                      {/* Requisitos */}
                      {REQUISITOS.map((r) => (
                        <td key={r.campo} className="px-1 py-2 text-center border-r last:border-r-0">
                          <div className="flex justify-center">
                            <CellDot valor={semDados ? null : row[r.campo]} title={r.descricao} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Rodapé técnico ── */}
      {!loading && dados.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-3 px-5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">Fonte:</span> STN — Tesouro Transparente.
            {" "}Dados importados via integração SICONFI.
            {" "}<span className="italic">
              ⚠️ As informações refletem a data da última importação. Consulte sempre o portal oficial para decisões que envolvam transferências voluntárias.
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
