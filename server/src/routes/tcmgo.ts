import { Router, Response } from "express";
import { db } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const MUNICIPIOS_API = "http://ws.tcm.go.gov.br/api/rest/municipioService/obterMunicipioPor?type=json";
const ORGAOS_API = "http://ws.tcm.go.gov.br/api/rest/orgaoService/obterOrgaosPorMunicipio";
const BALANCETES_API = "http://ws.tcm.go.gov.br/api/rest/envioBalanceteEletronicoService/obterReciboEnvioBalanceteEletronico";
const PPALOA_API = "http://ws.tcm.go.gov.br/api/rest/recibo-ppa-loa";

// GET /api/tcmgo/municipios?page=0
router.get("/municipios", async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 0;
  const limit = 1000;
  const offset = page * limit;
  const { rows } = await db.query(
    "SELECT id, descricao FROM tcmgo_municipios ORDER BY descricao LIMIT $1 OFFSET $2",
    [limit, offset]
  );
  return res.json(rows);
});

// GET /api/tcmgo/sync-log?tipo=X
router.get("/sync-log", async (req: AuthRequest, res: Response) => {
  const { tipo } = req.query;
  let query = `SELECT status, total_registros, finalizado_em, detalhes FROM tcmgo_sync_log WHERE status = 'sucesso'`;
  const params: any[] = [];
  if (tipo && tipo !== "municipios") {
    params.push(tipo);
    query += ` AND tipo = $1`;
  }
  query += ` ORDER BY finalizado_em DESC LIMIT 1`;
  const { rows } = await db.query(query, params);
  return res.json(rows[0] || null);
});

// POST /api/tcmgo/sincronizar-municipios
router.post("/sincronizar-municipios", async (req: AuthRequest, res: Response) => {
  const usuario_id = req.usuario!.id;

  const { rows: [log] } = await db.query(
    "INSERT INTO tcmgo_sync_log (usuario_id, status) VALUES ($1, 'em_andamento') RETURNING id",
    [usuario_id]
  );
  const logId = log.id;

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 30000);
    const response = await fetch(MUNICIPIOS_API, { signal: ctrl.signal });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`API retornou status ${response.status}`);
    const dados = await response.json();
    const lista = Array.isArray(dados) ? dados : [];
    if (lista.length === 0) throw new Error("Nenhum município retornado");

    const registros = lista.map((m: any) => ({
      id: parseInt(m.id), descricao: m.descricao ?? "", cnpj: m.cnpj ?? null, regiao: m.regiao ?? null,
    }));

    for (let i = 0; i < registros.length; i += 500) {
      const batch = registros.slice(i, i + 500);
      for (const r of batch) {
        await db.query(
          `INSERT INTO tcmgo_municipios (id, descricao, cnpj, regiao)
           VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET descricao=$2, cnpj=$3, regiao=$4`,
          [r.id, r.descricao, r.cnpj, r.regiao]
        );
      }
    }

    await db.query(
      "UPDATE tcmgo_sync_log SET status='sucesso', total_registros=$1, finalizado_em=NOW() WHERE id=$2",
      [registros.length, logId]
    );

    return res.json({ sucesso: true, total: registros.length, mensagem: `${registros.length} municípios importados.` });
  } catch (err: any) {
    await db.query(
      "UPDATE tcmgo_sync_log SET status='erro', mensagem_erro=$1, finalizado_em=NOW() WHERE id=$2",
      [err.message, logId]
    );
    return res.status(500).json({ sucesso: false, mensagem: err.message });
  }
});

