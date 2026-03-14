import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, CheckCircle2, AlertTriangle, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  calcReceitaPrevistaMes, calcTotalEmpenhado, calcResFinanceiroEmpenhado,
  statusEducacao, statusFundeb, statusSaude, statusPessoal,
  formatBRL, formatPct, LABEL_STATUS,
} from "@/lib/calculos-lrf";
import { cn } from "@/lib/utils";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const currentYear = new Date().getFullYear();
const ANOS = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

type FormData = Record<string, any>;

const numVal = (v: any): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

const MoneyInput = ({ label, value, onChange, required, hint }: { label: string; value: any; onChange: (v: string) => void; required?: boolean; hint?: string }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium text-card-foreground">
      {label} {required && <span className="text-destructive">*</span>}
    </Label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
      <Input
        type="text"
        inputMode="decimal"
        className="pl-10"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0,00"
      />
    </div>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const PctInput = ({ label, value, onChange }: { label: string; value: any; onChange: (v: string) => void }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium text-card-foreground">{label}</Label>
    <div className="relative">
      <Input
        type="text"
        inputMode="decimal"
        className="pr-8"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0,00"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
    </div>
  </div>
);

const statusColors: Record<string, string> = {
  ok: "bg-success/10 text-success border-success/20",
  alerta: "bg-warning/10 text-warning border-warning/20",
  prudencial: "bg-warning/10 text-warning border-warning/20",
  excedido: "bg-destructive/10 text-destructive border-destructive/20",
  pendente: "bg-muted text-muted-foreground border-border",
};

const DiagnosticoFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { municipio, usuario, anoExercicio } = useAppContext();

  const [form, setForm] = useState<FormData>({
    mes_referencia: "",
    ano_referencia: anoExercicio,
    observacoes: "",
  });
  const [existeAlerta, setExisteAlerta] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResumo, setShowResumo] = useState(false);
  const [savedData, setSavedData] = useState<FormData | null>(null);

  const set = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  // Load existing if editing
  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      const { data } = await supabase.from("lancamentos_mensais").select("*").eq("id", id).single();
      if (data) {
        setForm(data);
      }
    };
    load();
  }, [id, isEdit]);

  // Check if lancamento already exists for selected period
  useEffect(() => {
    if (!municipio || !form.mes_referencia || !form.ano_referencia || isEdit) {
      setExisteAlerta(false);
      return;
    }
    const check = async () => {
      const { data } = await supabase
        .from("lancamentos_mensais")
        .select("id")
        .eq("cliente_id", municipio.clienteId)
        .eq("mes_referencia", Number(form.mes_referencia))
        .eq("ano_referencia", Number(form.ano_referencia))
        .maybeSingle();
      setExisteAlerta(!!data);
    };
    check();
  }, [municipio, form.mes_referencia, form.ano_referencia, isEdit]);

  // Pre-fill receita_prevista_ano from previous month
  useEffect(() => {
    if (!municipio || !form.mes_referencia || !form.ano_referencia || isEdit || form.receita_prevista_ano) return;
    const prefill = async () => {
      const mesNum = Number(form.mes_referencia);
      if (mesNum <= 1) return;
      const { data } = await supabase
        .from("lancamentos_mensais")
        .select("receita_prevista_ano")
        .eq("cliente_id", municipio.clienteId)
        .eq("ano_referencia", Number(form.ano_referencia))
        .eq("mes_referencia", mesNum - 1)
        .maybeSingle();
      if (data?.receita_prevista_ano) {
        set("receita_prevista_ano", data.receita_prevista_ano);
      }
    };
    prefill();
  }, [form.mes_referencia, form.ano_referencia, municipio, isEdit]);

  // Fetch accumulated revenue from previous months
  const [receitaAcumuladaAnterior, setReceitaAcumuladaAnterior] = useState<number>(0);
  const [loadingAcumulada, setLoadingAcumulada] = useState(false);

  useEffect(() => {
    if (!municipio || !form.mes_referencia || !form.ano_referencia) {
      setReceitaAcumuladaAnterior(0);
      return;
    }
    const mesNum = Number(form.mes_referencia);
    if (mesNum <= 1) {
      setReceitaAcumuladaAnterior(0);
      return;
    }
    const fetchAcumulada = async () => {
      setLoadingAcumulada(true);
      const { data } = await supabase
        .from("lancamentos_mensais")
        .select("receita_realizada")
        .eq("cliente_id", municipio.clienteId)
        .eq("ano_referencia", Number(form.ano_referencia))
        .lt("mes_referencia", mesNum);
      
      const total = (data || []).reduce((acc, row) => acc + numVal(row.receita_realizada), 0);
      setReceitaAcumuladaAnterior(total);
      setLoadingAcumulada(false);
    };
    fetchAcumulada();
  }, [municipio, form.mes_referencia, form.ano_referencia]);

  const receitaMesAtual = numVal(form.receita_realizada);
  const receitaAcumuladaTotal = receitaAcumuladaAnterior + receitaMesAtual;

  // Calculated values
  const recPrevMes = useMemo(() => calcReceitaPrevistaMes(numVal(form.receita_prevista_ano)), [form.receita_prevista_ano]);
  const totalEmpenhado = useMemo(() => calcTotalEmpenhado(numVal(form.despesa_empenhada_f1), numVal(form.despesa_empenhada_f2)), [form.despesa_empenhada_f1, form.despesa_empenhada_f2]);
  const resFinEmpenhado = useMemo(() => calcResFinanceiroEmpenhado(numVal(form.caixa), numVal(form.despesa_nao_processada), numVal(form.consignacoes_tesouraria)), [form.caixa, form.despesa_nao_processada, form.consignacoes_tesouraria]);


  const handleSave = async (status: "rascunho" | "finalizado") => {
    if (!municipio || !usuario) {
      toast.error("Município ou usuário não encontrado");
      return;
    }
    if (!form.mes_referencia || !form.ano_referencia) {
      toast.error("Selecione o mês e ano de referência");
      return;
    }

    if (status === "finalizado") {
      const requiredFields: Record<string, string> = {
        receita_prevista_ano: "Receita Prevista Ano",
        receita_realizada: "Receita Realizada",
        despesa_liquidada: "Despesa Liquidada",
        despesa_paga: "Despesa Paga",
        caixa: "Caixa",
        receita_impostos: "Receita de Impostos (Educação)",
        aplicacao_educacao: "Aplicação em MDE (Educação)",
        receita_fundeb: "Receita FUNDEB",
        aplicacao_fundeb_70: "Aplicação FUNDEB 70%",
        receita_corrente_liquida: "Receita Corrente Líquida",
        aplicacao_saude: "Aplicação em Saúde",
        gasto_pessoal: "Gasto com Pessoal",
      };
      const missing = Object.entries(requiredFields).filter(([f]) => {
        const v = form[f];
        return v === null || v === undefined || v === "" || v === null;
      });
      if (missing.length > 0) {
        const names = missing.map(([, label]) => label).join(", ");
        toast.error(`Campos obrigatórios não preenchidos: ${names}`);
        return;
      }
    }

    setLoading(true);
    const numFields = [
      "receita_prevista_ano","receita_realizada","despesa_fixada","despesa_empenhada_f1","despesa_empenhada_f2",
      "despesa_liquidada","despesa_paga","caixa","despesa_nao_processada","despesa_processada",
      "consignacoes_tesouraria","resto_nao_processado","resto_processado",
      "supl_anulacao_perc","supl_anulacao_autorizada","supl_anulacao_utilizado",
      "supl_superavit_perc","superavit_exerc_anterior","supl_superavit_autorizada","supl_superavit_utilizado",
      "supl_excesso_perc","excesso_projetado","supl_excesso_utilizado",
      "receita_impostos","aplicacao_educacao","receita_fundeb","aplicacao_fundeb_70","aplicacao_saude",
      "receita_corrente_liquida","gasto_pessoal",
    ];

    const payload: Record<string, any> = {
      cliente_id: municipio.clienteId,
      mes_referencia: Number(form.mes_referencia),
      ano_referencia: Number(form.ano_referencia),
      status,
      observacoes: form.observacoes || null,
      criado_por: usuario.id,
    };

    numFields.forEach((f) => {
      const v = form[f];
      payload[f] = v !== "" && v !== null && v !== undefined ? numVal(v) : null;
    });

    let error;
    if (isEdit) {
      const res = await supabase.from("lancamentos_mensais").update(payload).eq("id", id);
      error = res.error;
    } else {
      const res = await supabase.from("lancamentos_mensais").upsert(payload as any, {
        onConflict: "cliente_id,mes_referencia,ano_referencia",
      });
      error = res.error;
    }

    setLoading(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }

    setSavedData({ ...payload, status });
    setShowResumo(true);
    toast.success("Lançamento salvo com sucesso!");
  };

  const ResumoField = ({ label, value }: { label: string; value: any }) => {
    if (value === null || value === undefined || value === "") return null;
    return (
      <div className="flex justify-between py-1">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className="text-sm font-medium text-card-foreground">{typeof value === "number" ? formatBRL(value) : value}</span>
      </div>
    );
  };

  const IndiceResumo = ({ label, value, statusFn }: { label: string; value: number | null; statusFn: (v: number | null) => string }) => {
    const s = statusFn(value) as any;
    return (
      <div className={cn("flex items-center justify-between rounded-lg border px-3 py-2", statusColors[s])}>
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-bold">{formatPct(value)} — {LABEL_STATUS[s as keyof typeof LABEL_STATUS]}</span>
      </div>
    );
  };

  if (!municipio) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione um município para continuar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/diagnostico")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            {isEdit ? "Editar Lançamento" : "Novo Lançamento"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Diagnóstico Fiscal</p>
        </div>
      </div>

      {/* Context card */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">📍 {municipio.municipioNome}</Badge>
          <span className="text-xs text-muted-foreground">(município do contexto, não editável)</span>
        </div>
        <div className="flex gap-4">
          <div className="w-48">
            <Label className="text-xs mb-1 block">Mês *</Label>
            <Select value={String(form.mes_referencia)} onValueChange={(v) => set("mes_referencia", v)} disabled={isEdit}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <Label className="text-xs mb-1 block">Ano *</Label>
            <Select value={String(form.ano_referencia)} onValueChange={(v) => set("ano_referencia", v)} disabled={isEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ANOS.map((a) => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {existeAlerta && (
          <div className="flex items-center gap-2 text-warning text-sm bg-warning/10 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4" />
            Já existe um lançamento para este período. Os dados serão substituídos ao salvar.
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="receitas" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-auto p-1 bg-gradient-to-r from-[hsl(186,100%,41%)] via-[hsl(207,100%,46%)] to-[hsl(209,96%,33%)] rounded-xl shadow-md">
          <TabsTrigger value="receitas" className="rounded-lg py-2.5 px-3 text-xs font-semibold text-white/80 transition-all data-[state=active]:bg-white data-[state=active]:text-[hsl(209,96%,33%)] data-[state=active]:shadow-lg data-[state=active]:font-bold hover:text-white hover:bg-white/15">1. Receitas</TabsTrigger>
          <TabsTrigger value="despesas" className="rounded-lg py-2.5 px-3 text-xs font-semibold text-white/80 transition-all data-[state=active]:bg-white data-[state=active]:text-[hsl(209,96%,33%)] data-[state=active]:shadow-lg data-[state=active]:font-bold hover:text-white hover:bg-white/15">2. Despesas</TabsTrigger>
          <TabsTrigger value="caixa" className="rounded-lg py-2.5 px-3 text-xs font-semibold text-white/80 transition-all data-[state=active]:bg-white data-[state=active]:text-[hsl(209,96%,33%)] data-[state=active]:shadow-lg data-[state=active]:font-bold hover:text-white hover:bg-white/15">3. Caixa</TabsTrigger>
          <TabsTrigger value="suplementacao" className="rounded-lg py-2.5 px-3 text-xs font-semibold text-white/80 transition-all data-[state=active]:bg-white data-[state=active]:text-[hsl(209,96%,33%)] data-[state=active]:shadow-lg data-[state=active]:font-bold hover:text-white hover:bg-white/15">4. Suplementação</TabsTrigger>
          <TabsTrigger value="indices" className="rounded-lg py-2.5 px-3 text-xs font-semibold text-white/80 transition-all data-[state=active]:bg-white data-[state=active]:text-[hsl(209,96%,33%)] data-[state=active]:shadow-lg data-[state=active]:font-bold hover:text-white hover:bg-white/15">5. Índices LRF</TabsTrigger>
        </TabsList>

        {/* ABA 1 — RECEITAS */}
        <TabsContent value="receitas" className="bg-card rounded-xl border border-border p-6 space-y-4 mt-4">
          <h3 className="font-heading font-semibold text-card-foreground">Receitas</h3>
          <MoneyInput label="Receita Prevista Ano (Orçamentária)" value={form.receita_prevista_ano} onChange={(v) => set("receita_prevista_ano", v)} required hint="Valor anual (LOA). Será dividido por 12 automaticamente." />
          <div className="bg-muted/30 rounded-lg px-4 py-2 text-sm text-muted-foreground">
            Receita Prevista Mensal: <span className="font-medium text-card-foreground">{formatBRL(recPrevMes)}</span> (= Ano ÷ 12)
          </div>
          <MoneyInput label="Receita Realizada" value={form.receita_realizada} onChange={(v) => set("receita_realizada", v)} required />

          {/* Totalizer - Receita Acumulada */}
          {form.mes_referencia && (
            <div className="mt-4 rounded-xl border border-[hsl(207,100%,46%)]/20 bg-gradient-to-r from-[hsl(186,100%,41%)]/5 via-[hsl(207,100%,46%)]/5 to-[hsl(209,96%,33%)]/5 p-4 space-y-2">
              <h4 className="text-sm font-semibold text-[hsl(209,96%,33%)] flex items-center gap-2">
                📊 Receita Acumulada no Exercício
                <span className="text-xs font-normal text-muted-foreground">
                  (Ref. Anexo 10 — Lei 4.320/64)
                </span>
              </h4>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Acumulado até {Number(form.mes_referencia) > 1 ? MESES[Number(form.mes_referencia) - 2] : "—"}:
                  </span>
                  <span className="font-medium text-card-foreground">
                    {loadingAcumulada ? "Carregando..." : formatBRL(receitaAcumuladaAnterior)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Receita lançada ({MESES[Number(form.mes_referencia) - 1]}):
                  </span>
                  <span className="font-medium text-card-foreground">{formatBRL(receitaMesAtual)}</span>
                </div>
                <div className="border-t border-[hsl(207,100%,46%)]/20 pt-1.5 flex justify-between text-sm">
                  <span className="font-semibold text-[hsl(209,96%,33%)]">
                    Total Acumulado ({MESES[Number(form.mes_referencia) - 1]}):
                  </span>
                  <span className="font-bold text-[hsl(207,100%,46%)] text-base">
                    {loadingAcumulada ? "..." : formatBRL(receitaAcumuladaTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-2.5 text-xs text-warning">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span><strong>Atenção!</strong> Este valor da receita realizada deve considerar a receita de todos os órgãos, exceto Fundo de Previdência Social (RPPS).</span>
          </div>
        </TabsContent>

        {/* ABA 2 — DESPESAS */}
        <TabsContent value="despesas" className="bg-card rounded-xl border border-border p-6 space-y-4 mt-4">
          <h3 className="font-heading font-semibold text-card-foreground">Despesas</h3>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium text-card-foreground">Despesa Empenhada</Label>
            <div className="grid grid-cols-2 gap-4">
              <MoneyInput label="Fonte 1" value={form.despesa_empenhada_f1} onChange={(v) => set("despesa_empenhada_f1", v)} required />
              <MoneyInput label="Fonte 2" value={form.despesa_empenhada_f2} onChange={(v) => set("despesa_empenhada_f2", v)} required />
            </div>
            <div className="bg-muted/30 rounded-lg px-4 py-2 text-sm text-muted-foreground">
              Total Empenhado (calculado): <span className="font-medium text-card-foreground">{formatBRL(totalEmpenhado)}</span>
            </div>
          </div>
          <MoneyInput label="Despesa Liquidada" value={form.despesa_liquidada} onChange={(v) => set("despesa_liquidada", v)} required />
          <MoneyInput label="Despesa Paga" value={form.despesa_paga} onChange={(v) => set("despesa_paga", v)} required />
        </TabsContent>

        {/* ABA 3 — CAIXA */}
        <TabsContent value="caixa" className="bg-card rounded-xl border border-border p-6 space-y-4 mt-4">
          <h3 className="font-heading font-semibold text-card-foreground">Disponibilidade de Caixa</h3>
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-2.5 text-xs text-warning">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span><strong>Atenção!</strong> Os lançamentos devem considerar o montante acumulado (até o mês de referência).</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MoneyInput label="Caixa" value={form.caixa} onChange={(v) => set("caixa", v)} required />
            <MoneyInput label="Consignações / Tesouraria" value={form.consignacoes_tesouraria} onChange={(v) => set("consignacoes_tesouraria", v)} required />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <MoneyInput label="Despesa não processada" value={form.despesa_nao_processada} onChange={(v) => set("despesa_nao_processada", v)} required />
            <MoneyInput label="Despesa Processada" value={form.despesa_processada} onChange={(v) => set("despesa_processada", v)} required />
            <MoneyInput label="Resto não processado" value={form.resto_nao_processado} onChange={(v) => set("resto_nao_processado", v)} required />
            <MoneyInput label="Resto processado" value={form.resto_processado} onChange={(v) => set("resto_processado", v)} required />
          </div>
          <div className="bg-muted/30 rounded-lg px-4 py-3 text-sm text-muted-foreground space-y-1">
            <p>Resultado Financeiro (calculado):</p>
            <p>Empenhado: <span className="font-medium text-card-foreground">{formatBRL(resFinEmpenhado)}</span></p>
            <p className="text-xs">(= Caixa − Desp. não proc. − Consignações)</p>
          </div>
        </TabsContent>

        {/* ABA 4 — SUPLEMENTAÇÃO */}
        <TabsContent value="suplementacao" className="bg-card rounded-xl border border-border p-6 space-y-2 mt-4">
          <h3 className="font-heading font-semibold text-card-foreground mb-2">Suplementação</h3>
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="anulacao">
              <AccordionTrigger className="text-sm">Suplementação por Anulação de Dotação</AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <PctInput label="Percentual Autorizado (%)" value={form.supl_anulacao_perc} onChange={(v) => set("supl_anulacao_perc", v)} />
                  <MoneyInput label="Valor Autorizado" value={form.supl_anulacao_autorizada} onChange={(v) => set("supl_anulacao_autorizada", v)} />
                </div>
                <MoneyInput label="Crédito Utilizado — Mensal" value={form.supl_anulacao_utilizado} onChange={(v) => set("supl_anulacao_utilizado", v)} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="superavit">
              <AccordionTrigger className="text-sm">Suplementação por Superávit Financeiro</AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <PctInput label="Percentual (%)" value={form.supl_superavit_perc} onChange={(v) => set("supl_superavit_perc", v)} />
                  <MoneyInput label="Superávit Exercício Anterior" value={form.superavit_exerc_anterior} onChange={(v) => set("superavit_exerc_anterior", v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <MoneyInput label="Autorizada" value={form.supl_superavit_autorizada} onChange={(v) => set("supl_superavit_autorizada", v)} />
                  <MoneyInput label="Utilizado" value={form.supl_superavit_utilizado} onChange={(v) => set("supl_superavit_utilizado", v)} />
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="excesso">
              <AccordionTrigger className="text-sm">Suplementação por Excesso de Arrecadação</AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <PctInput label="Percentual (%)" value={form.supl_excesso_perc} onChange={(v) => set("supl_excesso_perc", v)} />
                  <MoneyInput label="Excesso Projetado" value={form.excesso_projetado} onChange={(v) => set("excesso_projetado", v)} />
                </div>
                <MoneyInput label="Utilizado" value={form.supl_excesso_utilizado} onChange={(v) => set("supl_excesso_utilizado", v)} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* ABA 5 — ÍNDICES LRF */}
        <TabsContent value="indices" className="bg-card rounded-xl border border-border p-6 space-y-6 mt-4">
          <h3 className="font-heading font-semibold text-card-foreground">Índices LRF</h3>
          <p className="text-xs text-muted-foreground">Informe os valores de receita e despesa/aplicação. O índice será calculado automaticamente.</p>

          {/* Educação MDE */}
          <div className="space-y-3 rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold text-card-foreground">📚 Educação (MDE)</h4>
            <div className="grid grid-cols-2 gap-4">
              <MoneyInput label="Receita de Impostos *" value={form.receita_impostos} onChange={(v) => set("receita_impostos", v)} required />
              <MoneyInput label="Aplicação em MDE *" value={form.aplicacao_educacao} onChange={(v) => set("aplicacao_educacao", v)} required />
            </div>
            <IndiceResumo label="Índice de Educação" value={indiceEducacao} statusFn={statusEducacao} />
          </div>

          {/* FUNDEB */}
          <div className="space-y-3 rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold text-card-foreground">🎓 FUNDEB (70%)</h4>
            <div className="grid grid-cols-2 gap-4">
              <MoneyInput label="Receita FUNDEB *" value={form.receita_fundeb} onChange={(v) => set("receita_fundeb", v)} required />
              <MoneyInput label="Aplicação FUNDEB 70% *" value={form.aplicacao_fundeb_70} onChange={(v) => set("aplicacao_fundeb_70", v)} required />
            </div>
            <IndiceResumo label="Índice FUNDEB" value={indiceFundeb} statusFn={statusFundeb} />
          </div>

          {/* Saúde + Pessoal compartilham RCL */}
          <div className="space-y-3 rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold text-card-foreground">💰 Receita Corrente Líquida (RCL)</h4>
            <MoneyInput label="Receita Corrente Líquida *" value={form.receita_corrente_liquida} onChange={(v) => set("receita_corrente_liquida", v)} required hint="Utilizada como base para os índices de Saúde e Pessoal." />
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold text-card-foreground">🏥 Saúde (ASPS)</h4>
            <MoneyInput label="Aplicação em Saúde *" value={form.aplicacao_saude} onChange={(v) => set("aplicacao_saude", v)} required />
            <IndiceResumo label="Índice de Saúde" value={indiceSaude} statusFn={statusSaude} />
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4">
            <h4 className="text-sm font-semibold text-card-foreground">👥 Pessoal (LRF)</h4>
            <MoneyInput label="Gasto com Pessoal *" value={form.gasto_pessoal} onChange={(v) => set("gasto_pessoal", v)} required />
            <IndiceResumo label="Índice de Pessoal" value={indicePessoal} statusFn={statusPessoal} />
          </div>

          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Educação: mínimo 25% ✅ | FUNDEB 70%: mínimo 70% ✅ | Saúde: mínimo 15% ✅</p>
            <p>Pessoal: ≤48,6% ✅ | 48,6-51,3% ⚠️ Alerta | 51,3-54% 🟠 Prudencial | &gt;54% 🔴 Excedido</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Observações */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-2">
        <Label className="text-sm font-medium text-card-foreground">Observações (opcional)</Label>
        <Textarea value={form.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} placeholder="Notas ou observações sobre este lançamento..." rows={3} />
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-3 flex items-center justify-end gap-3 z-50">
        <Button variant="outline" onClick={() => navigate("/diagnostico")} disabled={loading}>Cancelar</Button>
        <Button variant="secondary" onClick={() => handleSave("rascunho")} disabled={loading}>
          <Save className="w-4 h-4 mr-1" /> Salvar Rascunho
        </Button>
        <Button onClick={() => handleSave("finalizado")} disabled={loading}>
          <CheckCircle2 className="w-4 h-4 mr-1" /> Salvar e Finalizar
        </Button>
      </div>

      {/* Modal Resumo */}
      <Dialog open={showResumo} onOpenChange={setShowResumo}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" /> Lançamento Salvo com Sucesso
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              📍 {municipio?.municipioNome} · {savedData ? `${MESES[(savedData.mes_referencia || 1) - 1]} / ${savedData.ano_referencia}` : ""}
            </p>
          </DialogHeader>
          {savedData && (
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-card-foreground mb-1">Receitas</h4>
                <ResumoField label="Receita Prevista (Ano)" value={savedData.receita_prevista_ano} />
                <ResumoField label="Receita Prevista (Mês)" value={savedData.receita_prevista_ano ? calcReceitaPrevistaMes(savedData.receita_prevista_ano) : null} />
                <ResumoField label="Receita Realizada" value={savedData.receita_realizada} />
              </div>
              <div>
                <h4 className="font-semibold text-card-foreground mb-1">Despesas</h4>
                <ResumoField label="Despesa Fixada" value={savedData.despesa_fixada} />
                <ResumoField label="Empenhada F1" value={savedData.despesa_empenhada_f1} />
                <ResumoField label="Empenhada F2" value={savedData.despesa_empenhada_f2} />
                <ResumoField label="Total Empenhado" value={calcTotalEmpenhado(savedData.despesa_empenhada_f1 || 0, savedData.despesa_empenhada_f2 || 0) || null} />
                <ResumoField label="Despesa Liquidada" value={savedData.despesa_liquidada} />
                <ResumoField label="Despesa Paga" value={savedData.despesa_paga} />
              </div>
              <div>
                <h4 className="font-semibold text-card-foreground mb-1">Disponibilidade de Caixa</h4>
                <ResumoField label="Caixa" value={savedData.caixa} />
                <ResumoField label="Desp. não processada" value={savedData.despesa_nao_processada} />
                <ResumoField label="Desp. Processada" value={savedData.despesa_processada} />
                <ResumoField label="Consignações" value={savedData.consignacoes_tesouraria} />
                <ResumoField label="Resto não processado" value={savedData.resto_nao_processado} />
                <ResumoField label="Resto processado" value={savedData.resto_processado} />
                <ResumoField label="Res. Fin. Empenhado" value={calcResFinanceiroEmpenhado(savedData.caixa || 0, savedData.despesa_nao_processada || 0, savedData.consignacoes_tesouraria || 0)} />
              </div>
              <div>
                <h4 className="font-semibold text-card-foreground mb-1">Índices LRF</h4>
                <div className="grid grid-cols-2 gap-2">
                  <IndiceResumo label="Educação" value={numVal(savedData.aplicacao_educacao) / 100 || null} statusFn={statusEducacao} />
                  <IndiceResumo label="FUNDEB" value={numVal(savedData.aplicacao_fundeb_70) / 100 || null} statusFn={statusFundeb} />
                  <IndiceResumo label="Saúde" value={numVal(savedData.aplicacao_saude) / 100 || null} statusFn={statusSaude} />
                  <IndiceResumo label="Pessoal" value={numVal(savedData.gasto_pessoal) / 100 || null} statusFn={statusPessoal} />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
                <span>Status: {savedData.status === "finalizado" ? "🔒 Finalizado" : "📝 Rascunho"}</span>
                <span>· Salvo em: {new Date().toLocaleString("pt-BR")}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1" /> Imprimir Resumo
            </Button>
            <Button size="sm" onClick={() => { setShowResumo(false); navigate("/diagnostico"); }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Reusable indice badge for the form
const IndiceResumo = ({ label, value, statusFn }: { label: string; value: number | null; statusFn: (v: number | null) => any }) => {
  const s = statusFn(value);
  const colors: Record<string, string> = {
    ok: "bg-success/10 text-success border-success/20",
    alerta: "bg-warning/10 text-warning border-warning/20",
    prudencial: "bg-warning/10 text-warning border-warning/20",
    excedido: "bg-destructive/10 text-destructive border-destructive/20",
    pendente: "bg-muted text-muted-foreground border-border",
  };
  return (
    <div className={cn("flex items-center justify-between rounded-lg border px-3 py-2", colors[s])}>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm font-bold">{formatPct(value)} — {LABEL_STATUS[s as keyof typeof LABEL_STATUS]}</span>
    </div>
  );
};

export default DiagnosticoFormPage;
