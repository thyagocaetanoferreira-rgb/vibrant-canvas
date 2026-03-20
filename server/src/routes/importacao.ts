import { Router, Response } from "express";
import multer from "multer";
import AdmZip from "adm-zip";
import crypto from "crypto";
import { db } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { parsearRemessa } from "../lib/tcmgoParser";

const router = Router();
router.use(requireAuth);

// Multer: recebe o ZIP em memória (sem salvar em disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/zip" || file.originalname.toLowerCase().endsWith(".zip")) {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos ZIP são aceitos."));
    }
  },
});

// -----------------------------------------------------------------------
// Helper: valida que o usuário tem acesso ao cliente e retorna o
// municipio_tcmgo_id correspondente. Lança erro se não tiver acesso
// ou se o cliente não estiver vinculado ao TCM-GO.
// -----------------------------------------------------------------------
async function resolverMunicipioTcmgo(
  usuarioId: string,
  perfil: string,
  clienteId: string
): Promise<{ municipioTcmgoId: number; municipioNome: string }> {
  // Busca o cliente e verifica se tem TCM-GO configurado
  const { rows: [cliente] } = await db.query(
    `SELECT c.municipio_tcmgo_id, m.nome AS municipio_nome
     FROM clientes c
     JOIN municipios m ON m.id = c.municipio_id
     WHERE c.id = $1 AND c.status = true`,
    [clienteId]
  );

  if (!cliente) {
    throw Object.assign(new Error("Cliente não encontrado ou inativo."), { status: 404 });
  }
  if (!cliente.municipio_tcmgo_id) {
    throw Object.assign(
      new Error(`O município "${cliente.municipio_nome}" não possui código TCM-GO configurado. Acesse Clientes e vincule o município ao TCM-GO.`),
      { status: 422 }
    );
  }

  // Verifica se o usuário tem acesso a este cliente (admins sempre têm)
  if (perfil !== "Administrador") {
    const { rows: acesso } = await db.query(
      `SELECT 1
       FROM usuario_municipios um
       JOIN clientes c ON c.municipio_id = um.municipio_id
       WHERE um.usuario_id = $1 AND c.id = $2 AND c.status = true`,
      [usuarioId, clienteId]
    );
    if (acesso.length === 0) {
      throw Object.assign(new Error("Sem permissão para importar balancetes deste município."), { status: 403 });
    }
  }

  return {
    municipioTcmgoId: cliente.municipio_tcmgo_id as number,
    municipioNome: cliente.municipio_nome as string,
  };
}

// -----------------------------------------------------------------------
// GET /api/tcmgo/importacao/orgaos?cliente_id=X
// Lista órgãos TCM-GO do município vinculado ao cliente
// -----------------------------------------------------------------------
router.get("/orgaos", async (req: AuthRequest, res: Response) => {
  const { cliente_id } = req.query;
  if (!cliente_id) return res.status(400).json({ mensagem: "cliente_id obrigatório" });

  try {
    const { municipioTcmgoId } = await resolverMunicipioTcmgo(
      req.usuario!.id,
      req.usuario!.perfil,
      String(cliente_id)
    );

    const { rows } = await db.query(
      `SELECT id, codigo_orgao, descricao_orgao
       FROM tcmgo_orgaos
       WHERE municipio_tcmgo_id = $1 AND ativo = true
       ORDER BY descricao_orgao`,
      [municipioTcmgoId]
    );
    return res.json(rows);
  } catch (err: any) {
    return res.status(err.status ?? 500).json({ mensagem: err.message });
  }
});

// -----------------------------------------------------------------------
// GET /api/tcmgo/importacao/remessas?cliente_id=X&orgao_id=Y
// Histórico de remessas para o painel do frontend
// -----------------------------------------------------------------------
router.get("/remessas", async (req: AuthRequest, res: Response) => {
  const { cliente_id, orgao_id } = req.query;
  if (!cliente_id) return res.status(400).json({ mensagem: "cliente_id obrigatório" });

  try {
    const { municipioTcmgoId } = await resolverMunicipioTcmgo(
      req.usuario!.id,
      req.usuario!.perfil,
      String(cliente_id)
    );

    const params: any[] = [municipioTcmgoId];
    let where = "r.municipio_id = $1";
    if (orgao_id) {
      params.push(orgao_id);
      where += ` AND r.orgao_id = $${params.length}`;
    }

    const { rows } = await db.query(
      `SELECT
         r.id,
         r.municipio_id,
         r.orgao_id,
         o.descricao_orgao,
         r.ano_referencia,
         r.mes_referencia,
         r.versao,
         r.ativa,
         r.status,
         r.nome_arquivo_zip,
         r.total_arquivos_txt,
         r.total_linhas,
         r.total_erros,
         r.importado_por_nome,
         r.iniciado_em,
         r.concluido_em
       FROM tcmgo_remessa r
       JOIN tcmgo_orgaos o ON o.id = r.orgao_id
       WHERE ${where}
       ORDER BY r.criado_em DESC
       LIMIT 50`,
      params
    );
    return res.json(rows);
  } catch (err: any) {
    return res.status(err.status ?? 500).json({ mensagem: err.message });
  }
});

