import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TIPOS_ANALISE, TIPOS_IMPLEMENTADOS } from "../constants";

// ── Tipos locais ──────────────────────────────────────────────────────────────

interface ResultadoVerificacao {
  no_verificacao: string;
  no_desc: string;
  no_finalidade: string;
  co_dimensao: string;
  capag: boolean;
  status: "consistente" | "inconsistente" | "aviso" | "nao_aplicavel";
  resumo: string;
  detalhes: any[];
  nota: number;
  nota_max: number;
  temRetificacao?: boolean;
}

export interface RespostaValidacao {
  resultados: ResultadoVerificacao[];
  executado_em: string;
  municipio_id: number;
  ano: number;
  tipo: string;
}

export interface HistoricoItem {
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

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSimulacao() {
  const { municipio, anoExercicio } = useAppContext();
  const qc = useQueryClient();
  const municipioId = municipio?.municipioId;

  const [tipoSelecionado, setTipoSelecionado] = useState("RREO");
  const [resultado, setResultado] = useState<RespostaValidacao | null>(null);
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

  return {
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
  };
}
