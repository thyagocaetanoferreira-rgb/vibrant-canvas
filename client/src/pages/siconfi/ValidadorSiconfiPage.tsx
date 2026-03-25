import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronRight,
  ClipboardCheck, Play, Loader2, Database, Filter,
  ShieldCheck, ShieldAlert, ShieldX, BarChart3, History, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ── Tipos ──────────────────────────────────────────────────────────────────────

type StatusVerificacao = "consistente" | "inconsistente" | "aviso" | "nao_aplicavel";

interface ResultadoVerificacao {
  no_verificacao: string;
  no_desc: string;
  no_finalidade: string;
  co_dimensao: string;
  capag: boolean;
  status: StatusVerificacao;
  resumo: string;
  detalhes: any[];
  nota: number;      // 0.0 – 1.0
  nota_max: number;  // sempre 1.0
}

interface RespostaValidacao {
  resultados: ResultadoVerificacao[];
  executado_em: string;
  municipio_id: number;
  ano: number;
  tipo: string;
}

interface HistoricoItem {
  id: number;
  tipo_analise: string;
  ano_exercicio: number;
  total_analisadas: number;
  consistentes: number;
  inconsistentes: number;
  avisos: number;
  status_geral: string;
  resultado_json: ResultadoVerificacao[];
  executado_em: string;
  usuario_nome: string | null;
}

// ── Tipos de análise ───────────────────────────────────────────────────────────

const TIPOS_ANALISE = [
  { value: "RREO",                    label: "RREO — Conformidade",       fase: 1  },
  { value: "RGF",                     label: "RGF — Conformidade",        fase: 2  },
  { value: "RREO x RGF",             label: "RREO × RGF",                fase: 3  },
  { value: "DCA",                     label: "DCA",                       fase: 4  },
  { value: "DCA x MSC de dezembro",  label: "DCA × MSC Dezembro",        fase: 5  },
  { value: "DCA x RGF",              label: "DCA × RGF",                 fase: 6  },
  { value: "DCA x RREO",             label: "DCA × RREO",                fase: 7  },
  { value: "MSC",                     label: "MSC",                       fase: 8  },
  { value: "MSC x RGF",              label: "MSC × RGF",                 fase: 9  },
  { value: "MSC x RREO",             label: "MSC × RREO",                fase: 10 },
  { value: "MSC de Dezembro",        label: "MSC de Dezembro",           fase: 11 },
  { value: "MSC de Dezembro x RREO", label: "MSC Dezembro × RREO",      fase: 12 },
  { value: "MSC x DCA",              label: "MSC × DCA",                 fase: 13 },
  { value: "RGF x MSC Dezembro",     label: "RGF × MSC Dezembro",       fase: 14 },
  { value: "RGF x RREO",            label: "RGF × RREO",                fase: 15 },
] as const;

const TIPOS_IMPLEMENTADOS = new Set(["RREO"]);

// ── Status visual ──────────────────────────────────────────────────────────────

const STATUS_META: Record<StatusVerificacao, {
  label: string; textColor: string; bgColor: string; borderColor: string;
}> = {
  consistente:   { label: "Consistente",   textColor: "#059669", bgColor: "#00e1a420", borderColor: "#00e1a460" },
  inconsistente: { label: "Inconsistente", textColor: "#ef4444", bgColor: "#ef444420", borderColor: "#ef444460" },
  aviso:         { label: "Aviso",         textColor: "#b45309", bgColor: "#ffb85a20", borderColor: "#ffb85a60" },
  nao_aplicavel: { label: "N/A",           textColor: "#6b7280", bgColor: "#6b728012", borderColor: "#6b728030" },
};

const STATUS_GERAL_META: Record<string, { label: string; textColor: string; bgColor: string }> = {
  regular:   { label: "Regular",   textColor: "#059669", bgColor: "#00e1a420" },
  alerta:    { label: "Com Avisos", textColor: "#b45309", bgColor: "#ffb85a20" },
  irregular: { label: "Irregular", textColor: "#ef4444", bgColor: "#ef444420" },
};