// POST /api/tcmgo/sincronizar-orgaos
router.post("/sincronizar-orgaos", async (req: AuthRequest, res: Response) => {
  const { municipio_id } = req.body;
  const usuario_id = req.usuario!.id;
  if (!municipio_id) return res.status(400).json({ sucesso: false, mensagem: "municipio_id obrigatório" });

  const { rows: [mun] } = await db.query(
    "SELECT id, descricao FROM tcmgo_municipios WHERE id = $1",
    [municipio_id]
  );
  if (!mun) return res.status(404).json({ sucesso: false, mensagem: "Município não encontrado" });

  const { rows: [log] } = await db.query(
    "INSERT INTO tcmgo_sync_log (usuario_id, status, tipo) VALUES ($1, 'em_andamento', 'orgaos') RETURNING id",
    [usuario_id]
  );
  const logId = log.id;

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 30000);
    const response = await fetch(`${ORGAOS_API}?id=${mun.id}&type=json`, { signal: ctrl.signal });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`API retornou ${response.status}`);
    const rawText = await response.text();
    if (rawText.startsWith("<?xml") || rawText.startsWith("<"))
      throw new Error("API retornou XML. Verifique o ID do município.");

    const lista = JSON.parse(rawText);
    if (!Array.isArray(lista) || lista.length === 0) {
      await db.query(
        "UPDATE tcmgo_sync_log SET status='sucesso', total_registros=0, finalizado_em=NOW(), detalhes=$1 WHERE id=$2",
        [JSON.stringify({ municipio_nome: mun.descricao }), logId]
      );
      return res.json({ sucesso: true, total: 0, mensagem: `Nenhum órgão para ${mun.descricao}.` });
    }

    for (const o of lista) {
      await db.query(
        `INSERT INTO tcmgo_orgaos (codigo_orgao, tipo_orgao, descricao_orgao, ativo, municipio_tcmgo_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (codigo_orgao, municipio_tcmgo_id)
         DO UPDATE SET tipo_orgao=$2, descricao_orgao=$3, ativo=$4`,
        [
          String(o.codigoOrgao ?? o.codigo_orgao ?? o.id ?? ""),
          o.tipoOrgao ?? o.tipo_orgao ?? null,
          o.descricaoOrgao ?? o.descricao_orgao ?? o.descricao ?? "",
          o.ativo !== undefined ? Boolean(o.ativo) : true,
          mun.id,
        ]
      );
    }

    await db.query(
      "UPDATE tcmgo_sync_log SET status='sucesso', total_registros=$1, finalizado_em=NOW(), detalhes=$2 WHERE id=$3",
      [lista.length, JSON.stringify({ municipio_nome: mun.descricao }), logId]
    );

    return res.json({ sucesso: true, total: lista.length, mensagem: `${lista.length} órgãos de ${mun.descricao}.` });
  } catch (err: any) {
    await db.query(
      "UPDATE tcmgo_sync_log SET status='erro', mensagem_erro=$1, finalizado_em=NOW() WHERE id=$2",
      [err.message, logId]
    );
    return res.status(500).json({ sucesso: false, mensagem: err.message });
  }
});

