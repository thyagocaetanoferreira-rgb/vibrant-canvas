# Metodologia de Homologação: stg_linha_bruta → stg_*

## Contexto

O TCM-GO utiliza arquivos de texto posicional com largura fixa. Cada linha tem comprimento fixo definido por tipo de arquivo e tipo de registro. O parser extrai campos via `substring(posição_início, tamanho)` e insere nas tabelas `stg_*`.

**Problema recorrente:** o parser original foi escrito sem confrontar o layout oficial, resultando em:
- Campos classificatórios faltando (`codPrograma`, `codFuncao`, `codSubFuncao`, etc.)
- Posições erradas (campo lido 10+ posições fora do lugar)
- Campos inexistentes mapeados
- `nro_sequencial` lido além do comprimento do registro
- Tabelas com estrutura completamente diferente do layout real

---

## Princípio fundamental

> **Nunca assuma que uma tabela `stg_*` está correta só porque ela existe.**
> Toda correção exige evidência posicional concreta extraída da linha bruta.

---

## Passo a Passo

### 1. Identificar registros disponíveis na remessa

```sql
SELECT tipo_registro, COUNT(*) as linhas
FROM stg_linha_bruta
WHERE sigla_arquivo = 'XXX' AND remessa_id = <id>
GROUP BY tipo_registro
ORDER BY tipo_registro;
```

Anote quais tipos de registro existem (10, 11, 12...) e quantas linhas cada um tem.

---

### 2. Medir o comprimento real do registro

```sql
SELECT conteudo_linha, length(conteudo_linha) as len
FROM stg_linha_bruta
WHERE sigla_arquivo = 'XXX' AND remessa_id = <id>
  AND tipo_registro = '10'
LIMIT 1;
```

O comprimento (`len`) deve bater com o layout oficial.
Se `len` diverge, investigue o arquivo de origem (pode ser trailing CRLF, BOM, etc.).

---

### 3. Extrair o layout oficial do XLSX

O layout oficial do TCM-GO está em `C:/Users/Thyago/Downloads/Layout Balancete.xlsx`.

Execute o script Node.js abaixo para localizar a seção de um arquivo específico e imprimir suas linhas com campo, posição De, posição Até e tamanho:

```javascript
// node extract_layout.js
const fs = require('fs');
const zlib = require('zlib');
const xlsxPath = 'C:/Users/Thyago/Downloads/Layout Balancete.xlsx';
const buf = fs.readFileSync(xlsxPath);

function readZipEntry(buf, name) {
  let off = 0;
  while (off < buf.length - 4) {
    if (buf.readUInt32LE(off) !== 0x04034b50) { off++; continue; }
    const fnLen = buf.readUInt16LE(off+26), exLen = buf.readUInt16LE(off+28);
    const fn = buf.slice(off+30, off+30+fnLen).toString();
    const dataOff = off+30+fnLen+exLen, compSize = buf.readUInt32LE(off+18);
    const comp = buf.readUInt16LE(off+8);
    if (fn === name) {
      return comp === 8 ? zlib.inflateRawSync(buf.slice(dataOff, dataOff+compSize))
                        : buf.slice(dataOff, dataOff+compSize);
    }
    off = dataOff + compSize;
  }
}

const strings = [];
const ssXml = readZipEntry(buf, 'xl/sharedStrings.xml').toString();
const siRe = /<si>([\s\S]*?)<\/si>/g; let m;
while ((m = siRe.exec(ssXml)) !== null)
  strings.push(m[1].replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').trim());

const rows = {};
const wsXml = readZipEntry(buf, 'xl/worksheets/sheet1.xml').toString();
const cellRe = /<c r="([A-Z]+)(\d+)"([^>]*)>(.*?)<\/c>/gs;
while ((m = cellRe.exec(wsXml)) !== null) {
  const [,col,row,attrs,inner] = m;
  if (!rows[+row]) rows[+row] = {};
  const v = (inner.match(/<v>([^<]*)<\/v>/) || [])[1];
  rows[+row][col] = attrs.includes('t="s"') && v != null ? strings[+v] : v ?? '';
}

// Localizar seção pelo string index do cabeçalho do arquivo
// Ex: 'EMP - ARQUIVO DOS EMPENHOS' está no string 602, célula A479
// Ajuste o rowStart e rowEnd conforme a seção desejada
const rowNums = Object.keys(rows).map(Number).sort((a,b)=>a-b);
const rowStart = 479, rowEnd = 614; // exemplo para EMP
rowNums.filter(r => r >= rowStart && r < rowEnd).forEach(r => {
  const row = rows[r];
  if (row['B'] && row['E'] && row['G']) // campo, De, Até
    console.log(`${row['B'].padEnd(35)} De:${row['E'].padStart(4)} Até:${row['G'].padStart(4)} Tam:${row['H']}`);
});
```

