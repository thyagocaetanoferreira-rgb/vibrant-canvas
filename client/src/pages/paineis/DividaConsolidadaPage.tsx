import { useState, useMemo } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  TrendingUp, TrendingDown, Landmark, RefreshCw, ChevronDown,
  FileText, Filter, Scale, AlertTriangle, CheckCircle, AlertCircle,
  Users, Building2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Paleta Verus ──────────────────────────────────────────────────────────────
const COLORS = ["#008ded","#00bfcf","#00e1a4","#045ba3","#2bb0f9","#00aac6","#033e66","#ffb85a"];

const MESES_FULL = ["","Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_ABR  = ["","Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const TIPO_PESSOA: Record<string, string> = {
  "1": "Pessoa Física", "2": "Pessoa Jurídica", "3": "Empresa Estrangeira",
};

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Kpis {
  vl_saldo_anterior: number; vl_contratacao: number; vl_amortizacao: number;
  vl_cancelamento: number;   vl_encampacao: number;  vl_atualizacao: number;
  vl_saldo_atual: number;    qtd_registros: number;
}
interface EvolMes   { mes: number; vl_saldo_atual: number; vl_amortizacao: number; vl_contratacao: number; }
interface PorTipo   { tp_lancamento: string; descricao: string; vl_saldo_atual: number; }
interface ContrAmort{ mes: number; vl_contratacao: number; vl_amortizacao: number; }
interface PorCredor { nome_credor: string; cpf_cnpj_credor: string; tipo_pessoa: string; vl_saldo_atual: number; qtd_registros: number; }
interface PorOrgao  { cod_orgao: string; desc_orgao: string; vl_saldo_atual: number; }
interface Movs      { contratacao: number; amortizacao: number; cancelamento: number; encampacao: number; atualizacao: number; }
interface GradeRow  {
  id: number; mes_referencia: number;
  cod_orgao: string; desc_orgao: string; cod_unidade: string;
  tp_lancamento: string; desc_tipo_divida: string;
  nro_lei_autorizacao: string; dt_lei_autorizacao: string | null;
  nome_credor: string; tipo_pessoa: string; cpf_cnpj_credor: string;
  vl_saldo_anterior: number; vl_contratacao: number; vl_amortizacao: number;
  vl_cancelamento: number;   vl_encampacao: number;  vl_atualizacao: number;
  vl_saldo_atual: number;    vl_saldo_calculado: number; vl_diferenca: number;
}
interface Opcoes {
  meses: number[];
  orgaos: { cod_orgao: string; desc_orgao: string }[];
  tipos:  { codigo: string; descricao: string }[];
}
interface ApiResponse {
  kpis: Kpis; evolucao_mensal: EvolMes[]; por_tipo: PorTipo[];
  contr_amort_mensal: ContrAmort[]; por_credor: PorCredor[]; por_orgao: PorOrgao[];
  movimentacoes: Movs; grade: GradeRow[]; opcoes: Opcoes;
}

// ── Utilitários ───────────────────────────────────────────────────────────────
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt  = (v: number) => BRL.format(v);
const fmtC = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}K`;
  return BRL.format(v);
};
const pct = (a: number, b: number) => b === 0 ? "—" : `${((a / b) * 100).toFixed(1)}%`;

function conferencia(dif: number): { label: string; color: string; icon: React.ElementType } {
  const abs = Math.abs(dif);
  if (abs < 0.01)   return { label: "OK",         color: "#00e1a4", icon: CheckCircle  };
  if (abs < 100)    return { label: "Atenção",     color: "#ffb85a", icon: AlertTriangle};
  return              { label: "Divergente",  color: "#ef4444", icon: AlertCircle  };
}

// ── Tooltip Verus ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e3eef6] rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-[#033e66] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

// ── KpiCard ───────────────────────────────────────────────────────────────────
function fmtAbrev(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (abs >= 1_000)     return `R$ ${(v / 1_000).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}K`;
  return BRL.format(v);
}

function KpiCard({ title, numericValue, icon: Icon, borderColor, loading }: {
  title: string; numericValue: number; icon: React.ElementType;
  borderColor: string; loading?: boolean;
}) {
  return (
    <Card className="bg-white shadow-sm rounded-xl border-0 border-l-4" style={{ borderLeftColor: borderColor }}>
      <CardContent className="p-4 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#045ba3] uppercase tracking-wide truncate">{title}</p>
          {loading ? (
            <>
              <Skeleton className="h-7 w-24 mt-1" />
              <Skeleton className="h-3.5 w-32 mt-1.5" />
            </>
          ) : (
            <>
              <p className="text-lg font-extrabold text-[#033e66] mt-0.5 leading-tight tracking-tight">
                {fmtAbrev(numericValue)}
              </p>
              <p className="text-[11px] text-[#045ba3]/60 mt-0.5 font-medium tabular-nums">
                {BRL.format(numericValue)}
              </p>
            </>
          )}
        </div>
        <div className="ml-3 p-2 rounded-lg" style={{ backgroundColor: `${borderColor}18` }}>
          <Icon className="h-5 w-5" style={{ color: borderColor }} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── MultiSelect meses ─────────────────────────────────────────────────────────
function MesesMultiSelect({ disponiveis, selecionados, onChange }: {
  disponiveis: number[]; selecionados: number[]; onChange: (v: number[]) => void;
}) {
  const label = selecionados.length === 0 ? "Todos os meses"
    : selecionados.length === 1 ? MESES_FULL[selecionados[0]]
    : `${selecionados.length} meses`;
  const toggle = (m: number) =>
    onChange(selecionados.includes(m) ? selecionados.filter((x) => x !== m) : [...selecionados, m].sort((a,b)=>a-b));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 min-w-[160px] justify-between text-sm font-normal border-[#e3eef6] text-[#045ba3]">
          {label}<ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2">
        <p className="text-xs font-semibold text-[#033e66] px-2 pb-1">Selecionar meses</p>
        {(disponiveis.length > 0 ? disponiveis : Array.from({length:12},(_,i)=>i+1)).map((m) => (
          <div key={m} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#e3eef6] cursor-pointer" onClick={() => toggle(m)}>
            <Checkbox checked={selecionados.includes(m)} onCheckedChange={() => toggle(m)} className="h-3.5 w-3.5" />
            <span className="text-sm text-[#045ba3]">{MESES_FULL[m]}</span>
          </div>
        ))}
        {selecionados.length > 0 && (
          <Button variant="ghost" size="sm" className="w-full mt-1 text-xs text-[#008ded]" onClick={() => onChange([])}>
            Limpar seleção
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── SearchableCombobox ────────────────────────────────────────────────────────
function SearchableCombobox({ options, value, onChange, placeholder, width = "w-56" }: {
  options: string[]; value: string; onChange: (v: string) => void;
  placeholder: string; width?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = value || placeholder;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline"
          className={cn("h-9 justify-between text-sm font-normal border-[#e3eef6] text-[#045ba3] truncate", width, value && "text-[#033e66]")}>
          <span className="truncate">{label}</span>
          <div className="flex items-center ml-1 flex-shrink-0">
            {value ? (
              <X className="h-3.5 w-3.5 opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); onChange(""); setOpen(false); }} />
            ) : (
              <ChevronDown className="h-4 w-4 opacity-50" />
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-72" align="start">
        <Command>
          <CommandInput placeholder="Buscar…" className="h-9 text-sm" />
          <CommandList className="max-h-60">
            <CommandEmpty className="py-3 text-center text-xs text-[#045ba3]">Nenhum resultado.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem key={opt} value={opt} onSelect={() => { onChange(opt === value ? "" : opt); setOpen(false); }}
                  className={cn("text-sm cursor-pointer", opt === value && "font-semibold text-[#008ded]")}>
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Sheet detalhe linha ───────────────────────────────────────────────────────
function DetalheSheet({ row, open, onClose }: { row: GradeRow | null; open: boolean; onClose: () => void }) {
  if (!row) return null;
  const conf = conferencia(row.vl_diferenca);
  const ConfIcon = conf.icon;
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-[#033e66]">Detalhamento da Dívida</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Órgão",     row.desc_orgao],
              ["Unidade",   row.cod_unidade],
              ["Tipo",      row.desc_tipo_divida],
              ["Mês Ref.",  MESES_FULL[row.mes_referencia]],
              ["Nº Lei",    row.nro_lei_autorizacao || "—"],
              ["Data Lei",  row.dt_lei_autorizacao ? new Date(row.dt_lei_autorizacao).toLocaleDateString("pt-BR") : "—"],
              ["Credor",    row.nome_credor],
              ["CPF/CNPJ",  row.cpf_cnpj_credor || "—"],
              ["Tipo Pessoa", TIPO_PESSOA[row.tipo_pessoa] ?? row.tipo_pessoa],
            ].map(([k,v]) => (
              <div key={k} className="bg-[#e3eef6]/40 rounded-lg p-3">
                <p className="text-xs text-[#045ba3] font-medium">{k}</p>
                <p className="font-semibold text-[#033e66] text-xs mt-0.5 break-words">{v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[#e3eef6] overflow-hidden">
            {[
              ["Saldo Anterior", row.vl_saldo_anterior, "#008ded"],
              ["Contratação",    row.vl_contratacao,    "#00bfcf"],
              ["Amortização",    row.vl_amortizacao,    "#ffb85a"],
              ["Cancelamento",   row.vl_cancelamento,   "#ffb85a"],
              ["Encampação",     row.vl_encampacao,     "#00aac6"],
              ["Atualização",    row.vl_atualizacao,    "#00e1a4"],
            ].map(([k,v,c]) => (
              <div key={k as string} className="flex justify-between items-center px-4 py-2.5 border-b border-[#e3eef6] last:border-0">
                <span className="text-[#045ba3]">{k as string}</span>
                <span className="font-mono font-semibold" style={{ color: c as string }}>{fmt(v as number)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center px-4 py-2.5 bg-[#e3eef6]/50">
              <span className="font-bold text-[#033e66]">Saldo Atual</span>
              <span className="font-mono font-bold text-[#033e66]">{fmt(row.vl_saldo_atual)}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5">
              <span className="font-bold text-[#033e66]">Saldo Calculado</span>
              <span className="font-mono font-bold text-[#045ba3]">{fmt(row.vl_saldo_calculado)}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5 bg-[#e3eef6]/30 rounded-b-xl">
              <span className="font-bold text-[#033e66]">Diferença</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold" style={{ color: conf.color }}>{fmt(row.vl_diferenca)}</span>
                <Badge style={{ backgroundColor: `${conf.color}20`, color: conf.color, border: "none", fontSize: 11 }}>
                  <ConfIcon className="h-3 w-3 mr-1" />{conf.label}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function DividaConsolidadaPage() {
  const { municipio, anoExercicio } = useAppContext();
  const clienteId = municipio?.clienteId;

  // Filtros
  const [mesesSel, setMesesSel] = useState<number[]>([]);
  const [orgaoSel, setOrgaoSel] = useState("__all__");
  const [tipoSel,  setTipoSel]  = useState("__all__");
  const [credorBusca, setCredorBusca]     = useState("");
  const [tipoPessoaSel, setTipoPessoaSel] = useState("__all__");
  const [nroLeiSel, setNroLeiSel]         = useState("");

  // Aba
  const [aba, setAba] = useState<"gestor" | "contador">("gestor");

  // Drill-down
  const [rowDetalhe, setRowDetalhe] = useState<GradeRow | null>(null);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams({ cliente_id: String(clienteId ?? ""), ano: anoExercicio });
    if (mesesSel.length > 0)    p.set("meses", mesesSel.join(","));
    if (orgaoSel !== "__all__")  p.set("orgao", orgaoSel);
    if (tipoSel  !== "__all__")  p.set("tp_lancamento", tipoSel);
    if (credorBusca.trim())      p.set("credor", credorBusca.trim());
    if (tipoPessoaSel !== "__all__") p.set("tipo_pessoa", tipoPessoaSel);
    if (nroLeiSel.trim())        p.set("nro_lei", nroLeiSel.trim());
    return p.toString();
  }, [clienteId, anoExercicio, mesesSel, orgaoSel, tipoSel, credorBusca, tipoPessoaSel, nroLeiSel]);

  const { data, isLoading, isError, refetch } = useQuery<ApiResponse>({
    queryKey: ["paineis-divida-consolidada", queryParams],
    queryFn: () => api.get(`/paineis/orcamentario/divida-consolidada?${queryParams}`),
    enabled: !!clienteId,
    staleTime: 5 * 60 * 1000,
  });

  const hasData = !!data;

  // Listas derivadas do grade para os comboboxes
  const listaCredores = useMemo(() => {
    const s = new Set((data?.grade ?? []).map((r) => r.nome_credor.trim()).filter(Boolean));
    return Array.from(s).sort();
  }, [data?.grade]);

  const listaLeis = useMemo(() => {
    const s = new Set((data?.grade ?? []).map((r) => r.nro_lei_autorizacao.trim()).filter(Boolean));
    return Array.from(s).sort();
  }, [data?.grade]);
  const kpis = data?.kpis;
  const opcoes = data?.opcoes ?? { meses: [], orgaos: [], tipos: [] };

  // Indicadores estratégicos
  const variacaoAbs = kpis ? kpis.vl_saldo_atual - kpis.vl_saldo_anterior : 0;
  const variacaoPct = kpis && kpis.vl_saldo_anterior > 0
    ? ((variacaoAbs / kpis.vl_saldo_anterior) * 100).toFixed(1) : "—";
  const indiceAmort = kpis && kpis.vl_saldo_anterior > 0
    ? ((kpis.vl_amortizacao / kpis.vl_saldo_anterior) * 100).toFixed(1) : "—";
  const pesoAtualizacao = kpis && kpis.vl_saldo_atual > 0
    ? ((kpis.vl_atualizacao / kpis.vl_saldo_atual) * 100).toFixed(1) : "—";

  // Divergências
  const divergencias = (data?.grade ?? []).filter((r) => Math.abs(r.vl_diferenca) >= 0.01);
  const somaDiverg   = divergencias.reduce((s, r) => s + Math.abs(r.vl_diferenca), 0);

  // Dados gráfico F (movimentações)
  const movsData = data?.movimentacoes ? [
    { name: "Contratação",  value: data.movimentacoes.contratacao,  fill: "#008ded" },
    { name: "Amortização",  value: data.movimentacoes.amortizacao,  fill: "#ffb85a" },
    { name: "Cancelamento", value: data.movimentacoes.cancelamento, fill: "#00bfcf" },
    { name: "Encampação",   value: data.movimentacoes.encampacao,   fill: "#00aac6" },
    { name: "Atualização",  value: data.movimentacoes.atualizacao,  fill: "#00e1a4" },
  ].filter((d) => d.value > 0) : [];

  if (!clienteId) return (
    <div className="rounded-xl border border-[#e3eef6] bg-[#e3eef6]/40 p-12 text-center text-sm text-[#045ba3]">
      Selecione um município para visualizar o painel de Dívida Consolidada.
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-gradient-to-r from-[#045ba3] to-[#008ded]">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#033e66]">Dívida Consolidada</h1>
            <Badge variant="outline" className="text-xs border-[#008ded] text-[#008ded]">DIC</Badge>
          </div>
          <p className="text-sm text-[#045ba3]">
            {municipio?.municipioNome ?? "—"} · Exercício {anoExercicio} · TCM-GO / DIC.10
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}
          className="border-[#008ded] text-[#008ded] hover:bg-[#008ded]/10">
          <RefreshCw className="h-4 w-4 mr-1.5" />Atualizar
        </Button>
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <Card className="bg-white shadow-sm rounded-xl border-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Filter className="h-4 w-4 text-[#008ded]" />
            <span className="text-sm font-semibold text-[#033e66]">Filtros</span>
            {(mesesSel.length > 0 || orgaoSel !== "__all__" || tipoSel !== "__all__" ||
              credorBusca || tipoPessoaSel !== "__all__" || nroLeiSel) && (
              <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs text-[#008ded]"
                onClick={() => {
                  setMesesSel([]); setOrgaoSel("__all__"); setTipoSel("__all__");
                  setCredorBusca(""); setCredorInput(""); setTipoPessoaSel("__all__");
                  setNroLeiSel(""); setNroLeiInput("");
                }}>
                Limpar filtros
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#045ba3] font-medium">Mês</label>
              <MesesMultiSelect disponiveis={opcoes.meses} selecionados={mesesSel} onChange={setMesesSel} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#045ba3] font-medium">Órgão</label>
              <Select value={orgaoSel} onValueChange={setOrgaoSel}>
                <SelectTrigger className="h-9 w-64 text-sm border-[#e3eef6] text-[#045ba3]">
                  <SelectValue placeholder="Todos os órgãos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os órgãos</SelectItem>
                  {opcoes.orgaos.map((o) => (
                    <SelectItem key={o.cod_orgao} value={o.cod_orgao}>{o.desc_orgao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#045ba3] font-medium">Tipo de Lançamento</label>
              <Select value={tipoSel} onValueChange={setTipoSel}>
                <SelectTrigger className="h-9 w-64 text-sm border-[#e3eef6] text-[#045ba3]">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os tipos</SelectItem>
                  {opcoes.tipos.map((t) => (
                    <SelectItem key={t.codigo} value={t.codigo}>{t.codigo} – {t.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#045ba3] font-medium">Tipo de Pessoa</label>
              <Select value={tipoPessoaSel} onValueChange={setTipoPessoaSel}>
                <SelectTrigger className="h-9 w-48 text-sm border-[#e3eef6] text-[#045ba3]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="1">Pessoa Física</SelectItem>
                  <SelectItem value="2">Pessoa Jurídica</SelectItem>
                  <SelectItem value="3">Empresa Estrangeira</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#045ba3] font-medium">Credor</label>
              <SearchableCombobox
                options={listaCredores}
                value={credorBusca}
                onChange={setCredorBusca}
                placeholder="Todos os credores"
                width="w-64"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#045ba3] font-medium">Nº Lei Autorizativa</label>
              <SearchableCombobox
                options={listaLeis}
                value={nroLeiSel}
                onChange={setNroLeiSel}
                placeholder="Todas as leis"
                width="w-44"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Seletor de aba ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-lg bg-[#e3eef6]/60 w-fit">
        {(["gestor","contador"] as const).map((v) => (
          <button key={v} onClick={() => setAba(v)}
            className={cn("px-5 py-1.5 rounded-md text-sm font-medium transition-all",
              aba === v ? "bg-[#008ded] text-white shadow-sm" : "text-[#045ba3] hover:text-[#033e66] hover:bg-[#e3eef6]")}>
            {v === "gestor" ? "Visão Geral" : "Visão Detalhada"}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ABA GESTOR
      ══════════════════════════════════════════════════════════════════════ */}
      {aba === "gestor" && (
        <div className="space-y-5">

          {/* Bloco 1 — KPI Cards */}
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {Array.from({length:6}).map((_,i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <KpiCard title="Saldo Anterior"   numericValue={kpis?.vl_saldo_anterior ?? 0} icon={Landmark}     borderColor="#008ded" loading={isLoading} />
              <KpiCard title="Contratações"     numericValue={kpis?.vl_contratacao   ?? 0} icon={TrendingUp}   borderColor="#ef4444" loading={isLoading} />
              <KpiCard title="Amortizações"     numericValue={kpis?.vl_amortizacao   ?? 0} icon={TrendingDown} borderColor="#00e1a4" loading={isLoading} />
              <KpiCard title="Cancelamentos"    numericValue={kpis?.vl_cancelamento  ?? 0} icon={TrendingDown} borderColor="#00bfcf" loading={isLoading} />
              <KpiCard title="Atualizações"     numericValue={kpis?.vl_atualizacao   ?? 0} icon={TrendingUp}   borderColor="#ffb85a" loading={isLoading} />
              <KpiCard title="Saldo Atual"      numericValue={kpis?.vl_saldo_atual   ?? 0} icon={Scale}        borderColor="#045ba3" loading={isLoading} />
            </div>
          )}

          {/* Indicadores estratégicos */}
          {!isLoading && hasData && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Variação da Dívida", value: fmt(variacaoAbs),
                  sub: variacaoAbs >= 0 ? "Dívida cresceu no período" : "Dívida reduziu no período",
                  color: variacaoAbs <= 0 ? "#00e1a4" : "#ef4444" },
                { label: "% Variação",         value: `${variacaoPct}%`,
                  sub: "Crescimento ou redução relativa",
                  color: variacaoAbs <= 0 ? "#00e1a4" : "#ef4444" },
                { label: "Índice de Amortização", value: `${indiceAmort}%`,
                  sub: "Amortização / Saldo Anterior", color: "#00bfcf" },
                { label: "Peso da Atualização",   value: `${pesoAtualizacao}%`,
                  sub: "Atualização / Saldo Atual",    color: "#ffb85a" },
              ].map((d) => (
                <Card key={d.label} className="bg-white shadow-sm rounded-xl border-0 border-l-4" style={{ borderLeftColor: d.color }}>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-[#045ba3] uppercase tracking-wide">{d.label}</p>
                    <p className="text-xl font-extrabold mt-0.5" style={{ color: d.color }}>{d.value}</p>
                    <p className="text-xs text-[#045ba3]/70 mt-0.5">{d.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Bloco 2 — Gráficos */}
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
            </div>
          ) : hasData && (
            <div className="space-y-5">
              {/* Gráfico A — Evolução mensal saldo atual */}
              <Card className="bg-white shadow-sm rounded-xl border-0">
                <CardHeader className="px-5 pt-5 pb-2">
                  <CardTitle className="text-sm font-bold text-[#033e66]">Evolução Mensal do Saldo da Dívida</CardTitle>
                  <p className="text-xs text-[#045ba3]">Estoque da dívida ao longo dos meses do exercício</p>
                </CardHeader>
                <CardContent className="px-3 pb-4">
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={(data.evolucao_mensal ?? []).map((d) => ({ ...d, name: MESES_ABR[d.mes] }))}>
                      <defs>
                        <linearGradient id="gradDivida" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#045ba3" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#045ba3" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e3eef6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#045ba3" }} />
                      <YAxis tickFormatter={fmtC} tick={{ fontSize: 10, fill: "#045ba3" }} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="vl_saldo_atual" name="Saldo Atual"
                        stroke="#045ba3" fill="url(#gradDivida)" strokeWidth={2} dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Gráfico B — Composição por tipo (donut) */}
                <Card className="bg-white shadow-sm rounded-xl border-0">
                  <CardHeader className="px-5 pt-5 pb-2">
                    <CardTitle className="text-sm font-bold text-[#033e66]">Composição por Tipo de Dívida</CardTitle>
                    <p className="text-xs text-[#045ba3]">Distribuição do saldo atual por classificação</p>
                  </CardHeader>
                  <CardContent className="pb-4">
                    {(data.por_tipo ?? []).length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-sm text-[#045ba3]">Sem dados</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={data.por_tipo} dataKey="vl_saldo_atual" nameKey="descricao"
                            cx="45%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                            {data.por_tipo.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => [fmt(v), "Saldo Atual"]}
                            contentStyle={{ background:"#fff", border:"1px solid #e3eef6", borderRadius:8, fontSize:12 }} />
                          <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10}
                            wrapperStyle={{ fontSize:10, color:"#045ba3", maxWidth:160 }}
                            formatter={(v) => v.length > 28 ? v.slice(0,26)+"…" : v} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Gráfico C — Contratação x Amortização por mês */}
                <Card className="bg-white shadow-sm rounded-xl border-0">
                  <CardHeader className="px-5 pt-5 pb-2">
                    <CardTitle className="text-sm font-bold text-[#033e66]">Contratação × Amortização por Mês</CardTitle>
                    <p className="text-xs text-[#045ba3]">Comparativo mensal de movimentos da dívida</p>
                  </CardHeader>
                  <CardContent className="px-3 pb-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={(data.contr_amort_mensal ?? []).map((d) => ({ ...d, name: MESES_ABR[d.mes] }))}
                        margin={{ right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e3eef6" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#045ba3" }} />
                        <YAxis tickFormatter={fmtC} tick={{ fontSize: 10, fill: "#045ba3" }} width={72} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, color: "#045ba3" }} />
                        <Bar dataKey="vl_contratacao" name="Contratação" fill="#ef4444" maxBarSize={28} radius={[3,3,0,0]} />
                        <Bar dataKey="vl_amortizacao" name="Amortização" fill="#00e1a4" maxBarSize={28} radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Gráfico D — Por credor (barras horizontais) */}
                <Card className="bg-white shadow-sm rounded-xl border-0">
                  <CardHeader className="px-5 pt-5 pb-2">
                    <CardTitle className="text-sm font-bold text-[#033e66]">Principais Credores (Top 10)</CardTitle>
                    <p className="text-xs text-[#045ba3]">Concentração do passivo por credor</p>
                  </CardHeader>
                  <CardContent className="px-3 pb-4">
                    {(data.por_credor ?? []).length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-sm text-[#045ba3]">Sem dados</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart layout="vertical"
                          data={(data.por_credor ?? []).slice(0,10).map((d) => ({
                            name: d.nome_credor.length > 26 ? d.nome_credor.slice(0,24)+"…" : d.nome_credor,
                            value: d.vl_saldo_atual,
                          }))} margin={{ left: 0, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e3eef6" horizontal={false} />
                          <XAxis type="number" tickFormatter={fmtC} tick={{ fontSize: 10, fill: "#045ba3" }} />
                          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fill: "#033e66" }} />
                          <Tooltip content={<CustomTooltip />} formatter={(v: number) => fmt(v)} />
                          <Bar dataKey="value" name="Saldo Atual" radius={[0,4,4,0]}>
                            {(data.por_credor ?? []).slice(0,10).map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Gráfico E — Por órgão */}
                <Card className="bg-white shadow-sm rounded-xl border-0">
                  <CardHeader className="px-5 pt-5 pb-2">
                    <CardTitle className="text-sm font-bold text-[#033e66]">Dívida por Órgão</CardTitle>
                    <p className="text-xs text-[#045ba3]">Concentração do passivo por unidade gestora</p>
                  </CardHeader>
                  <CardContent className="px-3 pb-4">
                    {(data.por_orgao ?? []).length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-sm text-[#045ba3]">Sem dados</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart layout="vertical"
                          data={(data.por_orgao ?? []).map((d) => ({
                            name: d.desc_orgao.length > 26 ? d.desc_orgao.slice(0,24)+"…" : d.desc_orgao,
                            value: d.vl_saldo_atual,
                          }))} margin={{ left: 0, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e3eef6" horizontal={false} />
                          <XAxis type="number" tickFormatter={fmtC} tick={{ fontSize: 10, fill: "#045ba3" }} />
                          <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10, fill: "#033e66" }} />
                          <Tooltip content={<CustomTooltip />} formatter={(v: number) => fmt(v)} />
                          <Bar dataKey="value" name="Saldo Atual" radius={[0,4,4,0]}>
                            {(data.por_orgao ?? []).map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico F — Composição das movimentações */}
              {movsData.length > 0 && (
                <Card className="bg-white shadow-sm rounded-xl border-0">
                  <CardHeader className="px-5 pt-5 pb-2">
                    <CardTitle className="text-sm font-bold text-[#033e66]">Composição das Movimentações da Dívida</CardTitle>
                    <p className="text-xs text-[#045ba3]">Impacto de cada tipo de movimento no período</p>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={movsData} layout="vertical" margin={{ left: 0, right: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e3eef6" horizontal={false} />
                        <XAxis type="number" tickFormatter={fmtC} tick={{ fontSize: 10, fill: "#045ba3" }} />
                        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#033e66" }} />
                        <Tooltip formatter={(v: number) => [fmt(v), "Valor"]}
                          contentStyle={{ background:"#fff", border:"1px solid #e3eef6", borderRadius:8, fontSize:12 }} />
                        <Bar dataKey="value" name="Valor" radius={[0,4,4,0]} maxBarSize={24}>
                          {movsData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ABA CONTADOR
      ══════════════════════════════════════════════════════════════════════ */}
      {aba === "contador" && (
        <div className="space-y-5">

          {/* Bloco 4C — Pendências em destaque */}
          {!isLoading && divergencias.length > 0 && (
            <Card className="bg-white shadow-sm rounded-xl border-0 border-l-4" style={{ borderLeftColor: "#ef4444" }}>
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <AlertCircle className="h-6 w-6 flex-shrink-0" style={{ color: "#ef4444" }} />
                <div className="flex-1">
                  <p className="font-bold text-[#033e66]">
                    {divergencias.length} registro{divergencias.length > 1 ? "s" : ""} com divergência de conferência
                  </p>
                  <p className="text-xs text-[#045ba3] mt-0.5">
                    Soma das divergências: <span className="font-semibold text-[#ef4444]">{fmt(somaDiverg)}</span>
                    {" — "}Saldo Calculado ≠ Saldo Informado. Clique em cada linha para ver o detalhe.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bloco 3 — Grade analítica */}
          <Card className="bg-white shadow-sm rounded-xl border-0">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-base font-bold text-[#033e66] flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#008ded]" />
                Detalhamento da Dívida Consolidada
              </CardTitle>
              <p className="text-xs text-[#045ba3] mt-0.5">
                Clique em uma linha para ver o detalhamento completo e a conferência contábil
              </p>
            </CardHeader>
            <CardContent className="px-0 pb-4">
              {isLoading ? (
                <div className="px-5 space-y-2">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (data?.grade ?? []).length === 0 ? (
                <p className="px-5 py-4 text-sm text-[#045ba3]">Nenhum registro encontrado para os filtros selecionados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
                        <TableHead className="text-[#033e66] font-semibold text-xs whitespace-nowrap">Órgão</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs whitespace-nowrap">Un.</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs whitespace-nowrap">Tipo</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs whitespace-nowrap">Credor</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs whitespace-nowrap">Nº Lei</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs text-right whitespace-nowrap">Saldo Ant.</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs text-right whitespace-nowrap">Contratação</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs text-right whitespace-nowrap">Amortização</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs text-right whitespace-nowrap">Saldo Atual</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs text-right whitespace-nowrap">Calculado</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs text-center whitespace-nowrap">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.grade ?? []).map((row) => {
                        const conf = conferencia(row.vl_diferenca);
                        const ConfIcon = conf.icon;
                        return (
                          <TableRow key={row.id}
                            className="hover:bg-[#e3eef6]/40 cursor-pointer transition-colors"
                            onClick={() => setRowDetalhe(row)}>
                            <TableCell className="text-xs text-[#033e66] max-w-[140px] truncate" title={row.desc_orgao}>{row.desc_orgao}</TableCell>
                            <TableCell className="text-xs font-mono text-[#045ba3]">{row.cod_unidade}</TableCell>
                            <TableCell className="text-xs">
                              <Badge style={{ backgroundColor:`${COLORS[Number(row.tp_lancamento) % COLORS.length]}20`,
                                color: COLORS[Number(row.tp_lancamento) % COLORS.length], border:"none", fontSize:10 }}>
                                {row.tp_lancamento}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-[#033e66] max-w-[160px] truncate" title={row.nome_credor}>{row.nome_credor}</TableCell>
                            <TableCell className="text-xs font-mono text-[#045ba3]">{row.nro_lei_autorizacao || "—"}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums text-[#045ba3]">{fmtC(row.vl_saldo_anterior)}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums" style={{ color: "#ef4444" }}>{fmtC(row.vl_contratacao)}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums" style={{ color: "#00aac6" }}>{fmtC(row.vl_amortizacao)}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums font-semibold text-[#033e66]">{fmtC(row.vl_saldo_atual)}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums text-[#045ba3]">{fmtC(row.vl_saldo_calculado)}</TableCell>
                            <TableCell className="text-center">
                              <Badge style={{ backgroundColor:`${conf.color}20`, color:conf.color, border:"none", fontSize:10 }}>
                                <ConfIcon className="h-3 w-3 mr-1 inline" />{conf.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bloco 4A — Maiores credores */}
          {!isLoading && (data?.por_credor ?? []).length > 0 && (
            <Card className="bg-white shadow-sm rounded-xl border-0">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-base font-bold text-[#033e66] flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#008ded]" />
                  Maiores Credores
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
                        <TableHead className="text-[#033e66] font-semibold text-xs">Credor</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs">Tipo</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs">CPF/CNPJ</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs text-right">Saldo Atual</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs text-center">Registros</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.por_credor ?? []).map((c, i) => (
                        <TableRow key={i} className="hover:bg-[#e3eef6]/30 transition-colors">
                          <TableCell className="text-sm font-medium text-[#033e66]">{c.nome_credor}</TableCell>
                          <TableCell className="text-xs text-[#045ba3]">{TIPO_PESSOA[c.tipo_pessoa] ?? c.tipo_pessoa}</TableCell>
                          <TableCell className="text-xs font-mono text-[#045ba3]">{c.cpf_cnpj_credor || "—"}</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-[#033e66]">{fmt(c.vl_saldo_atual)}</TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-[#e3eef6] text-[#045ba3] border-0 text-xs">{c.qtd_registros}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bloco 4B — Leis autorizativas */}
          {!isLoading && (data?.grade ?? []).filter((r) => r.nro_lei_autorizacao).length > 0 && (
            <Card className="bg-white shadow-sm rounded-xl border-0">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-base font-bold text-[#033e66] flex items-center gap-2">
                  <Scale className="h-4 w-4 text-[#008ded]" />
                  Base Legal — Leis Autorizativas
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
                        <TableHead className="text-[#033e66] font-semibold text-xs">Nº Lei</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs">Data</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs">Credor</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs">Tipo de Dívida</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs">Órgão</TableHead>
                        <TableHead className="text-[#033e66] font-semibold text-xs text-right">Saldo Atual</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.grade ?? [])
                        .filter((r) => r.nro_lei_autorizacao)
                        .sort((a, b) => (a.nro_lei_autorizacao ?? "").localeCompare(b.nro_lei_autorizacao ?? ""))
                        .map((r, i) => (
                          <TableRow key={i} className="hover:bg-[#e3eef6]/30 transition-colors cursor-pointer"
                            onClick={() => setRowDetalhe(r)}>
                            <TableCell className="text-xs font-mono font-semibold text-[#008ded]">{r.nro_lei_autorizacao}</TableCell>
                            <TableCell className="text-xs text-[#045ba3]">
                              {r.dt_lei_autorizacao ? new Date(r.dt_lei_autorizacao).toLocaleDateString("pt-BR") : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-[#033e66] max-w-[180px] truncate">{r.nome_credor}</TableCell>
                            <TableCell className="text-xs text-[#045ba3]">{r.desc_tipo_divida}</TableCell>
                            <TableCell className="text-xs text-[#045ba3] max-w-[140px] truncate">{r.desc_orgao}</TableCell>
                            <TableCell className="text-right text-xs font-mono text-[#033e66]">{fmt(r.vl_saldo_atual)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Erro */}
      {isError && (
        <div className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 p-4 text-sm text-[#ef4444]">
          Erro ao carregar dados. Tente novamente.
        </div>
      )}

      {/* Rodapé */}
      <p className="text-center text-xs text-[#045ba3]/60 pb-2">
        Verus · VH Contabilidade Pública · Dados TCM-GO / DIC · {anoExercicio}
      </p>

      {/* Sheet detalhe */}
      <DetalheSheet row={rowDetalhe} open={!!rowDetalhe} onClose={() => setRowDetalhe(null)} />
    </div>
  );
}
