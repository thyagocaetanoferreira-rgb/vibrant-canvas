import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL =
  "http://ws.tcm.go.gov.br/api/rest/orgaoService/obterOrgaosPorMunicipio";

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
    const { usuario_id, municipio_id } = await req.json();

    if (!municipio_id) {
      throw new Error("O parâmetro municipio_id é obrigatório.");
    }

    // Verify the municipality exists
    const { data: mun, error: munError } = await supabase
      .from("tcmgo_municipios")
      .select("id, descricao")
      .eq("id", municipio_id)
      .single();

    if (munError || !mun) {
      throw new Error("Município não encontrado na tabela tcmgo_municipios.");
    }

    // Create sync log
    const { data: logData } = await supabase
      .from("tcmgo_sync_log")
      .insert({
        usuario_id: usuario_id || null,
        status: "em_andamento",
        tipo: "orgaos",
      })
      .select("id")
      .single();

    logId = logData?.id ?? null;

    // Fetch órgãos for this municipality
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${BASE_URL}?id=${mun.id}&type=json`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API TCM-GO retornou status ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const rawText = await response.text();
    if (rawText.startsWith("<?xml") || rawText.startsWith("<")) {
      throw new Error("API retornou XML ao invés de JSON. Verifique o ID do município.");
    }

    const dados = JSON.parse(rawText);
    const lista = Array.isArray(dados) ? dados : [];

    if (lista.length === 0) {
      // Update log as success with 0 records
      if (logId) {
        await supabase
          .from("tcmgo_sync_log")
          .update({
            status: "sucesso",
            total_registros: 0,
            finalizado_em: new Date().toISOString(),
            detalhes: { municipio_nome: mun.descricao },
          })
          .eq("id", logId);
      }

      return new Response(
        JSON.stringify({
          sucesso: true,
          total: 0,
          mensagem: `Nenhum órgão encontrado para ${mun.descricao}.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const registros = lista.map((o: any) => ({
      codigo_orgao: String(o.codigoOrgao ?? o.codigo_orgao ?? o.id ?? ""),
      tipo_orgao: o.tipoOrgao ?? o.tipo_orgao ?? null,
      descricao_orgao: o.descricaoOrgao ?? o.descricao_orgao ?? o.descricao ?? "",
      ativo: o.ativo !== undefined ? Boolean(o.ativo) : true,
      municipio_tcmgo_id: mun.id,
    }));

    // Upsert
    const { error: upsertError } = await supabase
      .from("tcmgo_orgaos")
      .upsert(registros, { onConflict: "codigo_orgao,municipio_tcmgo_id" });

    if (upsertError) throw new Error(upsertError.message);

    // Update log
    if (logId) {
      await supabase
        .from("tcmgo_sync_log")
        .update({
          status: "sucesso",
          total_registros: registros.length,
          finalizado_em: new Date().toISOString(),
          detalhes: { municipio_nome: mun.descricao },
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        total: registros.length,
        mensagem: `${registros.length} órgãos importados de ${mun.descricao}.`,
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