// -----------------------------------------------------------------------
// POST /api/tcmgo/importacao/upload
// Recebe ZIP, extrai em memória, valida acesso e grava stg_linha_bruta
// Body: cliente_id, orgao_id, ano_referencia, mes_referencia + arquivo ZIP
// -----------------------------------------------------------------------
router.post("/upload", upload.single("arquivo"), async (req: AuthRequest, res: Response) => {
  const { cliente_id, orgao_id, ano_referencia, mes_referencia } = req.body;

  if (!cliente_id || !orgao_id || !ano_referencia || !mes_referencia) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Campos obrigatórios: cliente_id, orgao_id, ano_referencia, mes_referencia",
    });
  }
  if (!req.file) {
    return res.status(400).json({ sucesso: false, mensagem: "Arquivo ZIP não enviado." });
  }

  const usuario = req.usuario!;

  // Valida acesso e resolve municipio_tcmgo_id
  let municipioTcmgoId: number;
  try {
    const resultado = await resolverMunicipioTcmgo(usuario.id, usuario.perfil, String(cliente_id));
    municipioTcmgoId = resultado.municipioTcmgoId;
  } catch (err: any) {
    return res.status(err.status ?? 500).json({ sucesso: false, mensagem: err.message });
  }

  // Buscar nome do usuário para gravar no histórico
  const { rows: [usuarioDb] } = await db.query(
    `SELECT nome FROM usuarios WHERE id = $1`,
    [usuario.id]
  );
  const usuarioNome: string = usuarioDb?.nome ?? usuario.email;

  const zipBuffer = req.file.buffer;
  const hashZip = crypto.createHash("sha256").update(zipBuffer).digest("hex");

  let remessaId: number | null = null;
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // 1. Criar remessa — usa municipioTcmgoId (ID TCM-GO) como municipio_id
    // Assinatura: fn_criar_remessa(municipio_id, orgao_id, ano, mes, hash_zip, nome_zip, user_id, user_nome)
    const { rows: [remessa] } = await client.query(
      `SELECT fn_criar_remessa($1::integer, $2::integer, $3::smallint, $4::smallint, $5, $6, $7::uuid, $8) AS id`,
      [municipioTcmgoId, orgao_id, ano_referencia, mes_referencia, hashZip, req.file!.originalname, usuario.id, usuarioNome]
    );
    remessaId = remessa.id as number;

    // 2. Atualizar tamanho do ZIP e marcar como recebida
    await client.query(
      `UPDATE tcmgo_remessa
       SET status = 'recebida', tamanho_zip_bytes = $1, iniciado_em = NOW()
       WHERE id = $2`,
      [req.file!.size, remessaId]
    );

    // 3. Descompactar ZIP em memória
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries().filter(
      (e) => !e.isDirectory && e.entryName.toUpperCase().endsWith(".TXT")
    );

    if (entries.length === 0) {
      throw new Error("Nenhum arquivo TXT encontrado no ZIP.");
    }

    await client.query(
      `UPDATE tcmgo_remessa SET total_arquivos_txt = $1 WHERE id = $2`,
      [entries.length, remessaId]
    );

    let totalLinhas = 0;
    const summaryArquivos: Array<{ sigla: string; total_linhas: number }> = [];

    // 4. Processar cada TXT
    for (const entry of entries) {
      const nomeArquivo = entry.entryName.split("/").pop() || entry.entryName;
      // Extrai apenas o prefixo alfabético: "EMP2501.TXT" → "EMP", "ORGAO.TXT" → "ORGAO"
      const siglaMatch = nomeArquivo.match(/^([A-Za-z]+)/);
      const sigla = siglaMatch ? siglaMatch[1].toUpperCase() : nomeArquivo.replace(/\.txt$/i, "").toUpperCase();

      const { rows: [arqRow] } = await client.query(
        `INSERT INTO tcmgo_arquivo_remessa
           (remessa_id, sigla_arquivo, nome_arquivo, tamanho_bytes, status)
         VALUES ($1, $2, $3, $4, 'processando')
         RETURNING id`,
        [remessaId, sigla, nomeArquivo, entry.header.size]
      );
      const arquivoRemessaId: number = arqRow.id;

      // TCM-GO usa encoding ANSI/latin1
      const conteudo = entry.getData().toString("latin1");
      const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim().length > 0);

      if (linhas.length === 0) {
        await client.query(
          `UPDATE tcmgo_arquivo_remessa SET status = 'concluido', total_linhas = 0 WHERE id = $1`,
          [arquivoRemessaId]
        );
        continue;
      }

      // 5. Batch insert em stg_linha_bruta (blocos de 500 linhas)
      const BATCH_SIZE = 500;
      for (let i = 0; i < linhas.length; i += BATCH_SIZE) {
        const batch = linhas.slice(i, i + BATCH_SIZE);
        const valuesStr: string[] = [];
        const paramsFinal: any[] = [];
        let idx = 1;

        for (let j = 0; j < batch.length; j++) {
          const linha = batch[j];
          const numeroLinha = i + j + 1;
          const tipoRegistro = linha.length >= 2 ? linha.substring(0, 2).trim() : null;
          const hashLinha = crypto.createHash("sha256").update(linha).digest("hex");

          valuesStr.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
          paramsFinal.push(remessaId, arquivoRemessaId, numeroLinha, tipoRegistro, linha, sigla, hashLinha);
        }

        await client.query(
          `INSERT INTO stg_linha_bruta
             (remessa_id, arquivo_remessa_id, numero_linha, tipo_registro, conteudo_linha, sigla_arquivo, hash_linha)
           VALUES ${valuesStr.join(", ")}`,
          paramsFinal
        );
      }

      totalLinhas += linhas.length;
      summaryArquivos.push({ sigla, total_linhas: linhas.length });

      await client.query(
        `UPDATE tcmgo_arquivo_remessa
         SET status = 'concluido', total_linhas = $1, processado_em = NOW()
         WHERE id = $2`,
        [linhas.length, arquivoRemessaId]
      );
    }

    // 6. Finalizar remessa
    await client.query(
      `UPDATE tcmgo_remessa
       SET status = 'staging_pronta', total_linhas = $1, atualizado_em = NOW()
       WHERE id = $2`,
      [totalLinhas, remessaId]
    );

    // 7. Registrar no histórico
    await client.query(
      `INSERT INTO tcmgo_historico_processamento (remessa_id, evento, descricao, dados_extras)
       VALUES ($1, 'staging_concluida', $2, $3)`,
      [
        remessaId,
        `ZIP processado: ${entries.length} arquivos, ${totalLinhas} linhas gravadas em stg_linha_bruta.`,
        JSON.stringify({ arquivos: summaryArquivos }),
      ]
    );

    await client.query("COMMIT");

    return res.json({
      sucesso: true,
      remessa_id: remessaId,
      total_arquivos: entries.length,
      total_linhas: totalLinhas,
      arquivos: summaryArquivos,
      mensagem: `Balancete recebido. ${totalLinhas} linhas gravadas na staging.`,
    });
  } catch (err: any) {
    await client.query("ROLLBACK");

    if (remessaId) {
      try {
        await db.query(
          `UPDATE tcmgo_remessa SET status = 'erro', atualizado_em = NOW() WHERE id = $1`,
          [remessaId]
        );
      } catch (_) { /* ignora */ }
    }

    console.error("[IMPORTACAO] Erro no upload:", err);
    return res.status(500).json({ sucesso: false, mensagem: err.message });
  } finally {
    client.release();
  }
});

