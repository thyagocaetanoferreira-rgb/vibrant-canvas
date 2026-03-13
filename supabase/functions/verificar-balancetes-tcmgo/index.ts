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
    } catch (_) {
      // GET/cron call — use defaults
    }
  }

  // Create sync log
  const { data: logData } = await supabase
    .from("tcmgo_sync_log")
    .insert({ usuario_id, status: "em_andamento", tipo: "balancetes" })
    .select("id")
    .single();
  const logId = logData?.id;

  // Months to check: 1 to current month (or specific month if provided)
  const mesAtual = new Date().getMonth() + 1;
  const meses = mes_referencia_alvo
    ? [mes_referencia_alvo]
    : Array.from({ length: mesAtual }, (_, i) => i + 1);

  let totalVerificados = 0;
  let totalEnviados = 0;
  let totalPendentes = 0;
  const erros: string[] = [];

  try {
    // 1. Fetch all active clients that have municipio_tcmgo_id set
    const { data: clientes, error: errClientes } = await supabase
      .from("clientes")
      .select("id, municipio_tcmgo_id")
      .eq("status", true)
      .not("municipio_tcmgo_id", "is", null);

    if (errClientes || !clientes?.length) {
      throw new Error("Nenhum cliente ativo com município TCM-GO vinculado.");
    }

    // 2. For each client, get its TCM-GO municipality info and organs
    for (const cliente of clientes) {
      const municipioTcmgoId = cliente.municipio_tcmgo_id;

      // Get municipality info
      const { data: munTcm } = await supabase
        .from("tcmgo_municipios")
        .select("id, descricao, cnpj")
        .eq("id", municipioTcmgoId)
        .single();

      if (!munTcm) {
        erros.push(`Cliente ${cliente.id}: município TCM-GO ${municipioTcmgoId} não encontrado`);
        continue;
      }

      // Get active organs for this municipality
      const { data: orgaos, error: orgaosErr } = await supabase
        .from("tcmgo_orgaos")
        .select("codigo_orgao, descricao_orgao")
        .eq("municipio_tcmgo_id", munTcm.id)
        .eq("ativo", true);

      console.log(`Município ${munTcm.descricao} (ID ${munTcm.id}): ${orgaos?.length ?? 0} órgãos encontrados, erro: ${orgaosErr?.message ?? 'nenhum'}`);

      if (!orgaos?.length) {
        erros.push(`${munTcm.descricao}: nenhum órgão ativo cadastrado`);
        continue;
      }

      // 3. For each organ × each month
      for (const orgao of orgaos) {
        for (const mes of meses) {
          try {
            const url = `${BASE_URL}/${munTcm.id}/${orgao.codigo_orgao}/${mes}/${ano_referencia}?type=json`;

            const response = await fetch(url, {
              headers: { Accept: "application/json" },
              signal: AbortSignal.timeout(10000),
            });

            let enviado = false;
            let numero_recibo: string | null = null;
            let data_envio: string | null = null;

            if (response.ok) {
              const rawText = await response.text();

              // Skip XML responses
              if (!rawText.startsWith("<?xml") && !rawText.startsWith("<")) {
                try {
                  const dados = JSON.parse(rawText);
                  const recibo = dados?.recibo ?? dados;
                  enviado = !!(recibo?.numeroRecibo || recibo?.numero_recibo);
                  numero_recibo = recibo?.numeroRecibo ?? recibo?.numero_recibo ?? null;
                  data_envio = recibo?.dataEnvio ?? recibo?.data_envio ?? null;
                } catch (_) {
                  // Could not parse JSON, treat as not sent
                }
              }
            }

            // Upsert result
            const { error: upsertErr } = await supabase
              .from("tcmgo_balancetes_status")
              .upsert(
                {
                  cliente_id: cliente.id,
                  municipio_tcmgo_id: munTcm.id,
                  codigo_orgao: orgao.codigo_orgao,
                  descricao_orgao: orgao.descricao_orgao,
                  mes_referencia: mes,
                  ano_referencia: ano_referencia,
                  enviado,
                  numero_recibo,
                  data_envio: data_envio ? new Date(data_envio).toISOString() : null,
                  cnpj_municipio: munTcm.cnpj,
                  nome_municipio: munTcm.descricao,
                  verificado_em: new Date().toISOString(),
                },
                { onConflict: "cliente_id,codigo_orgao,mes_referencia,ano_referencia" }
              );

            if (upsertErr) {
              erros.push(`${munTcm.descricao} / ${orgao.codigo_orgao} / mês ${mes}: ${upsertErr.message}`);
            }

            totalVerificados++;
            if (enviado) totalEnviados++;
            else totalPendentes++;
          } catch (errItem: any) {
            erros.push(
              `${munTcm.descricao} / ${orgao.codigo_orgao} / mês ${mes}: ${errItem.message}`
            );
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