function StatusBadge({ status }: { status: StatusVerificacao }) {
  const m = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
      style={{ color: m.textColor, backgroundColor: m.bgColor, borderColor: m.borderColor }}
    >
      {status === "consistente"   && <CheckCircle2  className="w-3 h-3" />}
      {status === "inconsistente" && <XCircle       className="w-3 h-3" />}
      {status === "aviso"         && <AlertTriangle className="w-3 h-3" />}
      {m.label}
    </span>
  );
}

// ── Card KPI (padrão Verus) ────────────────────────────────────────────────────

function KpiCard({
  title, value, icon: Icon, borderColor, subtitle,
}: {
  title: string; value: number; icon: React.ElementType;
  borderColor: string; subtitle?: string;
}) {
  return (
    <Card className="bg-white shadow-sm rounded-xl border-0 border-l-4 flex-1 min-w-[160px]"
          style={{ borderLeftColor: borderColor }}>
      <CardContent className="p-4 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#045ba3] uppercase tracking-wide truncate">{title}</p>
          <p className="text-2xl font-extrabold text-[#033e66] mt-0.5 leading-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#045ba3]/70 mt-0.5">{subtitle}</p>}
        </div>
        <div className="ml-3 p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${borderColor}18` }}>
          <Icon className="h-5 w-5" style={{ color: borderColor }} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Detalhes D1_00001 ─────────────────────────────────────────────────────────

function DetalhesD1_00001({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length) return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
          <TableHead className="text-xs font-semibold text-[#033e66]">Período</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Homologado</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Data</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Instituição</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detalhes.map((d: any) => (
          <TableRow key={d.periodo} className="hover:bg-[#e3eef6]/30">
            <TableCell className="text-sm text-[#045ba3] font-medium">{d.label}</TableCell>
            <TableCell className="text-sm">
              {d.entregue
                ? <span className="text-[#059669] font-semibold">✓ Sim</span>
                : <span className="text-[#ef4444] font-semibold">✗ Não</span>}
            </TableCell>
            <TableCell className="text-sm text-[#045ba3]">
              {d.data_status ? new Date(d.data_status).toLocaleDateString("pt-BR") : "—"}
            </TableCell>
            <TableCell className="text-sm text-[#045ba3]">{d.instituicao ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ── Detalhes D1_00006: Tempestividade ─────────────────────────────────────────

function DetalhesD1_00006({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length) return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
          <TableHead className="text-xs font-semibold text-[#033e66]">Período</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Prazo</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Enviado em</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Tempestividade</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Instituição</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detalhes.map((d: any) => (
          <TableRow key={d.periodo} className="hover:bg-[#e3eef6]/30">
            <TableCell className="text-sm text-[#045ba3] font-medium">{d.label}</TableCell>
            <TableCell className="text-sm text-[#045ba3]">{d.prazo ?? "—"}</TableCell>
            <TableCell className="text-sm text-[#045ba3]">
              {d.data_status ? new Date(d.data_status).toLocaleDateString("pt-BR") : "—"}
            </TableCell>
            <TableCell className="text-sm">
              {!d.entregue
                ? <span className="text-[#6b7280]">Não entregue</span>
                : d.intempestiva
                  ? <span className="text-[#ef4444] font-semibold">✗ Intempestivo</span>
                  : <span className="text-[#059669] font-semibold">✓ No prazo</span>}
            </TableCell>
            <TableCell className="text-sm text-[#045ba3]">{d.instituicao ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ── Detalhes D1_00011: Retificações ───────────────────────────────────────────

function DetalhesD1_00011({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length) return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
          <TableHead className="text-xs font-semibold text-[#033e66]">Período</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-center">Status</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Data</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Instituição</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detalhes.map((d: any, i: number) => {
          const isRE = d.status_relatorio?.trim() === "RE";
          return (
            <TableRow key={i} className={isRE ? "bg-[#ef444408] hover:bg-[#ef444412]" : "hover:bg-[#e3eef6]/30"}>
              <TableCell className="text-sm text-[#045ba3] font-medium">{d.label}</TableCell>
              <TableCell className="text-center">
                <span
                  className="inline-block text-xs font-bold px-2 py-0.5 rounded-full"
                  style={isRE
                    ? { color: "#ef4444", backgroundColor: "#ef444420" }
                    : { color: "#059669", backgroundColor: "#00e1a420" }}
                >
                  {d.status_relatorio} {isRE ? "— Retificado" : "— Homologado"}
                </span>
              </TableCell>
              <TableCell className="text-sm text-[#045ba3]">
                {d.data_status ? new Date(d.data_status).toLocaleDateString("pt-BR") : "—"}
              </TableCell>
              <TableCell className="text-sm text-[#045ba3]">{d.instituicao ?? "—"}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ── Detalhes D3_00001: Resultado orçamentário Anexo 01 ─────────────────────────

function DetalhesD3_00001({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length) return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;
  const fmt = (v: number) =>
    Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const calculado = detalhes.find((d: any) => d.item === "Resultado Calculado (Rec − Desp)");
  const superavit = detalhes.find((d: any) => d.item === "Superávit Informado no Demonstrativo");
  const diverge = calculado && superavit && Math.abs(calculado.valor - superavit.valor) > 0.01;
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
          <TableHead className="text-xs font-semibold text-[#033e66]">Item</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Coluna</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Valor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detalhes.map((d: any, i: number) => {
          const isCalculado = d.item === "Resultado Calculado (Rec − Desp)";
          const isSuperavit = d.item === "Superávit Informado no Demonstrativo";
          const highlight = (isCalculado || isSuperavit) && diverge;
          return (
            <TableRow key={i} className={highlight ? "bg-[#ef444408] hover:bg-[#ef444412]" : "hover:bg-[#e3eef6]/30"}>
              <TableCell className={`text-sm font-medium ${isCalculado || isSuperavit ? "text-[#033e66]" : "text-[#045ba3]"}`}>
                {d.item}
              </TableCell>
              <TableCell className="text-sm text-[#045ba3]/70">{d.coluna}</TableCell>
              <TableCell className={`text-sm text-right font-mono ${
                isCalculado ? (d.valor >= 0 ? "text-[#059669] font-bold" : "text-[#ef4444] font-bold")
                : isSuperavit && highlight ? "text-[#ef4444] font-bold"
                : "text-[#045ba3]"
              }`}>
                {fmt(d.valor ?? 0)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ── Detalhes D3_00002: Igualdade Anexo 01 × Anexo 02 ─────────────────────────

function DetalhesD3_00002({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length) return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;
  const fmt = (v: number | null) =>
    v === null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
          <TableHead className="text-xs font-semibold text-[#033e66]">Período</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Tipo</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Anexo 01</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Anexo 02</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Diferença</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detalhes.map((d: any, i: number) => (
          <TableRow key={i} className={!d.ok ? "bg-[#ef444408] hover:bg-[#ef444412]" : "hover:bg-[#e3eef6]/30"}>
            <TableCell className="text-sm text-[#045ba3] font-medium">{d.label}</TableCell>
            <TableCell className="text-sm text-[#045ba3]">{d.tipo}</TableCell>
            <TableCell className="text-sm text-right font-mono text-[#045ba3]">{fmt(d.valor_anexo01)}</TableCell>
            <TableCell className="text-sm text-right font-mono text-[#045ba3]">{fmt(d.valor_anexo02)}</TableCell>
            <TableCell className={`text-sm text-right font-mono font-semibold ${
              d.diferenca === null ? "text-[#6b7280]"
              : Math.abs(d.diferenca) <= 0.02 ? "text-[#059669]"
              : "text-[#ef4444]"
            }`}>
              {d.diferenca === null ? "—" : fmt(d.diferenca)}
            </TableCell>
            <TableCell className="text-center">
              {d.ok
                ? <span className="text-[#059669] font-bold text-xs">✓ Igual</span>
                : <span className="text-[#ef4444] font-bold text-xs">✗ Diverge</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ── Detalhes D3_00003: Igualdade Anexo 01 × Anexo 06 ─────────────────────────

function DetalhesD3_00003({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length) return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;
  const fmt = (v: number | null) =>
    v === null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
          <TableHead className="text-xs font-semibold text-[#033e66]">Período</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Categoria</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66]">Tipo</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Anexo 01</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Anexo 06</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-right">Diferença</TableHead>
          <TableHead className="text-xs font-semibold text-[#033e66] text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {detalhes.map((d: any, i: number) => (
          <TableRow key={i} className={!d.ok ? "bg-[#ef444408] hover:bg-[#ef444412]" : "hover:bg-[#e3eef6]/30"}>
            <TableCell className="text-sm text-[#045ba3] font-medium">{d.label}</TableCell>
            <TableCell className="text-sm text-[#045ba3]">{d.categoria}</TableCell>
            <TableCell className="text-sm text-[#045ba3]">{d.tipo}</TableCell>
            <TableCell className="text-sm text-right font-mono text-[#045ba3]">{fmt(d.valor_anexo01)}</TableCell>
            <TableCell className="text-sm text-right font-mono text-[#045ba3]">{fmt(d.valor_anexo06)}</TableCell>
            <TableCell className={`text-sm text-right font-mono font-semibold ${
              d.diferenca === null ? "text-[#6b7280]"
              : Math.abs(d.diferenca) <= 0.02 ? "text-[#059669]"
              : "text-[#ef4444]"
            }`}>
              {d.diferenca === null ? "—" : fmt(d.diferenca)}
            </TableCell>
            <TableCell className="text-center">
              {d.ok
                ? <span className="text-[#059669] font-bold text-xs">✓ Igual</span>
                : <span className="text-[#ef4444] font-bold text-xs">✗ Diverge</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const DETALHE_COMPONENTE: Record<string, React.ComponentType<{ detalhes: any[] }>> = {
  "D1_00001": DetalhesD1_00001,
  "D1_00006": DetalhesD1_00006,
  "D1_00011": DetalhesD1_00011,
  "D3_00001": DetalhesD3_00001,
  "D3_00002": DetalhesD3_00002,
  "D3_00003": DetalhesD3_00003,
  // D3_00007 usa o mesmo layout de tabela que D3_00003 (Período, Categoria, Tipo, An01, An06, Dif, Status)
  "D3_00007": DetalhesD3_00003,
};

function DetalhesGenericos({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length) return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;
  return (
    <pre className="text-xs whitespace-pre-wrap break-all text-[#045ba3]/70 p-3">
      {JSON.stringify(detalhes, null, 2)}
    </pre>
  );
}

// ── Linha expansível ───────────────────────────────────────────────────────────

function VerificacaoRow({ r }: { r: ResultadoVerificacao }) {
  const [open, setOpen] = useState(false);
  const DetalheComp = DETALHE_COMPONENTE[r.no_verificacao] ?? DetalhesGenericos;

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-[#e3eef6]/30 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <TableCell className="w-28">
          <div className="flex items-center gap-1.5 font-mono text-xs text-[#045ba3]">
            {open
              ? <ChevronDown  className="w-3.5 h-3.5 text-[#008ded]" />
              : <ChevronRight className="w-3.5 h-3.5 text-[#008ded]" />}
            {r.no_verificacao}
          </div>
        </TableCell>
        <TableCell className="text-sm font-medium text-[#033e66]">{r.no_desc}</TableCell>
        <TableCell className="w-28 text-center">
          <Badge style={{ backgroundColor: "#008ded15", color: "#045ba3", border: "none", fontSize: 11, fontFamily: "monospace" }}>
            {r.co_dimensao}
          </Badge>
          {r.capag && (
            <Badge className="ml-1" style={{ backgroundColor: "#033e6615", color: "#033e66", border: "none", fontSize: 10 }}>
              CAPAG
            </Badge>
          )}
        </TableCell>
        <TableCell className="w-36">
          <StatusBadge status={r.status} />
        </TableCell>
        <TableCell className="w-24 text-center">
          {r.status === "nao_aplicavel" ? (
            <span className="text-xs text-[#6b7280]">—</span>
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              <span
                className="text-sm font-bold"
                style={{ color: r.nota >= 0.8 ? "#059669" : r.nota >= 0.5 ? "#b45309" : "#ef4444" }}
              >
                {r.nota.toFixed(2)}
              </span>
              <div className="w-12 h-1.5 rounded-full bg-[#e3eef6] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${r.nota * 100}%`,
                    backgroundColor: r.nota >= 0.8 ? "#00e1a4" : r.nota >= 0.5 ? "#ffb85a" : "#ef4444",
                  }}
                />
              </div>
            </div>
          )}
        </TableCell>
        <TableCell className="text-xs text-[#045ba3] max-w-xs">{r.resumo}</TableCell>
      </TableRow>

      {open && (
        <TableRow>
          <TableCell colSpan={6} className="p-0 bg-[#f7fbfe]">
            <div className="px-8 py-4 space-y-3 border-l-4 border-[#008ded]/30">
              <p className="text-xs text-[#045ba3] italic leading-relaxed">{r.no_finalidade}</p>
              <div className="rounded-xl border border-[#e3eef6] overflow-hidden bg-white">
                <DetalheComp detalhes={r.detalhes} />
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ── Grid de resultados (reutilizável em histórico) ─────────────────────────────

function GridResultados({ resultados, executado_em, tipo }: {
  resultados: ResultadoVerificacao[];
  executado_em: string;
  tipo: string;
}) {
  const tipoInfo = TIPOS_ANALISE.find(t => t.value === tipo);
  return (
    <Card className="bg-white shadow-sm rounded-xl border-0">
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="text-base font-bold text-[#033e66] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-[#008ded]" />
            {tipoInfo?.label ?? tipo} — {resultados.length} verificações
          </div>
          <span className="text-xs font-normal text-[#045ba3]/70">
            {new Date(executado_em).toLocaleString("pt-BR")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="rounded-xl border border-[#e3eef6] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
                <TableHead className="text-xs font-semibold text-[#033e66] w-28">Código</TableHead>
                <TableHead className="text-xs font-semibold text-[#033e66]">Verificação</TableHead>
                <TableHead className="text-xs font-semibold text-[#033e66] w-28 text-center">Dimensão</TableHead>
                <TableHead className="text-xs font-semibold text-[#033e66] w-36">Status</TableHead>
                <TableHead className="text-xs font-semibold text-[#033e66] w-24 text-center">Nota</TableHead>
                <TableHead className="text-xs font-semibold text-[#033e66]">Resumo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultados.map(r => <VerificacaoRow key={r.no_verificacao} r={r} />)}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function ValidadorSiconfiPage() {
  const { municipio, anoExercicio } = useAppContext();
  const qc = useQueryClient();
  const municipioId = municipio?.municipioId;

  const [tipoSelecionado, setTipoSelecionado] = useState("RREO");
  const [resultado, setResultado] = useState<RespostaValidacao | null>(null);
  // Histórico selecionado para expandir
  const [histAberto, setHistAberto] = useState<number | null>(null);

  const implementado = TIPOS_IMPLEMENTADOS.has(tipoSelecionado);
  const tipoInfo = TIPOS_ANALISE.find(t => t.value === tipoSelecionado);

  // ── Busca histórico ──────────────────────────────────────────────────────────
  const { data: historico = [] } = useQuery<HistoricoItem[]>({
    queryKey: ["validador-historico", municipioId, anoExercicio],
    queryFn: () => api.get(`/siconfi/validador-historico?municipio_id=${municipioId}&ano=${anoExercicio}`),
    enabled: !!municipioId,
  });

  // ── Salvar histórico ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (data: RespostaValidacao) =>
      api.post("/siconfi/validador-historico", {
        municipio_id: data.municipio_id,
        tipo_analise: data.tipo,
        ano_exercicio: data.ano,
        resultados: data.resultados,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["validador-historico", municipioId] });
    },
    onError: () => toast.error("Erro ao salvar no histórico"),
  });

  // ── Executar validação ───────────────────────────────────────────────────────
  const validarMutation = useMutation<RespostaValidacao, Error>({
    mutationFn: () =>
      api.post(`/siconfi/validar/${municipioId}`, {
        ano: parseInt(anoExercicio),
        tipo: tipoSelecionado,
      }),
    onSuccess: (data) => {
      setResultado(data);
      saveMutation.mutate(data);
      toast.success(`${data.resultados.filter(r => r.status !== "nao_aplicavel").length} verificações processadas`);
    },
    onError: (err: any) => toast.error(err.message ?? "Erro ao executar validação"),
  });

  const kpis = resultado ? (() => {
    const analisadas     = resultado.resultados.filter(r => r.status !== "nao_aplicavel");
    const notaTotal      = analisadas.reduce((s, r) => s + (r.nota ?? 0), 0);
    const notaMaxima     = analisadas.length; // cada verificação vale 1 ponto no máximo
    const notaPercent    = notaMaxima > 0 ? (notaTotal / notaMaxima) * 100 : 0;
    return {
      analisadas:    analisadas.length,
      consistentes:  resultado.resultados.filter(r => r.status === "consistente").length,
      inconsistentes:resultado.resultados.filter(r => r.status === "inconsistente").length,
      avisos:        resultado.resultados.filter(r => r.status === "aviso").length,
      notaTotal:     parseFloat(notaTotal.toFixed(2)),
      notaMaxima,
      notaPercent:   parseFloat(notaPercent.toFixed(1)),
    };
  })() : null;

  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-gradient-to-r from-[#008ded] to-[#00bfcf]">
              <ClipboardCheck className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#033e66]">Validador SICONFI</h1>
          </div>
          <p className="text-sm text-[#045ba3]">
            {municipio?.municipioNome ?? "Selecione um município"}
            {" · "}Exercício {anoExercicio}
            {" · "}Análise de conformidade dos demonstrativos
          </p>
        </div>

        <Button
          onClick={() => validarMutation.mutate()}
          disabled={validarMutation.isPending || !implementado || !municipioId}
          className="gap-2 bg-[#008ded] hover:bg-[#045ba3] text-white border-0"
        >
          {validarMutation.isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando…</>
            : <><Play className="w-4 h-4" /> Executar Validação</>}
        </Button>
      </div>

      {/* ── Filtros ────────────────────────────────────────────────────────── */}
      <Card className="bg-white shadow-sm rounded-xl border-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Filter className="h-4 w-4 text-[#008ded]" />
            <span className="text-sm font-semibold text-[#033e66]">Filtros</span>
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5 min-w-[280px]">
              <label className="text-xs text-[#045ba3] font-medium">Tipo de Análise</label>
              <Select
                value={tipoSelecionado}
                onValueChange={(v) => { setTipoSelecionado(v); setResultado(null); }}
              >
                <SelectTrigger className="h-9 text-sm border-[#e3eef6] text-[#045ba3]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_ANALISE.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-[#045ba3]/60 font-mono w-10">F{t.fase}</span>
                        <span className="text-[#033e66]">{t.label}</span>
                        {!TIPOS_IMPLEMENTADOS.has(t.value) && (
                          <span className="text-[10px] bg-[#ffb85a20] text-[#b45309] border border-[#ffb85a40] rounded px-1 ml-1">
                            Em breve
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!implementado && (
              <p className="text-xs text-[#b45309] bg-[#ffb85a15] border border-[#ffb85a40] rounded-lg px-3 py-2">
                A análise <strong>{tipoInfo?.label}</strong> estará disponível em breve.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Cards + Nota ───────────────────────────────────────────────── */}
      {kpis && (
        <div className="space-y-4">
          {/* Card de nota em destaque */}
          <Card className="bg-white shadow-sm rounded-xl border-0 border-l-4" style={{ borderLeftColor: "#008ded" }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: "#008ded18" }}>
                    <Star className="h-6 w-6" style={{ color: "#008ded" }} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#045ba3] uppercase tracking-wide">Nota da Análise</p>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-3xl font-extrabold text-[#033e66]">{kpis.notaTotal}</span>
                      <span className="text-sm text-[#045ba3]/70">/ {kpis.notaMaxima} pontos</span>
                      <span
                        className="text-sm font-bold px-2 py-0.5 rounded-full ml-1"
                        style={{
                          color:           kpis.notaPercent >= 80 ? "#059669" : kpis.notaPercent >= 50 ? "#b45309" : "#ef4444",
                          backgroundColor: kpis.notaPercent >= 80 ? "#00e1a420" : kpis.notaPercent >= 50 ? "#ffb85a20" : "#ef444420",
                        }}
                      >
                        {kpis.notaPercent}%
                      </span>
                    </div>
                    <p className="text-xs text-[#045ba3]/60 mt-0.5">
                      Cada verificação vale 1 pt — pontuação proporcional para itens parciais
                    </p>
                  </div>
                </div>
                {/* Barra de progresso */}
                <div className="flex-1 min-w-[200px] max-w-xs">
                  <div className="flex justify-between text-xs text-[#045ba3]/70 mb-1">
                    <span>0</span>
                    <span>{kpis.notaMaxima}</span>
                  </div>
                  <div className="h-3 rounded-full bg-[#e3eef6] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${kpis.notaPercent}%`,
                        background: kpis.notaPercent >= 80
                          ? "linear-gradient(90deg, #00e1a4, #008ded)"
                          : kpis.notaPercent >= 50
                          ? "linear-gradient(90deg, #ffb85a, #f97316)"
                          : "linear-gradient(90deg, #ef4444, #dc2626)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cards de contagem */}
          <div className="flex gap-4 flex-wrap">
            <KpiCard title="Analisadas"     value={kpis.analisadas}     icon={BarChart3}   borderColor="#033e66" subtitle="verificações executadas" />
            <KpiCard title="Consistentes"   value={kpis.consistentes}   icon={ShieldCheck} borderColor="#00e1a4" subtitle="dentro da conformidade" />
            <KpiCard title="Inconsistentes" value={kpis.inconsistentes} icon={ShieldX}     borderColor="#ef4444" subtitle="requerem atenção" />
            <KpiCard title="Avisos"         value={kpis.avisos}         icon={ShieldAlert} borderColor="#ffb85a" subtitle="pontos de atenção" />
          </div>
        </div>
      )}

      {/* ── Abas Resultado / Histórico ─────────────────────────────────────── */}
      <Tabs defaultValue="resultado">
        <TabsList className="bg-white border border-[#e3eef6]">
          <TabsTrigger value="resultado" className="gap-1.5 data-[state=active]:text-[#008ded]">
            <ClipboardCheck className="w-4 h-4" />
            Resultado
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5 data-[state=active]:text-[#008ded]">
            <History className="w-4 h-4" />
            Histórico
            {historico.length > 0 && (
              <Badge className="ml-1 h-4 text-xs px-1" style={{ backgroundColor: "#008ded20", color: "#008ded", border: "none" }}>
                {historico.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Aba Resultado ─────────────────────────────────────────────────── */}
        <TabsContent value="resultado" className="mt-4 space-y-4">
          {!resultado && !validarMutation.isPending && (
            <Card className="bg-white shadow-sm rounded-xl border-0">
              <CardContent className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="p-4 rounded-full bg-[#e3eef6]">
                  <Database className="w-10 h-10 text-[#008ded]/40" />
                </div>
                <p className="text-sm text-[#045ba3] text-center max-w-xs leading-relaxed">
                  Selecione o tipo de análise e clique em{" "}
                  <strong className="text-[#033e66]">Executar Validação</strong>{" "}
                  para verificar os demonstrativos do município
                </p>
              </CardContent>
            </Card>
          )}

          {validarMutation.isPending && (
            <Card className="bg-white shadow-sm rounded-xl border-0">
              <CardContent className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="w-10 h-10 text-[#008ded] animate-spin" />
                <p className="text-sm text-[#045ba3]">Executando verificações SICONFI…</p>
              </CardContent>
            </Card>
          )}

          {resultado && (
            <GridResultados
              resultados={resultado.resultados}
              executado_em={resultado.executado_em}
              tipo={resultado.tipo}
            />
          )}
        </TabsContent>

        {/* ── Aba Histórico ─────────────────────────────────────────────────── */}
        <TabsContent value="historico" className="mt-4 space-y-4">
          {historico.length === 0 ? (
            <Card className="bg-white shadow-sm rounded-xl border-0">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="p-4 rounded-full bg-[#e3eef6]">
                  <History className="w-8 h-8 text-[#008ded]/40" />
                </div>
                <p className="text-sm text-[#045ba3]">Nenhuma validação registrada para este município.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Tabela de execuções passadas */}
              <Card className="bg-white shadow-sm rounded-xl border-0">
                <CardHeader className="px-5 pt-5 pb-3">
                  <CardTitle className="text-base font-bold text-[#033e66] flex items-center gap-2">
                    <History className="h-4 w-4 text-[#008ded]" />
                    Execuções anteriores
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="rounded-xl border border-[#e3eef6] overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#e3eef6]/50 hover:bg-[#e3eef6]/50">
                          <TableHead className="text-xs font-semibold text-[#033e66]">Data</TableHead>
                          <TableHead className="text-xs font-semibold text-[#033e66]">Análise</TableHead>
                          <TableHead className="text-xs font-semibold text-[#033e66]">Ano</TableHead>
                          <TableHead className="text-xs font-semibold text-[#033e66] text-center">Consist.</TableHead>
                          <TableHead className="text-xs font-semibold text-[#033e66] text-center">Incons.</TableHead>
                          <TableHead className="text-xs font-semibold text-[#033e66] text-center">Avisos</TableHead>
                          <TableHead className="text-xs font-semibold text-[#033e66]">Status</TableHead>
                          <TableHead className="text-xs font-semibold text-[#033e66]">Usuário</TableHead>
                          <TableHead className="w-20" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historico.map(h => {
                          const sg = STATUS_GERAL_META[h.status_geral] ?? STATUS_GERAL_META.irregular;
                          const isOpen = histAberto === h.id;
                          return (
                            <TableRow key={h.id} className="hover:bg-[#e3eef6]/30 cursor-pointer" onClick={() => setHistAberto(isOpen ? null : h.id)}>
                              <TableCell className="text-xs text-[#045ba3] whitespace-nowrap">
                                {new Date(h.executado_em).toLocaleString("pt-BR")}
                              </TableCell>
                              <TableCell className="text-sm font-medium text-[#033e66]">{h.tipo_analise}</TableCell>
                              <TableCell className="text-sm text-[#045ba3]">{h.ano_exercicio}</TableCell>
                              <TableCell className="text-center font-semibold" style={{ color: "#059669" }}>{h.consistentes}</TableCell>
                              <TableCell className="text-center font-semibold" style={{ color: "#ef4444" }}>{h.inconsistentes}</TableCell>
                              <TableCell className="text-center font-semibold" style={{ color: "#b45309" }}>{h.avisos}</TableCell>
                              <TableCell>
                                <span
                                  className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
                                  style={{ color: sg.textColor, backgroundColor: sg.bgColor }}
                                >
                                  {sg.label}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-[#045ba3]/70">{h.usuario_nome ?? "—"}</TableCell>
                              <TableCell>
                                {isOpen
                                  ? <ChevronDown  className="w-4 h-4 text-[#008ded]" />
                                  : <ChevronRight className="w-4 h-4 text-[#008ded]" />}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Detalhe do histórico selecionado */}
              {histAberto !== null && (() => {
                const h = historico.find(x => x.id === histAberto);
                if (!h || !h.resultado_json?.length) return null;
                return (
                  <GridResultados
                    resultados={h.resultado_json}
                    executado_em={h.executado_em}
                    tipo={h.tipo_analise}
                  />
                );
              })()}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