// -----------------------------------------------------------------------
// POST /api/tcmgo/importacao/parsear/:remessa_id
// Executa o parser posicional: stg_linha_bruta → stg_*
// -----------------------------------------------------------------------
router.post("/parsear/:remessa_id", async (req: AuthRequest, res: Response) => {
  const remessaId = parseInt(req.params.remessa_id, 10);
  if (isNaN(remessaId)) {
    return res.status(400).json({ sucesso: false, mensagem: "remessa_id inválido." });
  }

  // Verifica se a remessa existe e está em staging_pronta
  const { rows: [remessa] } = await db.query(
    `SELECT r.id, r.status, r.municipio_id, r.orgao_id, r.ativa,
            o.descricao_orgao, r.ano_referencia, r.mes_referencia
     FROM tcmgo_remessa r
     JOIN tcmgo_orgaos o ON o.id = r.orgao_id
     WHERE r.id = $1`,
    [remessaId]
  );

  if (!remessa) {
    return res.status(404).json({ sucesso: false, mensagem: "Remessa não encontrada." });
  }
  // Aceita re-parsear em qualquer status exceto "substituida" e "pendente"
  const statusPermitidos = ["staging_pronta", "concluida", "analitico_pronto", "erro"];
  if (!statusPermitidos.includes(remessa.status)) {
    return res.status(422).json({
      sucesso: false,
      mensagem: `Remessa com status "${remessa.status}" não pode ser re-parseada.`,
    });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Marca como processando
    await client.query(
      `UPDATE tcmgo_remessa SET status = 'processando', atualizado_em = NOW() WHERE id = $1`,
      [remessaId]
    );

    // Limpa staging parseada anterior desta remessa (para reprocessamento seguro)
    // Usamos DELETE direto nas tabelas stg_* pelo remessa_id
    const stgTabelas = [
      // Orçamento
      "stg_ide_10",
      "stg_orgao_10",
      "stg_uoc_10", "stg_uoc_11", "stg_uoc_12", "stg_uoc_13", "stg_uoc_14",
      "stg_rec_10", "stg_rec_11", "stg_rec_12",
      "stg_are_10", "stg_are_11",
      "stg_aoc_10", "stg_aoc_11", "stg_aoc_90", "stg_aoc_91", "stg_aoc_92", "stg_aoc_93", "stg_aoc_94",
      "stg_cob_10",
      // Despesa
      "stg_emp_10", "stg_emp_11", "stg_emp_12", "stg_emp_13", "stg_emp_14",
      "stg_anl_10", "stg_anl_11", "stg_anl_12", "stg_anl_13", "stg_anl_14",
      "stg_eoc_10",
      "stg_lqd_10", "stg_lqd_11", "stg_lqd_12",
      "stg_alq_10", "stg_alq_11",
      "stg_ops_10", "stg_ops_11", "stg_ops_12", "stg_ops_13", "stg_ops_14",
      "stg_aop_10", "stg_aop_11",
      "stg_ext_10",
      "stg_aex_10",
      "stg_rsp_10", "stg_rsp_11", "stg_rsp_12",
      // Contabilidade
      "stg_ctb_10", "stg_ctb_11", "stg_ctb_90", "stg_ctb_91",
      "stg_trb_10", "stg_trb_11",
      "stg_tfr_10", "stg_tfr_11",
      "stg_dfr_10",
      "stg_dic_10",
      "stg_dcl_10",
      "stg_par_10",
      "stg_cvc_10", "stg_cvc_20",
      "stg_ecl_10", "stg_ecl_20",
      "stg_aal_10",
      "stg_pct_10", "stg_pct_11", "stg_pct_12", "stg_pct_13", "stg_pct_14",
      "stg_lnc_10", "stg_lnc_11", "stg_lnc_99",
      "stg_con_10", "stg_con_11", "stg_con_20", "stg_con_21", "stg_con_22", "stg_con_23",
      "stg_isi_10",
      "stg_dmr_10",
      // Licitação
      "stg_abl_10", "stg_abl_11", "stg_abl_12", "stg_abl_13",
      "stg_dsi_10", "stg_dsi_11", "stg_dsi_12", "stg_dsi_13", "stg_dsi_14", "stg_dsi_15",
      "stg_rpl_10",
      "stg_hbl_10", "stg_hbl_20",
      "stg_jgl_10", "stg_jgl_30",
      "stg_hml_10", "stg_hml_20", "stg_hml_30",
      "stg_arp_10", "stg_arp_12", "stg_arp_20",
    ];
    for (const t of stgTabelas) {
      await client.query(`DELETE FROM ${t} WHERE remessa_id = $1`, [remessaId]);
    }

    // Executa o parser
    const resultado = await parsearRemessa(remessaId, client);

    // Atualiza status
    const novoStatus = "concluida";
    await client.query(
      `UPDATE tcmgo_remessa
       SET status = $1, concluido_em = NOW(), atualizado_em = NOW()
       WHERE id = $2`,
      [novoStatus, remessaId]
    );

    // Registra no histórico
    await client.query(
      `INSERT INTO tcmgo_historico_processamento (remessa_id, evento, descricao, dados_extras)
       VALUES ($1, 'parse_concluido', $2, $3)`,
      [
        remessaId,
        `Parser posicional: ${resultado.totalParsed} linhas parseadas, ${resultado.totalSkipped} ignoradas.`,
        JSON.stringify({
          totalParsed: resultado.totalParsed,
          totalSkipped: resultado.totalSkipped,
          erros: resultado.erros,
        }),
      ]
    );

    await client.query("COMMIT");

    return res.json({
      sucesso: true,
      remessa_id: remessaId,
      total_parsed: resultado.totalParsed,
      total_skipped: resultado.totalSkipped,
      erros: resultado.erros,
      mensagem: `Parse concluído. ${resultado.totalParsed} linhas distribuídas nas tabelas de staging.`,
    });
  } catch (err: any) {
    await client.query("ROLLBACK");

    try {
      await db.query(
        `UPDATE tcmgo_remessa SET status = 'erro', atualizado_em = NOW() WHERE id = $1`,
        [remessaId]
      );
    } catch (_) { /* ignora */ }

    console.error("[IMPORTACAO] Erro no parse:", err);
    return res.status(500).json({ sucesso: false, mensagem: err.message });
  } finally {
    client.release();
  }
});

