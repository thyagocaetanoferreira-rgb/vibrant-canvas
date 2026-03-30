import React from "react";
import {
  Document, Page, View, Text, Image, StyleSheet, Font,
} from "@react-pdf/renderer";

// Helvetica: fonte embutida em todo viewer PDF — zero dependência de CDN.
Font.registerHyphenationCallback((word) => [word]);

const FONT      = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";

// ── Tipos ─────────────────────────────────────────────────────────────────────
type StatusVerificacao = "consistente" | "inconsistente" | "aviso" | "nao_aplicavel";

export interface ResultadoPDF {
  no_verificacao: string;
  no_desc: string;
  no_finalidade: string;
  co_dimensao: string;
  capag: boolean;
  status: StatusVerificacao;
  resumo: string;
  detalhes: Record<string, any>[];
  nota: number;
  nota_max: number;
  observacoes_rodape?: string;
}

export interface KpisPDF {
  analisadas: number;
  consistentes: number;
  inconsistentes: number;
  avisos: number;
  notaTotal: number;
  notaMaxima: number;
  notaPercent: number;
}

interface Props {
  resultados: ResultadoPDF[];
  municipioNome: string;
  anoExercicio: string;
  tipoAnalise: string;
  executadoEm: string;
  kpis: KpisPDF;
  logoUrl: string;
}

// ── Cores ─────────────────────────────────────────────────────────────────────
const C = {
  navy:   "#033e66",
  deep:   "#045ba3",
  muted:  "#6b7280",
  bg:     "#e3eef6",
  border: "#d1e4f0",
  light:  "#f7fbfe",
  white:  "#ffffff",
  ok:     "#059669",
  okBg:   "#dcfce7",
  okSec:  "#065f46",
  err:    "#dc2626",
  errBg:  "#fee2e2",
  errSec: "#991b1b",
  warn:   "#b45309",
  warnBg: "#fef3c7",
  warnSec:"#92400e",
  na:     "#6b7280",
  naBg:   "#f3f4f6",
  naSec:  "#374151",
};

