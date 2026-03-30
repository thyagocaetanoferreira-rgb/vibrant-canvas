import { useState } from "react";
import {
  ClipboardCheck, Play, Loader2, Database,
  History, ChevronDown, ChevronRight, Check, ChevronsUpDown, X,
  MoreHorizontal, FileDown, ExternalLink, Trophy,
  MapPin, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useSimulacao } from "./hooks/useSimulacao";
import ResumoNotas from "./components/ResumoNotas";
import ListaVerificacoes from "./components/ListaVerificacoes";
import ModalExportarPDF from "./components/ModalExportarPDF";
import { TIPOS_ANALISE, TIPOS_IMPLEMENTADOS, STATUS_GERAL_META, STATUS_META } from "./constants";

export default function SimuladorPage() {
  const {
    municipio,
    municipioId,
    anoExercicio,
    tipoSelecionado,
    setTipoSelecionado,
    resultado,
    setResultado,
    histAberto,
    setHistAberto,
    implementado,
    tipoInfo,
    historico,
    validarMutation,
    kpis,
  } = useSimulacao();

  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroCodigo, setFiltroCodigo] = useState<string>("");
  const [codigoOpen, setCodigoOpen] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<string>("resultado");
  const [modalPdfAberto, setModalPdfAberto] = useState(false);

  const opcoesCodeigo = resultado?.resultados.map(r => ({
    value: r.no_verificacao,
    label: `${r.no_verificacao} — ${r.no_desc}`,
  })) ?? [];

  const resultadosFiltrados = resultado?.resultados.filter(r => {
    const okStatus = filtroStatus === "todos" || r.status === filtroStatus;
    const okCodigo = !filtroCodigo || r.no_verificacao === filtroCodigo;
    return okStatus && okCodigo;
  }) ?? [];

  const navItems = [
    { value: "resultado", label: "Resultado",  icon: ClipboardCheck },
    { value: "historico", label: "Histórico",  icon: History },
  ];

  return (
    <>
    <div className="space-y-6">

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-gradient-to-r from-[#008ded] to-[#00bfcf]">
              <ClipboardCheck className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#033e66]">Simulador Verus</h1>
          </div>
          <p className="text-sm text-[#045ba3]">
            Avalia a Qualidade da Informação Contábil e Fiscal
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

      {/* ── Banner de Filtros ──────────────────────────────────────────────── */}
      <Card className="bg-white shadow-sm rounded-xl border-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-stretch">

            {/* ── Bloco esquerdo — Tipo de Análise + Navegação ────────────────── */}
            <div className="flex flex-col gap-0 min-w-[220px] border-r border-[#e3eef6]">

              {/* Tipo de Análise */}
              <div className="flex flex-col gap-1.5 px-4 pt-4 pb-3">
                <label className="text-xs text-[#045ba3] font-bold uppercase tracking-wide">Tipo de Análise</label>
                <Select
                  value={tipoSelecionado}
                  onValueChange={(v) => { setTipoSelecionado(v); setResultado(null); }}
                >
                  <SelectTrigger
                    className="h-9 text-sm border-0 text-white font-semibold focus:ring-0 focus:ring-offset-0 [&>svg]:text-white/80 [&_span]:text-white rounded-lg"
                    style={{ backgroundColor: "#033e66" }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_ANALISE.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2">
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
                {!implementado && (
                  <p className="text-[10px] text-[#b45309]">Estará disponível em breve</p>
                )}
              </div>

              {/* Divisor */}
              <div className="border-t border-[#e3eef6] mx-4" />

              {/* Navegação Resultado / Histórico */}
              <nav className="flex flex-col gap-0.5 px-2 py-2">
                {navItems.map(({ value, label, icon: Icon }) => {
                  const ativo = abaAtiva === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setAbaAtiva(value)}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                        ativo
                          ? "bg-[#e3eef6] text-[#033e66]"
                          : "text-[#045ba3]/60 hover:bg-[#e3eef6]/50 hover:text-[#045ba3]"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 flex-shrink-0", ativo ? "text-[#008ded]" : "text-[#045ba3]/40")} />
                      <span>{label}</span>
                      {value === "historico" && historico.length > 0 && (
                        <Badge
                          className="ml-auto h-4 text-[10px] px-1.5 font-semibold"
                          style={{ backgroundColor: ativo ? "#008ded20" : "#e3eef6", color: ativo ? "#008ded" : "#045ba3", border: "none" }}
                        >
                          {historico.length}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* ── Bloco direito — Filtros e Ações ─────────────────────────────── */}
            <div className="flex flex-wrap items-end gap-3 px-5 py-4 flex-1">
              <div className="w-full flex items-center justify-between flex-wrap gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#045ba3]/50">Filtros e Ações</span>
                <div className="flex items-center gap-2">
                  {municipio?.municipioNome && (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: "#033e6612", color: "#033e66", border: "1px solid #033e6625" }}
                    >
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {municipio.municipioNome}
                    </span>
                  )}
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: "#008ded12", color: "#008ded", border: "1px solid #008ded25" }}
                  >
                    <CalendarDays className="w-3 h-3 flex-shrink-0" />
                    {anoExercicio}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5 min-w-[190px]">
                <label className="text-xs text-[#045ba3] font-medium">Status</label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="h-9 text-sm border-[#e3eef6] text-[#045ba3]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    {(["consistente", "inconsistente", "aviso", "nao_aplicavel"] as const).map(s => {
                      const m = STATUS_META[s];
                      return (
                        <SelectItem key={s} value={s}>
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: m.textColor }}
                            />
                            {m.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Código da Verificação */}
              <div className="space-y-1.5 min-w-[270px]">
                <label className="text-xs text-[#045ba3] font-medium">Código da Verificação</label>
                <div className="flex items-center gap-1">
                  <Popover open={codigoOpen} onOpenChange={setCodigoOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={codigoOpen}
                        disabled={opcoesCodeigo.length === 0}
                        className="h-9 flex-1 justify-between border-[#e3eef6] text-[#045ba3] font-normal text-sm hover:bg-[#e3eef6]/40 hover:text-[#033e66]"
                      >
                        <span className="truncate">
                          {filtroCodigo
                            ? opcoesCodeigo.find(o => o.value === filtroCodigo)?.value ?? filtroCodigo
                            : "Todos os códigos"}
                        </span>
                        <ChevronsUpDown className="w-3.5 h-3.5 text-[#6b7280] ml-2 flex-shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[380px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Pesquisar código..." className="h-9 text-sm" />
                        <CommandList>
                          <CommandEmpty className="py-3 text-center text-xs text-[#6b7280]">
                            Nenhum código encontrado.
                          </CommandEmpty>
                          <CommandGroup>
                            {opcoesCodeigo.map(o => (
                              <CommandItem
                                key={o.value}
                                value={o.label}
                                onSelect={() => {
                                  setFiltroCodigo(o.value === filtroCodigo ? "" : o.value);
                                  setCodigoOpen(false);
                                }}
                                className="text-xs cursor-pointer"
                              >
                                <Check className={cn("mr-2 h-3.5 w-3.5 flex-shrink-0", filtroCodigo === o.value ? "opacity-100 text-[#008ded]" : "opacity-0")} />
                                <span className="font-mono text-[#045ba3] mr-1.5">{o.value}</span>
                                <span className="text-[#6b7280] truncate">{o.label.split("—")[1]?.trim()}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {filtroCodigo && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 flex-shrink-0 border-[#e3eef6] text-[#6b7280] hover:text-[#ef4444] hover:border-[#ef444440] hover:bg-[#ef444408]"
                      onClick={() => setFiltroCodigo("")}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="space-y-1.5 ml-auto">
                <label className="text-xs text-[#045ba3] font-medium opacity-0 select-none">Ações</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 gap-1.5 border-[#e3eef6] text-[#045ba3] font-medium text-sm hover:bg-[#e3eef6]/40 hover:text-[#033e66]"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                      Ações
                      <ChevronDown className="w-3 h-3 text-[#6b7280]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem
                      className="gap-2 cursor-pointer text-sm"
                      onClick={() => setAbaAtiva("historico")}
                    >
                      <History className="w-4 h-4 text-[#008ded]" />
                      Ver Histórico
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2 cursor-pointer text-sm">
                        <FileDown className="w-4 h-4 text-[#008ded]" />
                        Exportar em PDF
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-44">
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer text-sm"
                          disabled={!resultado}
                          onClick={() => resultado && setModalPdfAberto(true)}
                        >
                          Exportar Resultado
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer text-sm" disabled>
                          Exportar Desempenho
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem className="gap-2 cursor-pointer text-sm" disabled>
                      <Trophy className="w-4 h-4 text-[#008ded]" />
                      Ver Ranking VH
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 cursor-pointer text-sm" disabled>
                      <ExternalLink className="w-4 h-4 text-[#008ded]" />
                      Ir para Site do Siconfi
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ── KPI Cards + Nota ───────────────────────────────────────────────── */}
      {kpis && <ResumoNotas kpis={kpis} />}

      {/* ── Conteúdo: Resultado ────────────────────────────────────────────── */}
      {abaAtiva === "resultado" && (
        <div className="space-y-4">
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
            <ListaVerificacoes
              resultados={resultadosFiltrados}
              total={resultado.resultados.length}
              executado_em={resultado.executado_em}
              tipo={resultado.tipo}
            />
          )}
        </div>
      )}

      {/* ── Conteúdo: Histórico ────────────────────────────────────────────── */}
      {abaAtiva === "historico" && (
        <div className="space-y-4">
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

              {histAberto !== null && (() => {
                const h = historico.find(x => x.id === histAberto);
                if (!h || !h.resultado_json?.length) return null;
                return (
                  <ListaVerificacoes
                    resultados={h.resultado_json}
                    executado_em={h.executado_em}
                    tipo={h.tipo_analise}
                  />
                );
              })()}
            </>
          )}
        </div>
      )}

    </div>

    {/* ── Modal Exportar PDF ─────────────────────────────────────────────── */}
    {resultado && kpis && (
      <ModalExportarPDF
        aberto={modalPdfAberto}
        onFechar={() => setModalPdfAberto(false)}
        resultados={resultado.resultados}
        municipioNome={municipio?.municipioNome ?? ""}
        anoExercicio={anoExercicio}
        tipoAnalise={tipoInfo?.label ?? tipoSelecionado}
        executadoEm={resultado.executado_em}
        kpis={kpis}
      />
    )}
    </>
  );
}