// -----------------------------------------------------------------------
// GET /api/tcmgo/importacao/analitico/:remessa_id
// Sumário dos dados analíticos de uma remessa (fato_* counts + totais)
// -----------------------------------------------------------------------
router.get("/analitico/:remessa_id", async (req: AuthRequest, res: Response) => {
  const remessaId = parseInt(req.params.remessa_id, 10);
  if (isNaN(remessaId)) {
    return res.status(400).json({ mensagem: "remessa_id inválido." });
  }

  try {
    const { rows: [remessa] } = await db.query(
      `SELECT r.id, r.status, r.ano_referencia, r.mes_referencia, r.versao,
              o.descricao_orgao, m.descricao AS municipio_nome,
              r.concluido_em
       FROM tcmgo_remessa r
       JOIN tcmgo_orgaos o ON o.id = r.orgao_id
       JOIN tcmgo_municipios m ON m.id = r.municipio_id
       WHERE r.id = $1`,
      [remessaId]
    );

    if (!remessa) {
      return res.status(404).json({ mensagem: "Remessa não encontrada." });
    }

    const [empQ, anulQ, lqdQ, pagQ, recQ, rspQ, extQ, lncQ, tfrQ] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS cnt, COALESCE(SUM(vl_bruto),0)::numeric AS total FROM fato_empenho WHERE remessa_id = $1`, [remessaId]),
      db.query(`SELECT COUNT(*)::int AS cnt, COALESCE(SUM(vl_anulacao),0)::numeric AS total FROM fato_anulacao_empenho WHERE remessa_id = $1`, [remessaId]),
      db.query(`SELECT COUNT(*)::int AS cnt, COALESCE(SUM(vl_liquidado),0)::numeric AS total FROM fato_liquidacao WHERE remessa_id = $1`, [remessaId]),
      db.query(`SELECT COUNT(*)::int AS cnt, COALESCE(SUM(vl_op),0)::numeric AS total FROM fato_pagamento WHERE remessa_id = $1`, [remessaId]),
      db.query(`SELECT COUNT(*)::int AS cnt, COALESCE(SUM(vl_arrecadado),0)::numeric AS arrecadado, COALESCE(SUM(vl_previsto_atualizado),0)::numeric AS previsto FROM fato_receita WHERE remessa_id = $1`, [remessaId]),
      db.query(`SELECT COUNT(*)::int AS cnt, COALESCE(SUM(vl_original),0)::numeric AS original, COALESCE(SUM(vl_baixa_pgto),0)::numeric AS baixado FROM fato_restos_pagar WHERE remessa_id = $1`, [remessaId]),
      db.query(`SELECT COUNT(*)::int AS cnt, COALESCE(SUM(vl_lancamento),0)::numeric AS total FROM fato_extraorcamentario WHERE remessa_id = $1`, [remessaId]),
      db.query(`SELECT COUNT(*)::int AS cnt FROM fato_lancamento_contabil WHERE remessa_id = $1`, [remessaId]),
      db.query(`SELECT (SELECT COUNT(*)::int FROM fato_transferencia_fonte WHERE remessa_id = $1) + (SELECT COUNT(*)::int FROM fato_transferencia_bancaria WHERE remessa_id = $1) AS cnt`, [remessaId]),
    ]);

    return res.json({
      remessa,
      sumario: {
        empenho:              { count: empQ.rows[0].cnt,  total_empenhado: Number(empQ.rows[0].total) },
        anulacao_empenho:     { count: anulQ.rows[0].cnt, total_anulado: Number(anulQ.rows[0].total) },
        liquidacao:           { count: lqdQ.rows[0].cnt,  total_liquidado: Number(lqdQ.rows[0].total) },
        pagamento:            { count: pagQ.rows[0].cnt,  total_pago: Number(pagQ.rows[0].total) },
        receita:              { count: recQ.rows[0].cnt,  total_previsto: Number(recQ.rows[0].previsto), total_arrecadado: Number(recQ.rows[0].arrecadado) },
        restos_pagar:         { count: rspQ.rows[0].cnt,  total_original: Number(rspQ.rows[0].original), total_baixado: Number(rspQ.rows[0].baixado) },
        extraorcamentario:    { count: extQ.rows[0].cnt,  total_lancamento: Number(extQ.rows[0].total) },
        lancamento_contabil:  { count: lncQ.rows[0].cnt },
        transferencias:       { count: tfrQ.rows[0].cnt },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ mensagem: err.message });
  }
});

// -----------------------------------------------------------------------
// POST /api/tcmgo/importacao/processar/:remessa_id
// ETL: stg_* → fato_* via fn_processar_remessa()
// Aceita remessas com status "concluida" (parse já executado)
// -----------------------------------------------------------------------
router.post("/processar/:remessa_id", async (req: AuthRequest, res: Response) => {
  const remessaId = parseInt(req.params.remessa_id, 10);
  if (isNaN(remessaId)) {
    return res.status(400).json({ sucesso: false, mensagem: "remessa_id inválido." });
  }

  const { rows: [remessa] } = await db.query(
    `SELECT r.id, r.status, r.municipio_id, r.orgao_id,
            o.descricao_orgao, r.ano_referencia, r.mes_referencia
     FROM tcmgo_remessa r
     JOIN tcmgo_orgaos o ON o.id = r.orgao_id
     WHERE r.id = $1`,
    [remessaId]
  );

  if (!remessa) {
    return res.status(404).json({ sucesso: false, mensagem: "Remessa não encontrada." });
  }
  if (!["concluida", "analitico_pronto", "erro"].includes(remessa.status)) {
    return res.status(422).json({
      sucesso: false,
      mensagem: `Remessa com status "${remessa.status}". Só é possível processar remessas com status "concluida".`,
    });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Limpa fatos anteriores (idempotente)
    await client.query(`SELECT fn_limpar_dados_analiticos($1)`, [remessaId]);

    // Executa ETL e coleta resultado por tabela
    const { rows: etlRows } = await client.query<{ tabela: string; linhas_inseridas: number }>(
      `SELECT tabela, linhas_inseridas FROM fn_processar_remessa($1)`,
      [remessaId]
    );

    await client.query("COMMIT");

    const totalInserido = etlRows.reduce((acc, r) => acc + (r.linhas_inseridas ?? 0), 0);

    return res.json({
      sucesso: true,
      remessa_id: remessaId,
      total_inserido: totalInserido,
      tabelas: etlRows,
      mensagem: `ETL concluído. ${totalInserido.toLocaleString("pt-BR")} registros distribuídos nas tabelas analíticas.`,
    });
  } catch (err: any) {
    await client.query("ROLLBACK");

    try {
      await db.query(
        `UPDATE tcmgo_remessa SET status = 'erro', atualizado_em = NOW() WHERE id = $1`,
        [remessaId]
      );
    } catch (_) { /* ignora */ }

    console.error("[IMPORTACAO] Erro no processar ETL:", err);
    return res.status(500).json({ sucesso: false, mensagem: err.message });
  } finally {
    client.release();
  }
});

export default router;
