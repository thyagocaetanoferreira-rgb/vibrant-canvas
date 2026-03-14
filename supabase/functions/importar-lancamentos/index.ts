import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Month name mapping (supports English and Portuguese)
const MONTH_MAP: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  janeiro: 1, fevereiro: 2, "março": 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

// IBGE code corrections for known mismatches in the spreadsheet
const IBGE_CORRECTIONS: Record<string, number> = {
  "Bela Vista de Goiás": 5203302,
  "Davinópolis": 5206909,
};

function parseMoney(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return val;
  let s = String(val).trim();
  if (s === "" || s === "-" || s === "R$ -" || s === "R$-") return 0;
  // Handle negative: -R$ or (R$...)
  const negative = s.startsWith("-") || s.startsWith("(");
  s = s.replace(/^-/, "").replace(/^\(/, "").replace(/\)$/, "");
  s = s.replace(/^R\$\s*/, "");
  s = s.replace(/\./g, "").replace(",", ".");
  // If it still has commas (US format like 1,234.56), handle that
  if (s.includes(",")) {
    s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return negative ? -n : n;
}

function parsePct(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return val; // Already a decimal from xlsx
  let s = String(val).trim().replace("%", "").replace(",", ".");
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return n;
}

function parseMonthYear(val: any): { mes: number; ano: number } | null {
  if (!val) return null;
  const s = String(val).trim().toLowerCase();
  // Try "Month, Year" format
  const match = s.match(/^(\w+),?\s*(\d{4})$/);
  if (match) {
    const monthName = match[1];
    const year = parseInt(match[2]);
    const mes = MONTH_MAP[monthName];
    if (mes && year) return { mes, ano: year };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Download xlsx from storage
    const { data: fileData, error: dlError } = await supabase.storage
      .from("imports")
      .download("lancamentos/importacao.xlsx");

    if (dlError || !fileData) {
      throw new Error(`Erro ao baixar arquivo: ${dlError?.message}`);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

    // 2. Get all clients with their IBGE codes
    const { data: clientes } = await supabase
      .from("clientes")
      .select("id, municipio_id, municipios!inner(codigo_ibge, nome)")
      .eq("status", true);

    // Build lookup: codigo_ibge -> cliente_id
    const ibgeLookup: Record<number, string> = {};
    const nomeLookup: Record<string, string> = {};
    if (clientes) {
      for (const c of clientes) {
        const m = (c as any).municipios;
        if (m) {
          ibgeLookup[m.codigo_ibge] = c.id;
          nomeLookup[m.nome] = c.id;
        }
      }
    }

    // Column name mapping (xlsx header -> db column)
    const COL_MAP: Record<string, string> = {
      "Município": "_municipio",
      "IBGE": "_ibge",
      "Mês de Referência": "_mes_ref",
      "Receita Prevista Ano (Receira Orçamentaria)": "receita_prevista_ano",
      "Receita Prevista Mês": "_skip",
      "Receita Realizada": "receita_realizada",
      "Despesa Fixada": "despesa_fixada",
      "Despesa Empenhada (Fonte 1)": "despesa_empenhada_f1",
      "Despesa Empenhada (Fonte 2)": "despesa_empenhada_f2",
      "Despesa Liquidada": "despesa_liquidada",
      "Despesa Paga": "despesa_paga",
      "Caixa": "caixa",
      "Despesa não processada": "despesa_nao_processada",
      "Despesa Processada": "despesa_processada",
      "Consignações/ Tesouraria": "consignacoes_tesouraria",
      "Resto não processado": "resto_nao_processado",
      "Resto processado": "resto_processado",
      "Res. Financeiro (Empenhado)": "_skip2",
      "Res. Financeiro ( Liquidado)": "_skip3",
      "Percentual de Suplementação para Anulação de Dotação (%)": "supl_anulacao_perc",
      "Suplementação Autorizada para Anulação (R$)": "supl_anulacao_autorizada",
      "Crédito Utilizado: Anulação de Dotação (R$) - Mensal": "supl_anulacao_utilizado",
      "Percentual de Suplementação para Superávit Financeiro (%)": "supl_superavit_perc",
      "Superávit Apurado Exercício Anterior (R$)": "superavit_exerc_anterior",
      "Suplementação autorizada para Superavit Financeiro (R$)": "supl_superavit_autorizada",
      "Crédito Utilizado: Superávit Financeiro (R$)": "supl_superavit_utilizado",
      "Percentual de Suplementação para Excesso de Arrecadação (%)": "supl_excesso_perc",
      "Valor de Excesso Projetado (R$)": "excesso_projetado",
      "Crédito Utilizado: Excesso de Arrecadação (R$)": "supl_excesso_utilizado",
      "Aplicação em Educação (R$)": "aplicacao_educacao",
      "Indice Educação %(25%)": "_skip4",
      "Índice Fundeb (%)": "_skip5",
      "Aplicação Saúde (R$)": "aplicacao_saude",
      "Índice Saúde (%)": "_skip6",
      "Índice de Pessoal (%)": "_skip7",
    };

    // Get the actual headers from the first row keys
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];
    const skippedMunicipios = new Set<string>();

    const BATCH_SIZE = 50;
    const batch: any[] = [];

    for (const row of rows) {
      const municipioNome = String(row[headers[0]] || "").trim();
      let ibge = row[headers[1]];
      const mesRef = row[headers[2]];

      if (!municipioNome || !mesRef) {
        skipped++;
        continue;
      }

      // Parse month/year
      const parsed = parseMonthYear(mesRef);
      if (!parsed) {
        skipped++;
        errors.push(`Mês inválido: ${mesRef} (${municipioNome})`);
        continue;
      }

      // Resolve cliente_id
      // Apply IBGE corrections
      if (IBGE_CORRECTIONS[municipioNome]) {
        ibge = IBGE_CORRECTIONS[municipioNome];
      }

      let clienteId = ibgeLookup[Number(ibge)] || nomeLookup[municipioNome];
      if (!clienteId) {
        skippedMunicipios.add(municipioNome);
        skipped++;
        continue;
      }

      // Build record
      const record: Record<string, any> = {
        cliente_id: clienteId,
        ano_referencia: parsed.ano,
        mes_referencia: parsed.mes,
        status: "rascunho",
      };

      // Map remaining columns (indices 3+)
      const moneyFields = [
        "receita_prevista_ano", "receita_realizada", "despesa_fixada",
        "despesa_empenhada_f1", "despesa_empenhada_f2", "despesa_liquidada",
        "despesa_paga", "caixa", "despesa_nao_processada", "despesa_processada",
        "consignacoes_tesouraria", "resto_nao_processado", "resto_processado",
        "supl_anulacao_autorizada", "supl_anulacao_utilizado",
        "superavit_exerc_anterior", "supl_superavit_autorizada",
        "supl_superavit_utilizado", "excesso_projetado", "supl_excesso_utilizado",
        "aplicacao_educacao", "aplicacao_saude",
      ];
      const pctFields = ["supl_anulacao_perc", "supl_superavit_perc", "supl_excesso_perc"];

      for (let i = 3; i < headers.length; i++) {
        const header = headers[i];
        // Find mapping
        let dbCol: string | undefined;
        for (const [xlsHeader, col] of Object.entries(COL_MAP)) {
          if (header.includes(xlsHeader) || xlsHeader.includes(header) || header === xlsHeader) {
            dbCol = col;
            break;
          }
        }

        if (!dbCol || dbCol.startsWith("_")) continue;

        const rawVal = row[header];
        if (moneyFields.includes(dbCol)) {
          record[dbCol] = parseMoney(rawVal);
        } else if (pctFields.includes(dbCol)) {
          const pctVal = parsePct(rawVal);
          // xlsx may return decimals (0.25) or whole numbers (25%)
          if (pctVal !== null) {
            record[dbCol] = pctVal <= 1 ? pctVal * 100 : pctVal;
          }
        }
      }

      batch.push(record);

      if (batch.length >= BATCH_SIZE) {
        const { error } = await supabase
          .from("lancamentos_mensais")
          .upsert(batch, { onConflict: "cliente_id,ano_referencia,mes_referencia", ignoreDuplicates: false });
        if (error) {
          errors.push(`Batch error: ${error.message}`);
        } else {
          inserted += batch.length;
        }
        batch.length = 0;
      }
    }

    // Insert remaining
    if (batch.length > 0) {
      const { error } = await supabase
        .from("lancamentos_mensais")
        .upsert(batch, { onConflict: "cliente_id,ano_referencia,mes_referencia", ignoreDuplicates: false });
      if (error) {
        errors.push(`Batch error: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: `Importação concluída: ${inserted} registros inseridos, ${skipped} ignorados.`,
        total: inserted,
        ignorados: skipped,
        municipios_sem_cliente: Array.from(skippedMunicipios),
        erros: errors.slice(0, 20),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ sucesso: false, mensagem: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
