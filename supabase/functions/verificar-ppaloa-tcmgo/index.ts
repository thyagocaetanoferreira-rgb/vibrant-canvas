import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "http://ws.tcm.go.gov.br/api/rest/recibo-ppa-loa";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let usuario_id: string | null = null;
  let ano_referencia: number = new Date().getFullYear();

  if (req.method === "POST") {
    try {
      const body = await req.json();
      usuario_id = body.usuario_id ?? null;
      ano_referencia = body.ano_referencia ?? new Date().getFullYear();
    } catch (_) {}
  }

  // Create sync log
  const { data: logData } = await supabase
    .from("tcmgo_sync_log")
    .insert({ usuario_id, status: "em_andamento", tipo: "ppa_loa" })
    .select("id")
    .single();
  const logId = logData?.id;

  let totalVerificados = 0;
  let totalEnviados = 0;
  let totalPendentes = 0;
  const erros: string[] = [];

  try {
    // 1. Fetch all active clients with IBGE code
    const { data: clientes, error: errClientes } = await supabase
      .from("clientes")
      .select(`
        id,
        municipio_tcmgo_id,
        municipios!inner (
          nome,
          codigo_ibge
        )
      `)
      .eq("status", true);

    if (errClientes || !clientes?.length) {
      throw new Error("Nenhum cliente ativo encontrado.");
    }

    console.log(`[PPA/LOA] ${clientes.length} clientes ativos encontrados para ano ${ano_referencia}`);

    // 2. For each client, query the TCM-GO API
    for (const cliente of clientes as any[]) {
      const codigoMunicipio = cliente.municipios.codigo_ibge;
      const nomeMunicipio = cliente.municipios.nome;

      try {
        const url = `${BASE_URL}/${codigoMunicipio}/${ano_referencia}?type=json`;
        console.log(`[PPA/LOA] Verificando ${nomeMunicipio} (IBGE: ${codigoMunicipio})...`);

        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10000),
        });

        let enviado = false;
        let data_envio: string | null = null;
        let numero_recibo: string | null = null;
        let reenvios: any[] = [];
        let total_reenvios = 0;
        let ultimo_reenvio_em: string | null = null;
        let municipio_tcmgo_id: number | null = cliente.municipio_tcmgo_id ?? null;

        if (response.ok) {
          const rawText = await response.text();

          // Skip XML responses
          if (rawText.startsWith("<?xml") || rawText.startsWith("<")) {
            console.log(`[PPA/LOA] ${nomeMunicipio}: API retornou XML, pulando.`);
          } else {
            try {
              const dados = JSON.parse(rawText);

              const municipio = dados?.municipio;
              const envio = dados?.envio;
              const reenviosDados = Array.isArray(dados?.reenvios)
                ? dados.reenvios
                : dados?.reenvios
                  ? [dados.reenvios]
                  : [];

              if (!municipio_tcmgo_id && municipio?.id) {
                municipio_tcmgo_id = parseInt(municipio.id);
              }

              // Check if there was a submission
              if (envio && (envio.numeroRecibo || envio.numero_recibo || envio.dataEnvio)) {
                enviado = true;
                numero_recibo = envio.numeroRecibo ?? envio.numero_recibo ?? null;
                data_envio = envio.dataEnvio ?? envio.data_envio ?? null;
              }

              // Process resubmissions
              if (reenviosDados.length > 0) {
                reenvios = reenviosDados;
                total_reenvios = reenviosDados.length;
                const datas = reenviosDados
                  .map((r: any) => r.dataEnvio ?? r.data_envio)
                  .filter(Boolean)
                  .sort();
                ultimo_reenvio_em = datas.length > 0 ? datas[datas.length - 1] : null;
              }
            } catch (parseErr) {
              console.log(`[PPA/LOA] ${nomeMunicipio}: Erro ao parsear JSON: ${rawText.substring(0, 200)}`);
            }
          }
        }

        // Fallback: lookup municipio_tcmgo_id from table
        if (!municipio_tcmgo_id) {
          const { data: munTcm } = await supabase
            .from("tcmgo_municipios")
            .select("id")
            .eq("id", codigoMunicipio)
            .single();
          municipio_tcmgo_id = munTcm?.id ?? codigoMunicipio;
        }

        // Upsert result
        const { error: upsertErr } = await supabase
          .from("tcmgo_ppaloa_status")
          .upsert(
            {
              cliente_id: cliente.id,
              municipio_tcmgo_id,
              nome_municipio: nomeMunicipio,
              ano_referencia,
              enviado,
              data_envio: data_envio ? new Date(data_envio).toISOString() : null,
              numero_recibo,
              reenvios: JSON.stringify(reenvios),
              total_reenvios,
              ultimo_reenvio_em: ultimo_reenvio_em
                ? new Date(ultimo_reenvio_em).toISOString()
                : null,
              verificado_em: new Date().toISOString(),
            },
            { onConflict: "cliente_id,ano_referencia" }
          );

        if (upsertErr) {
          console.error(`[PPA/LOA] Erro upsert ${nomeMunicipio}: ${upsertErr.message}`);
          erros.push(`${nomeMunicipio}: ${upsertErr.message}`);
        } else {
          totalVerificados++;
          if (enviado) totalEnviados++;
          else totalPendentes++;
          console.log(`[PPA/LOA] ${nomeMunicipio}: ${enviado ? "ENVIADO" : "PENDENTE"}`);
        }
      } catch (errItem: any) {
        erros.push(`${nomeMunicipio}: ${errItem.message}`);
        console.error(`[PPA/LOA] Erro ${nomeMunicipio}: ${errItem.message}`);
      }
    }

    // Update log
    if (logId) {
      await supabase
        .from("tcmgo_sync_log")
        .update({
          status: "sucesso",
          total_registros: totalVerificados,
          finalizado_em: new Date().toISOString(),
          mensagem_erro:
            erros.length > 0
              ? `${erros.length} erro(s): ${erros.slice(0, 5).join(" | ")}`
              : null,
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        total_verificados: totalVerificados,
        total_enviados: totalEnviados,
        total_pendentes: totalPendentes,
        erros: erros.length,
        mensagem: `Verificação concluída: ${totalEnviados} enviados, ${totalPendentes} pendentes.`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