**Referência de seções no XLSX** (linhas da planilha):

| Arquivo | Linha início | Linha fim |
|---------|-------------|-----------|
| IDE     | ~16         | ~60       |
| ORGAO   | ~60         | ~80       |
| UOC     | ~115        | ~170      |
| REC     | ~200        | ~280      |
| ARE     | ~345        | ~410      |
| AOC     | ~430        | ~480      |
| EMP     | 479         | 614       |
| ANL     | 614         | 747       |
| EOC     | 747         | ~790      |
| LQD     | ~790        | ~860      |
| ALQ     | ~860        | ~940      |
| OPS     | ~940        | ~1010     |
| AOP     | ~1010       | ~1080     |

---

### 4. Comparar layout oficial com o parser atual (`tcmgoLayouts.ts`)

Abra `server/src/lib/tcmgoLayouts.ts` e localize a seção do arquivo.

Para cada campo do layout oficial, verifique:

| Verificação | Exemplo de erro |
|-------------|----------------|
| O campo existe no parser? | `codPrograma` ausente em ANL |
| A posição `start` está correta? | `nro_empenho` em 7-12 quando deveria ser 28-33 |
| O `end` corresponde ao tamanho? | `end = start + tam - 1` |
| O nome da coluna bate com o DDL? | `cpf_cnpj` vs `cpf_cnpj_credor` |
| O tipo está certo? | `nro_sequencial` deve ter `type: "int"` |

---

### 5. Dissecar a linha bruta posicionalmente

Com a linha bruta em mãos, extraia cada campo via SQL para confirmar o layout:

```sql
SELECT
  substring(conteudo_linha,  1,  2) AS tipo_registro,
  substring(conteudo_linha,  3,  4) AS cod_programa,
  substring(conteudo_linha,  7,  2) AS cod_orgao,
  substring(conteudo_linha,  9,  2) AS cod_unidade,
  -- ... todos os campos do layout
  substring(conteudo_linha, 974,  6) AS nro_sequencial,
  length(conteudo_linha) AS comprimento_total
FROM stg_linha_bruta
WHERE sigla_arquivo = 'XXX' AND tipo_registro = '10' AND remessa_id = <id>
LIMIT 3;
```

Confronte cada valor extraído com o esperado pelo contexto (ex: `nro_sequencial` deve ser um número sequencial pequeno como `000001`; `dt_*` deve ter formato `DDMMAAAA`; valores monetários têm vírgula decimal).

**Sinais de posição errada:**
- `nro_sequencial` retorna vazio ou lixo → parser lendo além do comprimento do registro
- Campo de data retorna dígitos que não formam uma data válida
- Valor monetário não tem vírgula na posição esperada (10ª posição de 13)
- Campo de texto retorna números ou vice-versa

---

### 6. Corrigir o parser (`tcmgoLayouts.ts`)

Substitua o bloco do arquivo com as posições corretas:

```typescript
ARQUIVO: {
  "10": {
    table: "stg_arquivo_10",
    fields: [
      { col: "tipo_registro",   start:   1, end:   2 },
      { col: "cod_programa",    start:   3, end:   6 },
      { col: "cod_orgao",       start:   7, end:   8 },
      { col: "cod_unidade",     start:   9, end:  10 },
      { col: "cod_funcao",      start:  11, end:  12 },
      { col: "cod_subfuncao",   start:  13, end:  15 },
      { col: "natureza_acao",   start:  16, end:  16 },
      { col: "nro_proj_ativ",   start:  17, end:  19 },
      { col: "elemento_despesa",start:  20, end:  25 },
      { col: "sub_elemento",    start:  26, end:  27 },
      // ... campos específicos do tipo de registro
      { col: "nro_sequencial",  start: 974, end: 979, type: "int" },
    ],
  },
}
```

**Regras de posição:**
- Posições são **1-based** (primeira coluna = 1)
- `start` e `end` são **inclusivos**: campo de 6 chars em pos 3 → `start:3, end:8`
- `end = start + tam - 1` (onde `tam` é o tamanho do campo no layout)
- Campos `type: "int"` são convertidos com `NULLIF(trim(...), '')::integer`

---

### 7. Corrigir o DDL da tabela `stg_*`

Para tabelas com estrutura completamente errada, use DROP + CREATE:

