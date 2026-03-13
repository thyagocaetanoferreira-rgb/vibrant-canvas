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
    const { usuario_id } = await req.json();

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

    // Fetch all municipalities from tcmgo_municipios
    const { data: municipios, error: munError } = await supabase
      .from("tcmgo_municipios")
      .select("id")
      .order("id");

    if (munError) throw new Error(`Erro ao buscar municípios: ${munError.message}`);
    if (!municipios || municipios.length === 0) {
      throw new Error("Nenhum município encontrado na tabela tcmgo_municipios. Sincronize os municípios primeiro.");
    }

    let totalOrgaos = 0;
    let municipiosProcessados = 0;
    let erros: string[] = [];

    // Process municipalities in sequence to avoid overwhelming the API
    for (const mun of municipios) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`${BASE_URL}?id=${mun.id}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          erros.push(`Município ${mun.id}: HTTP ${response.status}`);
          continue;
        }

        const dados = await response.json();
        const lista = Array.isArray(dados) ? dados : [];

        if (lista.length === 0) {
          municipiosProcessados++;
          continue;
        }

        const registros = lista.map((o: any) => ({
          codigo_orgao: String(o.codigoOrgao ?? o.codigo_orgao ?? o.id ?? ""),
          tipo_orgao: o.tipoOrgao ?? o.tipo_orgao ?? null,
          descricao_orgao: o.descricaoOrgao ?? o.descricao_orgao ?? o.descricao ?? "",
          ativo: o.ativo !== undefined ? Boolean(o.ativo) : true,
          municipio_tcmgo_id: mun.id,
        }));

        // Upsert batch
        const { error: upsertError } = await supabase
          .from("tcmgo_orgaos")
          .upsert(registros, { onConflict: "codigo_orgao,municipio_tcmgo_id" });

        if (upsertError) {
          erros.push(`Município ${mun.id}: ${upsertError.message}`);
        } else {
          totalOrgaos += registros.length;
        }

        municipiosProcessados++;
      } catch (e: any) {
        erros.push(`Município ${mun.id}: ${e.message}`);
      }
    }

    // Update log
    const status = erros.length === municipios.length ? "erro" : "sucesso";
    if (logId) {
      await supabase
        .from("tcmgo_sync_log")
        .update({
          status,
          total_registros: totalOrgaos,
          finalizado_em: new Date().toISOString(),
          mensagem_erro: erros.length > 0 ? erros.slice(0, 10).join("; ") : null,
        })
        .eq("id", logId);
    }

    const mensagem = erros.length > 0
      ? `${totalOrgaos} órgãos importados de ${municipiosProcessados}/${municipios.length} municípios (${erros.length} erros)`
      : `${totalOrgaos} órgãos importados de ${municipiosProcessados} municípios`;

    return new Response(
      JSON.stringify({ sucesso: true, total: totalOrgaos, mensagem }),
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
