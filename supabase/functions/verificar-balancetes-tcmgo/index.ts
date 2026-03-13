import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL =
  "http://ws.tcm.go.gov.br/api/rest/envioBalanceteEletronicoService/obterReciboEnvioBalanceteEletronico";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let usuario_id: string | null = null;
  let ano_referencia: number = new Date().getFullYear();
  let mes_referencia_alvo: number | null = null;

  if (req.method === "POST") {
    try {
      const body = await req.json();
      usuario_id = body.usuario_id ?? null;
      ano_referencia = body.ano_referencia ?? new Date().getFullYear();
      mes_referencia_alvo = body.mes_referencia ?? null;
    } catch (_) {}
  }

  // Create sync log
  const { data: logData } = await supabase
    .from("tcmgo_sync_log")
    .insert({ usuario_id, status: "em_andamento", tipo: "balancetes" })
    .select("id")
    .single();
  const logId = logData?.id;

  const mesAtual = new Date().getMonth() + 1;
  const meses = mes_referencia_alvo
    ? [mes_referencia_alvo]
    : Array.from({ length: mesAtual }, (_, i) => i + 1);

  let totalVerificados = 0;
  let totalEnviados = 0;
  let totalPendentes = 0;
  const erros: string[] = [];

  try {
    // 1. Fetch active clients with TCM-GO municipality linked
    const { data: clientes, error: errClientes } = await supabase
      .from("clientes")
      .select("id, municipio_tcmgo_id")
      .eq("status", true)
      .not("municipio_tcmgo_id", "is", null);

    if (errClientes || !clientes?.length) {
      throw new Error("Nenhum cliente ativo com município TCM-GO vinculado.");
    }

    console.log(`Clientes ativos com TCM-GO: ${clientes.length}`);

    for (const cliente of clientes) {
      const municipioTcmgoId = cliente.municipio_tcmgo_id;

      const { data: munTcm } = await supabase
        .from("tcmgo_municipios")
        .select("id, descricao, cnpj")
        .eq("id", municipioTcmgoId)
        .single();

      if (!munTcm) {
        erros.push(`Cliente ${cliente.id}: município TCM-GO ${municipioTcmgoId} não encontrado`);
        continue;
      }

      const { data: orgaos, error: orgaosErr } = await supabase
        .from("tcmgo_orgaos")
        .select("codigo_orgao, descricao_orgao")
        .eq("municipio_tcmgo_id", munTcm.id)
        .eq("ativo", true);

      console.log(`${munTcm.descricao} (ID ${munTcm.id}): ${orgaos?.length ?? 0} órgãos, erro: ${orgaosErr?.message ?? "nenhum"}`);

      if (!orgaos?.length) {
        erros.push(`${munTcm.descricao}: nenhum órgão ativo cadastrado`);
        continue;
      }

      // Build all tasks for this client
      interface VerifyTask {
        orgao: { codigo_orgao: string; descricao_orgao: string };
        mes: number;
      }
      const tasks: VerifyTask[] = [];
      for (const orgao of orgaos) {
        for (const mes of meses) {
          tasks.push({ orgao, mes });
        }
      }

      console.log(`${munTcm.descricao}: ${tasks.length} verificações a fazer`);

      // Process in parallel batches of 5 to avoid timeout
      const BATCH = 5;
      for (let i = 0; i < tasks.length; i += BATCH) {
        const batch = tasks.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(async ({ orgao, mes }) => {
            const url = `${BASE_URL}/${munTcm.id}/${orgao.codigo_orgao}/${mes}/${ano_referencia}?type=json`;

            try {
              const response = await fetch(url, {
                headers: { Accept: "application/json" },
                signal: AbortSignal.timeout(8000),
              });

              let enviado = false;
              let numero_recibo: string | null = null;
              let data_envio: string | null = null;

              if (response.ok) {
                const rawText = await response.text();
                if (!rawText.startsWith("<?xml") && !rawText.startsWith("<")) {
                  try {
                    const dados = JSON.parse(rawText);
                    const recibo = dados?.recibo ?? dados;
                    enviado = !!(recibo?.numeroRecibo || recibo?.numero_recibo);
                    numero_recibo = recibo?.numeroRecibo ?? recibo?.numero_recibo ?? null;
                    data_envio = recibo?.dataEnvio ?? recibo?.data_envio ?? null;
                  } catch (_) {}
                }
              } else {
                // Consume body to prevent leak
                await response.text();
              }

              return { orgao, mes, enviado, numero_recibo, data_envio };
            } catch (err: any) {
              erros.push(`${munTcm.descricao}/${orgao.codigo_orgao}/mês ${mes}: ${err.message}`);
              return null;
            }
          })
        );

        // Collect successful results for batch upsert
        const upsertRows: any[] = [];
        for (const result of results) {
          if (result.status === "fulfilled" && result.value) {
            const { orgao, mes, enviado, numero_recibo, data_envio } = result.value;
            totalVerificados++;
            if (enviado) totalEnviados++;
            else totalPendentes++;

            upsertRows.push({
              cliente_id: cliente.id,
              municipio_tcmgo_id: munTcm.id,
              codigo_orgao: orgao.codigo_orgao,
              descricao_orgao: orgao.descricao_orgao,
              mes_referencia: mes,
              ano_referencia,
              enviado,
              numero_recibo,
              data_envio: data_envio ? new Date(data_envio).toISOString() : null,
              cnpj_municipio: munTcm.cnpj,
              nome_municipio: munTcm.descricao,
              verificado_em: new Date().toISOString(),
            });
          }
        }

        // Batch upsert
        if (upsertRows.length > 0) {
          const { error: upsertErr } = await supabase
            .from("tcmgo_balancetes_status")
            .upsert(upsertRows, { onConflict: "cliente_id,codigo_orgao,mes_referencia,ano_referencia" });

          if (upsertErr) {
            console.error(`Upsert error: ${upsertErr.message}`);
            erros.push(`Upsert: ${upsertErr.message}`);
          }
        }
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
              ? `${erros.length} erro(s): ${erros.slice(0, 3).join(" | ")}`
              : null,
        })
        .eq("id", logId);
    }

    console.log(`Concluído: ${totalVerificados} verificações, ${totalEnviados} enviados, ${totalPendentes} pendentes`);

    return new Response(
      JSON.stringify({
        sucesso: true,
        total_verificados: totalVerificados,
        total_enviados: totalEnviados,
        total_pendentes: totalPendentes,
        erros: erros.length,
        mensagem: `Verificação concluída: ${totalEnviados} enviados, ${totalPendentes} pendentes.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (erro: any) {
    console.error(`Erro fatal: ${erro.message}`);
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