```sql
DROP TABLE IF EXISTS stg_arquivo_10;
CREATE TABLE stg_arquivo_10 (
    id                 SERIAL PRIMARY KEY,
    remessa_id         INTEGER NOT NULL REFERENCES tcmgo_remessa(id) ON DELETE CASCADE,
    arquivo_remessa_id INTEGER NOT NULL REFERENCES tcmgo_arquivo_remessa(id) ON DELETE CASCADE,
    numero_linha       INTEGER NOT NULL,
    linha_bruta        TEXT,
    -- campos conforme layout:
    tipo_registro      VARCHAR(2),
    cod_programa       VARCHAR(4),
    cod_orgao          VARCHAR(2),
    cod_unidade        VARCHAR(2),
    cod_funcao         VARCHAR(2),
    cod_subfuncao      VARCHAR(3),
    natureza_acao      VARCHAR(1),
    nro_proj_ativ      VARCHAR(3),
    elemento_despesa   VARCHAR(6),
    sub_elemento       VARCHAR(2),
    -- campos específicos do tipo:
    nro_empenho        VARCHAR(6),
    -- campos monetários como VARCHAR(13) — ex: "0000032984,00"
    vl_campo           VARCHAR(13),
    -- datas como VARCHAR(8) — ex: "16012026"
    dt_campo           VARCHAR(8),
    nro_sequencial     INTEGER,
    criado_em          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_stg_arquivo_10_remessa ON stg_arquivo_10(remessa_id);
```

Para tabelas que precisam apenas de ajustes pontuais:

```sql
ALTER TABLE stg_arquivo_10
  DROP COLUMN IF EXISTS campo_errado,
  ADD COLUMN IF NOT EXISTS campo_novo VARCHAR(13);

ALTER TABLE stg_arquivo_10
  ALTER COLUMN tp_campo TYPE VARCHAR(2);  -- se o tamanho estava errado
```

**Tamanhos padrão por tipo de campo TCM-GO:**

| Tipo TCM-GO | VARCHAR | Exemplo |
|-------------|---------|---------|
| Monetário | 13 | `0000032984,00` |
| Data DDMMAAAA | 8 | `16012026` |
| Numérico sequencial | INTEGER | 1, 2, 3... |
| CPF (11 chars) | 11 | `00420998110` |
| CNPJ (14 chars) | 14 | `40538021000180` |
| CPF/CNPJ (14 chars) | 14 | campo único para ambos |
| Texto longo (especificação) | tam real | 200, 255, 282... |

---

### 8. Reparsear via INSERT direto (sem reprocessar o arquivo)

Em vez de re-enviar o arquivo, reinsira diretamente usando `substring()` sobre `stg_linha_bruta`:

```sql
DELETE FROM stg_arquivo_10 WHERE remessa_id = <id>;

INSERT INTO stg_arquivo_10 (
  remessa_id, arquivo_remessa_id, numero_linha, linha_bruta,
  tipo_registro, cod_programa, cod_orgao, cod_unidade,
  -- ... todos os campos
  nro_sequencial
)
SELECT
  remessa_id, arquivo_remessa_id, numero_linha, conteudo_linha,
  substring(conteudo_linha,   1,  2),   -- tipo_registro
  substring(conteudo_linha,   3,  4),   -- cod_programa
  substring(conteudo_linha,   7,  2),   -- cod_orgao
  substring(conteudo_linha,   9,  2),   -- cod_unidade
  -- ...
  NULLIF(trim(substring(conteudo_linha, 974, 6)), '')::integer  -- nro_sequencial
FROM stg_linha_bruta
WHERE sigla_arquivo = 'XXX' AND tipo_registro = '10' AND remessa_id = <id>;
```

> **Convenção `substring` no PostgreSQL:** `substring(texto, início, comprimento)`
> O `início` é **1-based**. O segundo parâmetro é o **comprimento**, não o fim.
> Para campo De=28, Até=33 → `substring(linha, 28, 6)` (tamanho = 33-28+1 = 6)

---

### 9. Validar o resultado

Compare os valores extraídos com a linha bruta original:

```sql
-- Versão rápida: verificar campos-chave
SELECT
  a.nro_sequencial,
  a.cod_programa,
  a.nro_empenho,
  a.dt_anulacao,
  a.vl_anulacao,
  -- Verificar contra a linha bruta diretamente:
  substring(b.conteudo_linha, 28, 6) AS emp_esperado,
  substring(b.conteudo_linha, 66, 13) AS vl_esperado,
  substring(b.conteudo_linha, 344, 6) AS seq_esperado
FROM stg_arquivo_10 a
JOIN stg_linha_bruta b
  ON b.remessa_id = a.remessa_id
  AND b.numero_linha = a.numero_linha
  AND b.sigla_arquivo = 'XXX'
WHERE a.remessa_id = <id>
ORDER BY a.nro_sequencial
LIMIT 5;
```

