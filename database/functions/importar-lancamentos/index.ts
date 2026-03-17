import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONTH_MAP: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  janeiro: 1, fevereiro: 2, "março": 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

const IBGE_CORRECTIONS: Record<string, number> = {
  "Bela Vista de Goiás": 5203302,
  "Davinópolis": 5206909,
};

function parseMoney(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return val;
  let s = String(val).trim();
  if (s === "" || s === "-" || s === "R$ -" || s === "R$-" || s === "R$ 0" || s === "R$0") return 0;
  const negative = s.startsWith("-") || s.startsWith("(");
  s = s.replace(/^-/, "").replace(/^\(/, "").replace(/\)$/, "");
  s = s.replace(/^R\$\s*/, "").trim();
  // Handle Brazilian format: 1.234.567,89
  if (s.includes(",") && s.indexOf(",") > s.lastIndexOf(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return negative ? -n : n;
}

function parsePct(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return val <= 1 ? val * 100 : val;
  let s = String(val).trim().replace("%", "").replace(",", ".");
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return n;
}

function parseMonthYear(val: any): { mes: number; ano: number } | null {
  if (!val) return null;
  const s = String(val).trim().toLowerCase();
  const match = s.match(/^(\w+),?\s*(\d{4})$/);
  if (match) {
    const mes = MONTH_MAP[match[1]];
    const year = parseInt(match[2]);
    if (mes && year) return { mes, ano: year };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rows } = await req.json();
    if (!rows || !Array.isArray(rows)) {
      throw new Error("Body deve conter um array 'rows' com os dados da planilha");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all clients
    const { data: clientes } = await supabase
      .from("clientes")
      .select("id, municipio_id, municipios!inner(codigo_ibge, nome)");

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

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];
    const skippedMunicipios = new Set<string>();
    const batch: any[] = [];

    for (const row of rows) {
      const municipioNome = String(row.municipio || "").trim();
      let ibge = row.ibge;
      const mesRef = row.mes_ref;

      if (!municipioNome || !mesRef) { skipped++; continue; }

      const parsed = parseMonthYear(mesRef);
      if (!parsed) { skipped++; continue; }

      if (IBGE_CORRECTIONS[municipioNome]) ibge = IBGE_CORRECTIONS[municipioNome];
      const clienteId = ibgeLookup[Number(ibge)] || nomeLookup[municipioNome];
      if (!clienteId) { skippedMunicipios.add(municipioNome); skipped++; continue; }

      const record: Record<string, any> = {
        cliente_id: clienteId,
        ano_referencia: parsed.ano,
        mes_referencia: parsed.mes,
        status: "rascunho",
      };

      // Money fields
      const mf = ["receita_prevista_ano","receita_realizada","despesa_fixada","despesa_empenhada_f1",
        "despesa_empenhada_f2","despesa_liquidada","despesa_paga","caixa","despesa_nao_processada",
        "despesa_processada","consignacoes_tesouraria","resto_nao_processado","resto_processado",
        "supl_anulacao_autorizada","supl_anulacao_utilizado","superavit_exerc_anterior",
        "supl_superavit_autorizada","supl_superavit_utilizado","excesso_projetado",
        "supl_excesso_utilizado","aplicacao_educacao","aplicacao_saude"];
      for (const f of mf) {
        if (row[f] !== undefined) record[f] = parseMoney(row[f]);
      }

      // Pct fields
      const pf = ["supl_anulacao_perc","supl_superavit_perc","supl_excesso_perc"];
      for (const f of pf) {
        if (row[f] !== undefined) record[f] = parsePct(row[f]);
      }

      batch.push(record);
    }

    // Insert in batches of 100
    for (let i = 0; i < batch.length; i += 100) {
      const chunk = batch.slice(i, i + 100);
      const { error } = await supabase
        .from("lancamentos_mensais")
        .upsert(chunk, { onConflict: "cliente_id,ano_referencia,mes_referencia", ignoreDuplicates: false });
      if (error) errors.push(`Batch ${i}: ${error.message}`);
      else inserted += chunk.length;
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: `Importação: ${inserted} inseridos, ${skipped} ignorados.`,
        total: inserted, ignorados: skipped,
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