// Configuração por status — label, seção, cores de badge e seção
const STATUS_CFG: Record<StatusVerificacao, {
  label: string; sectionLabel: string;
  badgeBg: string; badgeText: string;
  secBg: string; secText: string;
}> = {
  inconsistente: {
    label: "Inconsistente", sectionLabel: "INCONSISTENTES",
    badgeBg: C.errBg, badgeText: C.err,
    secBg: "#fde8e8", secText: C.errSec,
  },
  aviso: {
    label: "Aviso", sectionLabel: "AVISOS",
    badgeBg: C.warnBg, badgeText: C.warn,
    secBg: "#fef3c7", secText: C.warnSec,
  },
  consistente: {
    label: "Consistente", sectionLabel: "CONSISTENTES",
    badgeBg: C.okBg, badgeText: C.ok,
    secBg: "#e6f9f1", secText: C.okSec,
  },
  nao_aplicavel: {
    label: "N/A", sectionLabel: "NÃO APLICÁVEIS",
    badgeBg: C.naBg, badgeText: C.na,
    secBg: "#f3f4f6", secText: C.naSec,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const NUM = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function isCurrencyKey(k: string) { return /vl_|valor|diferenca|saldo|receita|despesa|credito|debito/i.test(k); }
function isPercentKey(k: string)  { return /pct|percentual|taxa|percent/i.test(k); }
function isDescKey(k: string)     { return /desc|conta|finalidade|nome|motivo/i.test(k); }

function formatScalar(key: string, val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") return "—";          // nunca renderizar JSON bruto
  if (typeof val === "boolean") return val ? "Sim" : "Não";
  if (typeof val === "number") {
    if (isCurrencyKey(key)) return BRL.format(val);
    if (isPercentKey(key))  return `${NUM.format(val)}%`;
    return NUM.format(val);
  }
  return String(val);
}

function trunc(s: string, max: number): string {
  if (!s || s === "—") return s;
  return s.length > max ? s.slice(0, max) + "…" : s;
}

const KEY_LABELS: Record<string, string> = {
  periodo: "Período", bimestre: "Bimestre", semestre: "Semestre", exercicio: "Exercício",
  competencia: "Comp.", coluna: "Coluna", tipo: "Tipo",
  vl_esperado: "Esperado", vl_encontrado: "Encontrado", vl_receita: "Receita",
  vl_deducao: "Dedução", vl_liquida: "Líquida", diferenca: "Diferença",
  valor: "Valor", saldo: "Saldo", limite: "Limite", apurado: "Apurado",
  conta: "Conta", descricao: "Descrição", status: "Status", nota: "Nota",
  dias: "Dias", dias_atraso: "Atraso", prazo_publicacao: "Prazo",
  data_publicacao: "Publicação", data_homologacao: "Homologação", motivo: "Motivo",
};

function labelKey(k: string): string {
  return KEY_LABELS[k] ?? k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ── Preparação da tabela — remove JSON, limita colunas ───────────────────────
const MAX_COLS    = 5;
const MAX_ROWS    = 30;
const MAX_CELL    = 32;  // chars máximos por célula
const MAX_DESC    = 45;  // chars para colunas descritivas

interface PreparedTable {
  keys: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

function prepareTable(detalhes: Record<string, any>[]): PreparedTable | null {
  if (!detalhes?.length) return null;

  const allKeys = Object.keys(detalhes[0]).filter(
    k => k !== "id" && k !== "_id" && !k.startsWith("_") && !k.startsWith("componentes")
  );

  // Manter apenas colunas onde pelo menos 1 linha tem valor escalar
  const scalarKeys = allKeys.filter(k =>
    detalhes.some(row => {
      const v = row[k];
      return v !== null && v !== undefined && typeof v !== "object";
    })
  );

  if (!scalarKeys.length) return null;

  // Prioridade: não-desc (numérico/código) primeiro, depois desc
  const descKeys  = scalarKeys.filter(isDescKey);
  const otherKeys = scalarKeys.filter(k => !isDescKey(k));
  const selected  = [...otherKeys, ...descKeys].slice(0, MAX_COLS);

  const totalRows = detalhes.length;
  const rows = detalhes.slice(0, MAX_ROWS).map(row => {
    const clean: Record<string, string> = {};
    for (const k of selected) {
      const v = row[k];
      const raw = formatScalar(k, v);
      clean[k] = trunc(raw, isDescKey(k) ? MAX_DESC : MAX_CELL);
    }
    return clean;
  });

  return { keys: selected, rows, totalRows };
}

// ── Status geral — baseado em contagens reais (não apenas %) ─────────────────
function calcStatusGeral(kpis: KpisPDF): { label: string; color: string } {
  if (kpis.inconsistentes > 0) return { label: "Irregular",  color: C.err  };
  if (kpis.avisos         > 0) return { label: "Com Avisos", color: C.warn };
  return                             { label: "Regular",     color: C.ok   };
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:        { backgroundColor: C.white, fontFamily: FONT },
  contentPage: {
    backgroundColor: C.white, fontFamily: FONT,
    paddingTop: 28, paddingBottom: 44, paddingHorizontal: 36,
  },

  // Capa — header
  coverHeader: {
    backgroundColor: C.navy,
    paddingTop: 20, paddingBottom: 20, paddingHorizontal: 40,
    flexDirection: "row", alignItems: "center",
  },
  coverLogo: { height: 26, width: 100 },
  coverTag:  { marginLeft: "auto", fontSize: 7, color: "rgba(255,255,255,0.5)", letterSpacing: 2 },

  // Capa — corpo
  coverBody:      { paddingHorizontal: 40, paddingTop: 28 },
  coverTitle:     { fontSize: 20, fontFamily: FONT_BOLD, color: C.navy, marginBottom: 3 },
  coverSubtitle:  { fontSize: 11, fontFamily: FONT_BOLD, color: C.deep, marginBottom: 20 },
  coverMeta:      { flexDirection: "row", flexWrap: "wrap", marginBottom: 20 },
  coverMetaItem:  { marginRight: 22, marginBottom: 5 },
  coverMetaLabel: { fontSize: 7, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
  coverMetaValue: { fontSize: 9,  fontFamily: FONT_BOLD, color: C.navy },

  // Score
  scoreBox:    { backgroundColor: C.bg, borderRadius: 6, padding: 18, marginBottom: 16 },
  scoreRow:    { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  scoreNum:    { fontSize: 34, fontFamily: FONT_BOLD, lineHeight: 1 },
  scoreRight:  { marginLeft: 12, marginTop: 2 },
  scoreStatus: { fontSize: 10, fontFamily: FONT_BOLD },
  scorePoints: { fontSize: 7.5, color: C.muted, marginTop: 3 },
  barTrack:    { height: 5, backgroundColor: "#c7dff0", borderRadius: 3, marginBottom: 12 },
  barFill:     { height: 5, borderRadius: 3 },
  statsRow:    { flexDirection: "row", flexWrap: "wrap" },
  statItem:    { flexDirection: "row", alignItems: "center", marginRight: 16, marginBottom: 2 },
  statDot:     { width: 5, height: 5, borderRadius: 3, marginRight: 4 },
  statText:    { fontSize: 7.5, color: C.deep },
  statBold:    { fontFamily: FONT_BOLD },
  metaNota:    { fontSize: 7, color: C.muted, lineHeight: 1.55, marginTop: 2 },

  // Seção por status
  sectionWrap:  { marginBottom: 4 },
  sectionHeader:{
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 4, marginBottom: 7, marginTop: 6,
  },
  sectionTitle: { fontSize: 8.5, fontFamily: FONT_BOLD, letterSpacing: 0.5 },
  sectionCount: { fontSize: 7.5, marginLeft: 8 },

  // Item detalhado (inconsistente / aviso)
  itemBox: {
    marginBottom: 9,
    borderRadius: 4, borderWidth: 1, borderColor: C.border,
  },
  itemHeader: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.bg,
    paddingHorizontal: 9, paddingVertical: 7,
    borderTopLeftRadius: 4, borderTopRightRadius: 4,
  },
  itemCode:      { fontSize: 7.5, fontFamily: FONT_BOLD, color: C.deep, marginRight: 7, width: 58 },
  itemName:      { fontSize: 8, fontFamily: FONT_BOLD, color: C.navy, flex: 1 },
  itemBadge:     { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  itemBadgeText: { fontSize: 6.5, fontFamily: FONT_BOLD },
  itemNota:      { fontSize: 6.5, color: C.muted, marginLeft: 6 },
  itemBody:      { paddingHorizontal: 9, paddingTop: 7, paddingBottom: 7 },
  resumoText:    { fontSize: 7.5, color: C.deep, lineHeight: 1.5, marginBottom: 5 },
  rodapeText:    { fontSize: 6.5, color: C.muted, marginTop: 3, lineHeight: 1.4 },

  // Tabela
  table:          { borderWidth: 1, borderColor: C.border, borderRadius: 3, marginTop: 4 },
  tableHead:      { flexDirection: "row", backgroundColor: C.bg },
  tableRow:       { flexDirection: "row", borderTopWidth: 1, borderColor: C.border },
  tableRowAlt:    { flexDirection: "row", borderTopWidth: 1, borderColor: C.border, backgroundColor: C.light },
  tableCell:      { flex: 1, paddingHorizontal: 5, paddingVertical: 3.5 },
  tableCellWide:  { flex: 1.6, paddingHorizontal: 5, paddingVertical: 3.5 },
  tableCellHead:  { fontSize: 6, fontFamily: FONT_BOLD, color: C.navy },
  tableCellBody:  { fontSize: 6.5, color: C.deep },
  tableNote:      { fontSize: 6, color: C.muted, marginTop: 3 },

  // Item compacto (consistente / N/A)
  compactRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 4.5,
    marginBottom: 2, borderRadius: 3,
    borderWidth: 1, borderColor: C.border,
    backgroundColor: C.light,
  },
  compactCode:  { fontSize: 7, fontFamily: FONT_BOLD, color: C.muted, marginRight: 7, width: 58 },
  compactName:  { fontSize: 7, color: C.muted, flex: 1 },
  compactBadge: { fontSize: 6.5, marginLeft: 6 },
  compactNota:  { fontSize: 6.5, color: C.muted, marginLeft: 6 },

  // Rodapé
  footer: {
    position: "absolute", bottom: 16, left: 36, right: 36,
    flexDirection: "row", alignItems: "center",
  },
  footerLine: { flex: 1, height: 0.5, backgroundColor: C.border },
  footerText: { fontSize: 6, color: C.muted, marginHorizontal: 7 },
  footerPage: { fontSize: 6, color: C.muted, marginLeft: 7 },
});

// ── Sub-componentes ───────────────────────────────────────────────────────────

function TabelaLimpa({ detalhes }: { detalhes: Record<string, any>[] }) {
  const prep = prepareTable(detalhes);
  if (!prep) return null;
  const { keys, rows, totalRows } = prep;

  return (
    <View>
      <View style={s.table}>
        <View style={s.tableHead} wrap={false}>
          {keys.map(k => (
            <View key={k} style={isDescKey(k) ? s.tableCellWide : s.tableCell}>
              <Text style={s.tableCellHead}>{labelKey(k)}</Text>
            </View>
          ))}
        </View>
        {rows.map((row, i) => (
          <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt} wrap={false}>
            {keys.map(k => (
              <View key={k} style={isDescKey(k) ? s.tableCellWide : s.tableCell}>
                <Text style={s.tableCellBody}>{row[k]}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      {(totalRows > MAX_ROWS || keys.length < Object.keys(detalhes[0] ?? {}).length) && (
        <Text style={s.tableNote}>
          {totalRows > MAX_ROWS ? `Exibindo ${MAX_ROWS} de ${totalRows} registros. ` : ""}
          {keys.length < Object.keys(detalhes[0] ?? {}).length ? "Algumas colunas foram omitidas para melhor legibilidade." : ""}
        </Text>
      )}
    </View>
  );
}

function ItemDetalhado({ r }: { r: ResultadoPDF }) {
  const cfg = STATUS_CFG[r.status];
  const temTabela = (r.status === "inconsistente" || r.status === "aviso") && r.detalhes?.length > 0;

  return (
    <View style={s.itemBox}>
      {/* Cabeçalho: mantém junto mesmo se o corpo for para próxima página */}
      <View style={s.itemHeader} wrap={false}>
        <Text style={s.itemCode}>{r.no_verificacao}</Text>
        <Text style={s.itemName}>{r.no_desc}</Text>
        <View style={[s.itemBadge, { backgroundColor: cfg.badgeBg }]}>
          <Text style={[s.itemBadgeText, { color: cfg.badgeText }]}>{cfg.label}</Text>
        </View>
        <Text style={s.itemNota}>{r.nota.toFixed(2)} / {r.nota_max.toFixed(2)}</Text>
      </View>

      {/* Corpo: resumo + tabela (pode fluir para próxima página) */}
      <View style={s.itemBody}>
        <Text style={s.resumoText}>{r.resumo}</Text>
        {temTabela && <TabelaLimpa detalhes={r.detalhes} />}
        {r.observacoes_rodape && (
          <Text style={s.rodapeText}>{r.observacoes_rodape}</Text>
        )}
      </View>
    </View>
  );
}

function ItemCompacto({ r }: { r: ResultadoPDF }) {
  const cfg = STATUS_CFG[r.status];
  return (
    <View style={s.compactRow} wrap={false}>
      <Text style={s.compactCode}>{r.no_verificacao}</Text>
      <Text style={s.compactName}>{trunc(r.no_desc, 70)}</Text>
      <Text style={[s.compactBadge, { color: cfg.badgeText }]}>{cfg.label}</Text>
      <Text style={s.compactNota}>{r.nota.toFixed(2)}/{r.nota_max.toFixed(2)}</Text>
    </View>
  );
}

function SectionHeader({ status, count }: { status: StatusVerificacao; count: number }) {
  const cfg = STATUS_CFG[status];
  return (
    <View style={[s.sectionHeader, { backgroundColor: cfg.secBg }]} wrap={false}>
      <Text style={[s.sectionTitle, { color: cfg.secText }]}>{cfg.sectionLabel}</Text>
      <Text style={[s.sectionCount, { color: cfg.secText }]}>
        — {count} verificaç{count !== 1 ? "ões" : "ão"}
      </Text>
    </View>
  );
}

function Rodape({ municipioNome, anoExercicio }: { municipioNome: string; anoExercicio: string }) {
  return (
    <View style={s.footer} fixed>
      <View style={s.footerLine} />
      <Text style={s.footerText}>
        Verus · VH Contabilidade Pública · {municipioNome} · {anoExercicio}
      </Text>
      <View style={s.footerLine} />
      <Text
        style={s.footerPage}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        fixed
      />
    </View>
  );
}

// ── Documento ─────────────────────────────────────────────────────────────────
const STATUS_ORDER: StatusVerificacao[] = ["inconsistente", "aviso", "consistente", "nao_aplicavel"];

export default function RelatorioPDF({
  resultados, municipioNome, anoExercicio, tipoAnalise,
  executadoEm, kpis, logoUrl,
}: Props) {
  const sg       = calcStatusGeral(kpis);
  const barColor = sg.color;
  const barPct   = `${Math.min(100, Math.max(0, kpis.notaPercent)).toFixed(1)}%`;

  const dataGeracao = (() => {
    try {
      return new Date(executadoEm).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return executadoEm; }
  })();

  // Agrupa por status, preservando a ordem definida
  const byStatus = new Map<StatusVerificacao, ResultadoPDF[]>();
  STATUS_ORDER.forEach(st => {
    const items = resultados.filter(r => r.status === st);
    if (items.length) byStatus.set(st, items);
  });

  const sections = STATUS_ORDER.filter(st => byStatus.has(st));
  const totalNA  = byStatus.get("nao_aplicavel")?.length ?? 0;

  return (
    <Document
      title={`Relatório SICONFI — ${municipioNome} ${anoExercicio}`}
      author="Verus · VH Contabilidade Pública"
      subject={tipoAnalise}
    >
      {/* ── Documento único — capa + verificações em fluxo contínuo ────── */}
      <Page size="A4" style={[s.page, { paddingTop: 26, paddingBottom: 44 }]}>
        {/* marginTop: -26 compensa o paddingTop da Page para o header ficar colado no topo */}
        <View style={[s.coverHeader, { marginTop: -26 }]}>
          <Image src={logoUrl} style={s.coverLogo} />
          <Text style={s.coverTag}>AVALIAÇÃO DE CONFORMIDADE</Text>
        </View>

        <View style={s.coverBody}>
          <Text style={s.coverTitle}>Relatório de Avaliação SICONFI</Text>
          <Text style={s.coverSubtitle}>{tipoAnalise}</Text>

          <View style={s.coverMeta}>
            {[
              { label: "Município",    value: municipioNome },
              { label: "Exercício",    value: anoExercicio  },
              { label: "Gerado em",    value: dataGeracao   },
              { label: "Verificações", value: `${resultados.length} incluídas` },
            ].map(({ label, value }) => (
              <View key={label} style={s.coverMetaItem}>
                <Text style={s.coverMetaLabel}>{label}</Text>
                <Text style={s.coverMetaValue}>{value}</Text>
              </View>
            ))}
          </View>

          {/* Caixa de nota */}
          <View style={s.scoreBox}>
            <View style={s.scoreRow}>
              <Text style={[s.scoreNum, { color: barColor }]}>
                {kpis.notaPercent.toFixed(1)}%
              </Text>
              <View style={s.scoreRight}>
                <Text style={[s.scoreStatus, { color: sg.color }]}>{sg.label}</Text>
                <Text style={s.scorePoints}>
                  {kpis.notaTotal.toFixed(2)} de {kpis.notaMaxima} pontos
                </Text>
              </View>
            </View>

            <View style={s.barTrack}>
              <View style={[s.barFill, { width: barPct, backgroundColor: barColor }]} />
            </View>

            <View style={s.statsRow}>
              {[
                { count: kpis.consistentes,   label: "Consistentes",   color: C.ok   },
                { count: kpis.inconsistentes, label: "Inconsistentes", color: C.err  },
                { count: kpis.avisos,         label: "Avisos",         color: C.warn },
                { count: totalNA,             label: "N/A",            color: C.muted },
              ].map(({ count, label, color }) => (
                <View key={label} style={s.statItem}>
                  <View style={[s.statDot, { backgroundColor: color }]} />
                  <Text style={s.statText}>
                    <Text style={s.statBold}>{count} </Text>{label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={s.metaNota}>
            Este relatório foi gerado automaticamente pelo sistema Verus com base nos dados
            disponíveis na API SICONFI (STN). As avaliações refletem o estado das informações
            no momento da execução e devem ser interpretadas em conjunto com a legislação vigente.
          </Text>

          {/* Verificações — fluem diretamente após o texto acima */}
          {sections.map((statusKey, idx) => {
            const items    = byStatus.get(statusKey)!;
            const isDetail = statusKey === "inconsistente" || statusKey === "aviso";

            return (
              <View key={statusKey} style={[s.sectionWrap, { marginTop: idx === 0 ? 10 : 0 }]}
                break={idx > 0 && isDetail}>
                <SectionHeader status={statusKey} count={items.length} />
                {isDetail
                  ? items.map(r => <ItemDetalhado key={r.no_verificacao} r={r} />)
                  : items.map(r => <ItemCompacto  key={r.no_verificacao} r={r} />)
                }
              </View>
            );
          })}
        </View>

        <Rodape municipioNome={municipioNome} anoExercicio={anoExercicio} />
      </Page>
    </Document>
  );
}