**Checklist de validação:**
- [ ] `nro_sequencial` é um inteiro crescente (1, 2, 3...) sem gaps inesperados
- [ ] `dt_*` tem 8 chars e representa uma data válida no formato DDMMAAAA
- [ ] Valores monetários têm vírgula na 11ª posição (`NNNNNNNNNN,NN`)
- [ ] `cod_programa` tem 4 chars numéricos
- [ ] `nro_empenho` tem 6 chars (ou 7 no caso especial do EMP.13)
- [ ] Campos de texto longos (especificação, nome_credor) não cortam no meio de uma palavra
- [ ] Contagem de linhas bate com `stg_linha_bruta` para o mesmo tipo

---

## Casos especiais identificados

### EMP.13 — `sub_elemento` tem 1 char, `nro_empenho` tem 7 chars

No registro 13 do arquivo EMP, o layout define:
- `subElemento` em pos 26-26 (1 char, não 2)
- `nroEmpenho` em pos 27-33 (7 chars, não 6)

Isso é exceção ao padrão dos demais registros EMP onde `subElemento` é 26-27 e `nroEmpenho` é 28-33.

### Campos classificatórios obrigatórios em todos os registros EMP/ANL/AOC/LQD/OPS

Todo registro com tipo 10-19 dos arquivos de despesa **sempre começa com**:
```
pos  1- 2: tipoRegistro   (2)
pos  3- 6: codPrograma    (4)
pos  7- 8: codOrgao       (2)
pos  9-10: codUnidade     (2)
pos 11-12: codFuncao      (2)
pos 13-15: codSubFuncao   (3)
pos    16: naturezaAcao   (1)
pos 17-19: nroProjAtiv    (3)
pos 20-25: elementoDespesa(6)
pos 26-27: subElemento    (2)  ← exceto EMP.13
pos 28-33: nroEmpenho     (6)  ← exceto EMP.13 (pos 27-33)
```

O bloco de 33 chars é o cabeçalho classificatório. Campos específicos do subtipo começam na pos 34 em diante (ou 35 em AOC que tem dtAlteracao em 26-33).

### `nro_sequencial` sempre nas últimas 6 posições do registro

Para todos os arquivos TCM-GO 2025:
- O registro tem comprimento fixo L
- `nroSequencial` está em pos `(L-5)` a `L`
- Ex: EMP (979 chars) → pos 974-979; ANL (349 chars) → pos 344-349; AOC (86 chars) → pos 81-86

Se o `nro_sequencial` retorna vazio, a causa raiz é sempre: o parser está lendo além do comprimento do registro.

---

## Estrutura de arquivos relevantes

```
server/src/lib/tcmgoLayouts.ts   ← definições de posição de todos os campos
database/migrations/
  20260318000000_tcmgo_importacao_v5_2.sql  ← DDL original das tabelas stg_*
C:/Users/Thyago/Downloads/Layout Balancete.xlsx  ← layout oficial TCM-GO 2025
```

---

## Status de homologação (remessa_id=4, Jan/2026)

| Arquivo | Tipos | Comprimento | Status |
|---------|-------|-------------|--------|
| ARE | 10, 11, 12, 99 | 289 chars | ✅ Homologado |
| AOC | 10, 11, 12, 90-94, 99 | 86 chars | ✅ Homologado |
| EMP | 10, 11, 12, 13, 14, 99 | 979 chars | ✅ Homologado |
| ANL | 10, 11, 99 | 349 chars | ✅ Homologado |
| LQD | 10, 11, 12 | 357 chars | ✅ Homologado |
| OPS | 10, 11, 12, 13, 14 | 443 chars | ✅ Homologado |
| AOP | 10, 11, 12, 13, 14 | 391 chars | ✅ Homologado (sem dados na remessa jan/2026) |
| ALQ | 10, 11, 12 | 242 chars | ✅ Homologado |
| RSP | 10, 11, 12 | 157 chars | ✅ Homologado (tipos 11/12 sem dados; estrutura única: sem header classificatório, dot_orig_p2002 exclusivo) |
| UOC | 10, 11, 12, 13, 14 | 390 chars | ✅ Homologado (escolaridade e campos de endereço/provimento/OAB corrigidos; nro_sequencial ajustado para 385-390) |
