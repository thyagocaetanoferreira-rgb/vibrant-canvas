// TCM-GO 2025 — Parser posicional: stg_linha_bruta → stg_*
// Lê as linhas brutas de uma remessa e popula as tabelas de staging parseadas.

import { PoolClient } from "pg";
import { LAYOUTS, FieldDef } from "./tcmgoLayouts";

const BATCH_SIZE = 500;

interface LinhaRow {
  id: number;
  arquivo_remessa_id: number;
  numero_linha: number;
  sigla_arquivo: string;
  tipo_registro: string | null;
  conteudo_linha: string;
  linha_bruta: string;
}

interface ParseResult {
  totalParsed: number;
  totalSkipped: number;
  erros: Array<{ sigla: string; tipo_registro: string; count: number; exemplo: string }>;
}

// Extrai valor de uma linha posicional (1-indexed → 0-indexed JS)
function extrairCampo(linha: string, field: FieldDef): string {
  return linha.substring(field.start - 1, field.end);
}

// Constrói e executa um INSERT em lote para uma tabela stg_*
async function flushBuffer(
  client: PoolClient,
  table: string,
  cols: string[],
  rows: any[][]
): Promise<void> {
  if (rows.length === 0) return;

  const colList = cols.join(", ");
  const valuePlaceholders: string[] = [];
  const params: any[] = [];
  let idx = 1;

  for (const row of rows) {
    const rowPlaceholders = row.map(() => `$${idx++}`);
    valuePlaceholders.push(`(${rowPlaceholders.join(", ")})`);
    params.push(...row);
  }

  await client.query(
    `INSERT INTO ${table} (${colList}) VALUES ${valuePlaceholders.join(", ")}`,
    params
  );
}

export async function parsearRemessa(
  remessaId: number,
  client: PoolClient
): Promise<ParseResult> {
  let totalParsed = 0;
  let totalSkipped = 0;
  const erroMap = new Map<string, { count: number; exemplo: string }>();

  // Busca todos os arquivos da remessa que temos layout definido
  const siglasSuportadas = Object.keys(LAYOUTS);

  // Processa por arquivo para manter contexto e não sobrecarregar memória
  for (const sigla of siglasSuportadas) {
    const layoutSigla = LAYOUTS[sigla];

    // Seleciona linhas desta sigla em blocos
    let offset = 0;
    while (true) {
      const { rows } = await client.query<LinhaRow>(
        `SELECT id, arquivo_remessa_id, numero_linha, sigla_arquivo, tipo_registro, conteudo_linha, conteudo_linha AS linha_bruta
         FROM stg_linha_bruta
         WHERE remessa_id = $1 AND sigla_arquivo = $2
         ORDER BY numero_linha
         LIMIT $3 OFFSET $4`,
        [remessaId, sigla, BATCH_SIZE, offset]
      );

      if (rows.length === 0) break;
      offset += rows.length;

      // Agrupa por tipo_registro
      const gruposPorTipo = new Map<string, LinhaRow[]>();
      for (const row of rows) {
        const tipo = (row.tipo_registro ?? "").trim();
        if (!gruposPorTipo.has(tipo)) gruposPorTipo.set(tipo, []);
        gruposPorTipo.get(tipo)!.push(row);
      }

      // Processa cada tipo_registro
      for (const [tipo, linhas] of gruposPorTipo) {
        const registroLayout = layoutSigla[tipo];
        if (!registroLayout) {
          totalSkipped += linhas.length;
          const key = `${sigla}:${tipo}`;
          if (!erroMap.has(key)) {
            erroMap.set(key, { count: 0, exemplo: linhas[0].conteudo_linha.substring(0, 40) });
          }
          erroMap.get(key)!.count += linhas.length;
          continue;
        }

        const { table, fields } = registroLayout;

        // Colunas base + posicionais
        const cols = [
          "remessa_id",
          "arquivo_remessa_id",
          "numero_linha",
          "linha_bruta",
          ...fields.map((f) => f.col),
        ];

        const insertRows: any[][] = [];

        for (const linha of linhas) {
          const conteudo = linha.conteudo_linha;
          const row: any[] = [
            remessaId,
            linha.arquivo_remessa_id,
            linha.numero_linha,
            conteudo,
          ];

          for (const field of fields) {
            const valor = extrairCampo(conteudo, field);
            if (field.type === "int") {
              const parsed = parseInt(valor.trim(), 10);
              // Guarda null se o valor extrapolou o limite do INTEGER do PostgreSQL
              const PG_INT_MAX = 2_147_483_647;
              row.push(isNaN(parsed) || parsed > PG_INT_MAX || parsed < -PG_INT_MAX ? null : parsed);
            } else {
              row.push(valor);
            }
          }

          insertRows.push(row);
        }

        // INSERT em mini-lotes de BATCH_SIZE dentro do grupo
        for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
          await flushBuffer(client, table, cols, insertRows.slice(i, i + BATCH_SIZE));
        }

        totalParsed += linhas.length;
      }
    }
  }

  const erros = Array.from(erroMap.entries()).map(([key, v]) => {
    const [sigla, tipo_registro] = key.split(":");
    return { sigla, tipo_registro, count: v.count, exemplo: v.exemplo };
  });

  return { totalParsed, totalSkipped, erros };
}
