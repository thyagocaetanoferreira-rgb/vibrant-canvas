import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_URL =
  "http://ws.tcm.go.gov.br/api/rest/municipioService/obterMunicipioPor?type=json";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let logId: string | null = null;

  try {
    const { usuario_id } = await req.json();

    // Create sync log
    const { data: logData } = await supabase
      .from("tcmgo_sync_log")
      .insert({ usuario_id: usuario_id || null, status: "em_andamento" })
      .select("id")
      .single();

    logId = logData?.id ?? null;

    // Fetch from TCM-GO API with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(API_URL, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`API TCM-GO retornou status ${response.status}`);
    }

    const dados = await response.json();

    // Normalize — API returns { municipio: [...] } or single object
    const lista = Array.isArray(dados?.municipio)
      ? dados.municipio
      : dados?.municipio
        ? [dados.municipio]
        : [];

    if (lista.length === 0) {
      throw new Error("Nenhum município retornado pela API");
    }

    const registros = lista.map((m: any) => ({
      id: parseInt(m.id),
      descricao: m.descricao ?? "",
      cnpj: m.cnpj ?? null,
      regiao: m.regiao ?? null,
    }));

    // Upsert in batches of 500
    const BATCH_SIZE = 500;
    for (let i = 0; i < registros.length; i += BATCH_SIZE) {
      const batch = registros.slice(i, i + BATCH_SIZE);
      const { error: upsertError } = await supabase
        .from("tcmgo_municipios")
        .upsert(batch, { onConflict: "id" });
      if (upsertError) throw new Error(upsertError.message);
    }

    // Update log with success
    if (logId) {
      await supabase
        .from("tcmgo_sync_log")
        .update({
          status: "sucesso",
          total_registros: registros.length,
          finalizado_em: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        total: registros.length,
        mensagem: `${registros.length} municípios importados com sucesso.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (erro: any) {
    if (logId) {
      await supabase
        .from("tcmgo_sync_log")
        .update({
          status: "erro",
          mensagem_erro: erro.message,
          finalizado_em: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({ sucesso: false, mensagem: erro.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