// POST /api/tcmgo/verificar-balancetes
router.post("/verificar-balancetes", async (req: AuthRequest, res: Response) => {
  const { ano_referencia = new Date().getFullYear(), mes_referencia } = req.body;
  const usuario_id = req.usuario!.id;

  const { rows: [log] } = await db.query(
    "INSERT INTO tcmgo_sync_log (usuario_id, status, tipo) VALUES ($1, 'em_andamento', 'balancetes') RETURNING id",
    [usuario_id]
  );
  const logId = log.id;

  const mesAtual = new Date().getMonth() + 1;
  const meses = mes_referencia ? [mes_referencia] : Array.from({ length: mesAtual }, (_, i) => i + 1);

  let totalVerificados = 0, totalEnviados = 0, totalPendentes = 0;
  const erros: string[] = [];

  try {
    const { rows: clientes } = await db.query(
      "SELECT id, municipio_tcmgo_id FROM clientes WHERE status = true AND municipio_tcmgo_id IS NOT NULL"
    );
    if (!clientes.length) throw new Error("Nenhum cliente ativo com município TCM-GO vinculado.");

    for (const cliente of clientes) {
      const { rows: [munTcm] } = await db.query(
        "SELECT id, descricao, cnpj FROM tcmgo_municipios WHERE id = $1",
        [cliente.municipio_tcmgo_id]
      );
      if (!munTcm) { erros.push(`Cliente ${cliente.id}: município não encontrado`); continue; }

      const { rows: orgaos } = await db.query(
        "SELECT codigo_orgao, descricao_orgao FROM tcmgo_orgaos WHERE municipio_tcmgo_id = $1 AND ativo = true",
        [munTcm.id]
      );
      if (!orgaos.length) { erros.push(`${munTcm.descricao}: nenhum órgão ativo`); continue; }

      const tasks: { orgao: any; mes: number }[] = [];
      for (const orgao of orgaos) for (const mes of meses) tasks.push({ orgao, mes });

      for (let i = 0; i < tasks.length; i += 5) {
        const batch = tasks.slice(i, i + 5);
        const results = await Promise.allSettled(
          batch.map(async ({ orgao, mes }) => {
            const url = `${BALANCETES_API}/${munTcm.id}/${orgao.codigo_orgao}/${mes}/${ano_referencia}?type=json`;
            const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
            let enviado = false, numero_recibo: string | null = null, data_envio: string | null = null;
            if (response.ok) {
              const raw = await response.text();
              if (!raw.startsWith("<?xml") && !raw.startsWith("<")) {
                try {
                  const dados = JSON.parse(raw);
                  const recibo = dados?.recibo ?? dados;
                  enviado = !!(recibo?.numeroRecibo || recibo?.numero_recibo);
                  numero_recibo = recibo?.numeroRecibo ?? recibo?.numero_recibo ?? null;
                  data_envio = recibo?.dataEnvio ?? recibo?.data_envio ?? null;
                } catch { /* ignore */ }
              } else await response.text();
            }
            return { orgao, mes, enviado, numero_recibo, data_envio };
          })
        );

        for (const result of results) {
          if (result.status === "fulfilled" && result.value) {
            const { orgao, mes, enviado, numero_recibo, data_envio } = result.value;
            totalVerificados++;
            if (enviado) totalEnviados++; else totalPendentes++;
            await db.query(
              `INSERT INTO tcmgo_balancetes_status
               (cliente_id, municipio_tcmgo_id, codigo_orgao, descricao_orgao, mes_referencia, ano_referencia,
                enviado, numero_recibo, data_envio, cnpj_municipio, nome_municipio, verificado_em)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
               ON CONFLICT (cliente_id, codigo_orgao, mes_referencia, ano_referencia)
               DO UPDATE SET enviado=$7, numero_recibo=$8, data_envio=$9, verificado_em=NOW()`,
              [cliente.id, munTcm.id, orgao.codigo_orgao, orgao.descricao_orgao, mes, ano_referencia,
               enviado, numero_recibo, data_envio ? new Date(data_envio).toISOString() : null,
               munTcm.cnpj, munTcm.descricao]
            );
          }
        }
      }
    }

    await db.query(
      "UPDATE tcmgo_sync_log SET status='sucesso', total_registros=$1, finalizado_em=NOW() WHERE id=$2",
      [totalVerificados, logId]
    );
    return res.json({
      sucesso: true, total_verificados: totalVerificados, total_enviados: totalEnviados,
      total_pendentes: totalPendentes, erros: erros.length,
      mensagem: `Verificação concluída: ${totalEnviados} enviados, ${totalPendentes} pendentes.`,
    });
  } catch (err: any) {
    await db.query(
      "UPDATE tcmgo_sync_log SET status='erro', mensagem_erro=$1, finalizado_em=NOW() WHERE id=$2",
      [err.message, logId]
    );
    return res.status(500).json({ sucesso: false, mensagem: err.message });
  }
});

// POST /api/tcmgo/verificar-ppaloa
router.post("/verificar-ppaloa", async (req: AuthRequest, res: Response) => {
  const { ano_referencia = new Date().getFullYear() } = req.body;
  const usuario_id = req.usuario!.id;

  const { rows: [log] } = await db.query(
    "INSERT INTO tcmgo_sync_log (usuario_id, status, tipo) VALUES ($1, 'em_andamento', 'ppa_loa') RETURNING id",
    [usuario_id]
  );
  const logId = log.id;

  let totalVerificados = 0, totalEnviados = 0, totalPendentes = 0;
  const erros: string[] = [];

  try {
    const { rows: clientes } = await db.query(
      `SELECT c.id, c.municipio_tcmgo_id, m.nome, m.codigo_ibge
       FROM clientes c JOIN municipios m ON m.id = c.municipio_id WHERE c.status = true`
    );
    if (!clientes.length) throw new Error("Nenhum cliente ativo.");

    for (const cliente of clientes) {
      try {
        const url = `${PPALOA_API}/${cliente.codigo_ibge}/${ano_referencia}?type=json`;
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

        let enviado = false, data_envio: string | null = null, numero_recibo: string | null = null;
        let reenvios: any[] = [], total_reenvios = 0, ultimo_reenvio_em: string | null = null;
        let municipio_tcmgo_id: number | null = cliente.municipio_tcmgo_id ?? null;

        if (response.ok) {
          const raw = await response.text();
          if (!raw.startsWith("<?xml") && !raw.startsWith("<")) {
            try {
              const dados = JSON.parse(raw);
              const envio = dados?.envio;
              const reenviosDados = Array.isArray(dados?.reenvios) ? dados.reenvios : dados?.reenvios ? [dados.reenvios] : [];
              if (!municipio_tcmgo_id && dados?.municipio?.id) municipio_tcmgo_id = parseInt(dados.municipio.id);
              if (envio && (envio.numeroRecibo || envio.dataEnvio)) {
                enviado = true;
                numero_recibo = envio.numeroRecibo ?? envio.numero_recibo ?? null;
                data_envio = envio.dataEnvio ?? envio.data_envio ?? null;
              }
              if (reenviosDados.length > 0) {
                reenvios = reenviosDados;
                total_reenvios = reenviosDados.length;
                const datas = reenviosDados.map((r: any) => r.dataEnvio ?? r.data_envio).filter(Boolean).sort();
                ultimo_reenvio_em = datas.length > 0 ? datas[datas.length - 1] : null;
              }
            } catch { /* ignore */ }
          }
        }

        await db.query(
          `INSERT INTO tcmgo_ppaloa_status
           (cliente_id, municipio_tcmgo_id, nome_municipio, ano_referencia, enviado, data_envio, numero_recibo,
            reenvios, total_reenvios, ultimo_reenvio_em, verificado_em)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
           ON CONFLICT (cliente_id, ano_referencia)
           DO UPDATE SET enviado=$5, data_envio=$6, numero_recibo=$7, reenvios=$8, total_reenvios=$9,
                         ultimo_reenvio_em=$10, verificado_em=NOW()`,
          [cliente.id, municipio_tcmgo_id, cliente.nome, ano_referencia, enviado,
           data_envio ? new Date(data_envio).toISOString() : null, numero_recibo,
           JSON.stringify(reenvios), total_reenvios,
           ultimo_reenvio_em ? new Date(ultimo_reenvio_em).toISOString() : null]
        );

        totalVerificados++;
        if (enviado) totalEnviados++; else totalPendentes++;
      } catch (errItem: any) {
        erros.push(`${cliente.nome}: ${errItem.message}`);
      }
    }

    await db.query(
      "UPDATE tcmgo_sync_log SET status='sucesso', total_registros=$1, finalizado_em=NOW() WHERE id=$2",
      [totalVerificados, logId]
    );
    return res.json({
      sucesso: true, total_verificados: totalVerificados, total_enviados: totalEnviados,
      total_pendentes: totalPendentes, erros: erros.length,
      mensagem: `Verificação concluída: ${totalEnviados} enviados, ${totalPendentes} pendentes.`,
    });
  } catch (err: any) {
    await db.query(
      "UPDATE tcmgo_sync_log SET status='erro', mensagem_erro=$1, finalizado_em=NOW() WHERE id=$2",
      [err.message, logId]
    );
    return res.status(500).json({ sucesso: false, mensagem: err.message });
  }
});

// GET /api/tcmgo/ppaloa-status?ano=X
router.get("/ppaloa-status", async (req: AuthRequest, res: Response) => {
  const { ano } = req.query;
  if (!ano) return res.status(400).json({ message: "ano obrigatório" });
  const { rows } = await db.query(
    "SELECT enviado FROM tcmgo_ppaloa_status WHERE ano_referencia = $1",
    [Number(ano)]
  );
  return res.json(rows);
});

export default router;
