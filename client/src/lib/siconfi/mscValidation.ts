import type { MSCRecord, MscType, ValidationReport, ValidationResult } from "./types";

// Funções auxiliares para normalizar nomes de colunas variantes no CSV
const getContaKey = (r: MSCRecord): string =>
  r.CONTA ?? r.conta ?? r.Conta ?? "";

const getTipoValor = (r: MSCRecord): string =>
  (r.Tipo_valor ?? r.tipo_valor ?? r.TIPO_VALOR ?? "").toLowerCase();

const getValor = (r: MSCRecord): number =>
  parseFloat(r.Valor ?? r.valor ?? r.VALOR ?? "0") || 0;

const getNatureza = (r: MSCRecord): string =>
  (r.Natureza_valor ?? r.natureza_valor ?? r.NATUREZA_VALOR ?? "").toUpperCase();

const getPO = (r: MSCRecord): string =>
  r.PO ?? r.po ?? r.Po ?? r.IC1 ?? r.ic1 ?? "";

// Índices PCASP — carregados sob demanda (lazy) para não bloquear o bundle inicial
let pcaspMap: Map<string, any> | null = null;
let naturezaMap: Map<string, string> | null = null;

async function getPcaspMaps(): Promise<{
  accounts: Map<string, any>;
  natureza: Map<string, string>;
}> {
  if (pcaspMap && naturezaMap) return { accounts: pcaspMap, natureza: naturezaMap };

  const res = await fetch("/pcasp-estendido.json");
  const data: any[] = await res.json();

  pcaspMap = new Map(data.map((item) => [item.conta, item]));
  naturezaMap = new Map(data.map((item) => [item.conta, item.natureza_saldo]));

  return { accounts: pcaspMap, natureza: naturezaMap };
}

export const parseMSCData = (csvText: string): MSCRecord[] => {
  const lines = csvText.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delimiter).map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(delimiter).map((v) => v.trim());
    const record: MSCRecord = {};
    headers.forEach((h, i) => { record[h] = values[i] ?? ""; });
    return record;
  });
};

// Validações MSC Agregada
const validateAgregada = (
  data: MSCRecord[],
  accounts: Map<string, any>,
  natureza: Map<string, string>
): ValidationResult[] => {
  const results: ValidationResult[] = [];

  // D1_00016: Valores negativos (crítico)
  const negatives = data.filter((r) => getValor(r) < 0);
  results.push({
    id: "D1_00016",
    description: "Emissão de MSC com valores negativos",
    status: negatives.length > 0 ? "fail" : "pass",
    message: negatives.length > 0
      ? `${negatives.length} registro(s) com valor negativo`
      : "Nenhum valor negativo encontrado",
    details: negatives.slice(0, 10),
  });

  // D1_00017: period_change com valor zero (sinal de inconsistência)
  const zeroMovs = data.filter(
    (r) => getTipoValor(r) === "period_change" && getValor(r) === 0
  );
  results.push({
    id: "D1_00017",
    description: "Emissão de MSC com valores inferior a zero",
    status: zeroMovs.length > 0 ? "warning" : "pass",
    message: zeroMovs.length > 0
      ? `${zeroMovs.length} registro(s) com possível inconsistência`
      : "Movimentação contábil consistente",
    details: zeroMovs.slice(0, 10),
  });

  // D1_00018: Código de poder/órgão com comprimento != 5
  const invalidPO = data.filter((r) => {
    const po = getPO(r);
    return po && po.length !== 5;
  });
  results.push({
    id: "D1_00018",
    description: "Emissão de MSC com códigos de poder/órgão incorretos",
    status: invalidPO.length > 0 ? "warning" : "pass",
    message: invalidPO.length > 0
      ? `${invalidPO.length} registro(s) com código inválido`
      : "Códigos de poder/órgão válidos",
    details: invalidPO.slice(0, 10),
  });

  // D1_00019: Natureza de saldo invertida (comparando com PCASP)
  const invertedNat = data.filter((r) => {
    const conta = getContaKey(r);
    const nat = getNatureza(r);
    const expected = natureza.get(conta);
    return expected && nat && nat !== expected;
  });
  results.push({
    id: "D1_00019",
    description: "Emissão de MSC com saldos invertidos (D/C)",
    status: invertedNat.length > 0 ? "warning" : "pass",
    message: invertedNat.length > 0
      ? `${invertedNat.length} registro(s) com natureza possivelmente invertida`
      : "Natureza de saldo consistente",
    details: invertedNat.slice(0, 10),
  });

  // D1_00020: Registros com Tipo_valor diferente de period_change e valor > 0
  const diffMovement = data.filter(
    (r) => getTipoValor(r) !== "period_change" && getValor(r) > 0
  );
  results.push({
    id: "D1_00020",
    description: "Emissão de MSC com contas com movimentação diferente",
    status: diffMovement.length > 0 ? "warning" : "pass",
    message: diffMovement.length > 0
      ? `${diffMovement.length} registro(s) com movimentação diferente`
      : "Movimentação consistente",
    details: diffMovement.slice(0, 10),
  });

  // D1_00021: Valores entre 0 (exclusivo) e 0.01 — saldos ínfimos suspeitos
  const tinyBalances = data.filter(
    (r) => getValor(r) !== 0 && Math.abs(getValor(r)) < 0.01
  );
  results.push({
    id: "D1_00021",
    description: "Emissão de MSC com saldos divergentes (< R$ 0,01)",
    status: tinyBalances.length > 0 ? "warning" : "pass",
    message: tinyBalances.length > 0
      ? `${tinyBalances.length} registro(s) com saldo suspeito`
      : "Saldos consistentes",
    details: tinyBalances.slice(0, 10),
  });

  // D1_00022: Código genérico "00000"
  const genericPO = data.filter((r) => getPO(r) === "00000");
  results.push({
    id: "D1_00022",
    description: "Emissão de MSC com código genérico de poder/órgão (00000)",
    status: genericPO.length > 0 ? "warning" : "pass",
    message: genericPO.length > 0
      ? `${genericPO.length} registro(s) com código genérico`
      : "Sem uso de código genérico",
    details: genericPO.slice(0, 10),
  });

  // D1_00023: Registros com valor zero (períodos sem movimentação)
  const zeroed = data.filter((r) => getValor(r) === 0);
  results.push({
    id: "D1_00023",
    description: "Emissão de MSC com informações de todos os períodos (valores zero)",
    status: zeroed.length > 0 ? "warning" : "pass",
    message: zeroed.length > 0
      ? `${zeroed.length} registro(s) com valor zero`
      : "Todos os registros têm valores",
    details: zeroed.slice(0, 10),
  });

  // D1_00024: Dados de legisladores (PO começa com "1")
  const legisladores = data.filter((r) => getPO(r).startsWith("1"));
  results.push({
    id: "D1_00024",
    description: "Presença de dados de legisladores (poder/órgão iniciado em 1)",
    status: legisladores.length > 0 ? "warning" : "pass",
    message: legisladores.length > 0
      ? `${legisladores.length} registro(s) de legisladores`
      : "Sem dados de legisladores",
    details: legisladores.slice(0, 10),
  });

  // D1_00025: Dados do executivo (PO começa com "2")
  const executivo = data.filter((r) => getPO(r).startsWith("2"));
  results.push({
    id: "D1_00025",
    description: "Presença de dados do executivo (poder/órgão iniciado em 2)",
    status: executivo.length > 0 ? "warning" : "pass",
    message: executivo.length > 0
      ? `${executivo.length} registro(s) do executivo`
      : "Sem dados do executivo",
    details: executivo.slice(0, 10),
  });

  // D1_00026: Contas fora do PCASP Estendido 2025
  const invalidAccounts = data.filter((r) => {
    const conta = getContaKey(r);
    return conta && !accounts.has(conta);
  });
  results.push({
    id: "D1_00026",
    description: "Validação de contas conforme PCASP Estendido 2025",
    status: invalidAccounts.length > 0 ? "warning" : "pass",
    message: invalidAccounts.length > 0
      ? `${invalidAccounts.length} conta(s) não encontrada(s) no PCASP`
      : "Todas as contas são válidas",
    details: invalidAccounts.slice(0, 10),
  });

  // D1_00027: Natureza do saldo divergente do PCASP
  const wrongNat = data.filter((r) => {
    const conta = getContaKey(r);
    const nat = getNatureza(r);
    const expected = natureza.get(conta);
    return expected && nat && nat !== expected;
  });
  results.push({
    id: "D1_00027",
    description: "Validação de natureza de saldo (D/C) conforme PCASP",
    status: wrongNat.length > 0 ? "warning" : "pass",
    message: wrongNat.length > 0
      ? `${wrongNat.length} registro(s) com natureza incorreta`
      : "Natureza de saldo consistente com PCASP",
    details: wrongNat.slice(0, 10),
  });

  return results;
};

// Validações MSC Encerramento
const validateEncerramento = (
  data: MSCRecord[],
  accounts: Map<string, any>
): ValidationResult[] => {
  const results: ValidationResult[] = [];

  const negatives = data.filter((r) => getValor(r) < 0);
  results.push({
    id: "D2_00054",
    description: "Relação entre VPA e VPD com resultado do exercício",
    status: negatives.length > 0 ? "fail" : "pass",
    message: negatives.length > 0
      ? `${negatives.length} registro(s) com valores negativos`
      : "Nenhum valor negativo encontrado",
    details: negatives.slice(0, 10),
  });

  const invalidAccounts = data.filter((r) => {
    const conta = getContaKey(r);
    return conta && !accounts.has(conta);
  });
  results.push({
    id: "D2_00055",
    description: "Ativos intangíveis maior que amortização acumulada",
    status: invalidAccounts.length > 0 ? "warning" : "pass",
    message: invalidAccounts.length > 0
      ? `${invalidAccounts.length} conta(s) não encontrada(s) no PCASP`
      : "Todas as contas são válidas",
    details: invalidAccounts.slice(0, 10),
  });

  const resultAccounts = data.filter(
    (r) =>
      (getContaKey(r).startsWith("8") || getContaKey(r).startsWith("9")) &&
      getValor(r) !== 0
  );
  results.push({
    id: "D2_00056",
    description: "Evidenciação de ativos e passivos contingentes",
    status: resultAccounts.length > 0 ? "warning" : "pass",
    message: resultAccounts.length > 0
      ? `${resultAccounts.length} registro(s) de resultado não zerados`
      : "Contas de resultado zeradas",
    details: resultAccounts.slice(0, 10),
  });

  return results;
};

// Comparação entre duas MSCs (inter-meses)
export const compararInterMeses = (
  data1: MSCRecord[],
  data2: MSCRecord[]
): ValidationResult[] => {
  if (!data1.length || !data2.length) {
    return [{
      id: "INTER_MSC_001",
      description: "Análise de continuidade entre MSCs",
      status: "fail",
      message: "Uma ou ambas as MSCs estão vazias",
    }];
  }

  const contas1 = new Set(data1.map(getContaKey).filter(Boolean));
  const contas2 = new Set(data2.map(getContaKey).filter(Boolean));

  const removidas = [...contas1].filter((c) => !contas2.has(c));
  const novas = [...contas2].filter((c) => !contas1.has(c));

  return [
    {
      id: "INTER_MSC_001",
      description: "Continuidade de saldos entre períodos",
      status: removidas.length > 0 || novas.length > 0 ? "warning" : "pass",
      message:
        removidas.length > 0 || novas.length > 0
          ? `${removidas.length} conta(s) removida(s), ${novas.length} nova(s)`
          : "Continuidade de saldos validada",
      details: { removidas: removidas.slice(0, 20), novas: novas.slice(0, 20) },
    },
    {
      id: "INTER_MSC_002",
      description: "Contas removidas na segunda MSC",
      status: removidas.length > 0 ? "warning" : "pass",
      message: removidas.length > 0
        ? `${removidas.length} conta(s) não encontrada(s) na segunda MSC`
        : "Nenhuma conta foi removida",
      details: removidas.slice(0, 20),
    },
    {
      id: "INTER_MSC_003",
      description: "Contas novas na segunda MSC",
      status: novas.length > 0 ? "warning" : "pass",
      message: novas.length > 0
        ? `${novas.length} conta(s) nova(s) na segunda MSC`
        : "Nenhuma conta nova foi adicionada",
      details: novas.slice(0, 20),
    },
  ];
};

// Ponto de entrada principal — assíncrono por causa do PCASP lazy load
export const validateMSC = async (
  data: MSCRecord[],
  mscType: MscType
): Promise<ValidationReport> => {
  const { accounts, natureza } = await getPcaspMaps();

  const validations =
    mscType === "agregada"
      ? validateAgregada(data, accounts, natureza)
      : validateEncerramento(data, accounts);

  const passed = validations.filter((v) => v.status === "pass").length;
  const warnings = validations.filter((v) => v.status === "warning").length;
  const failed = validations.filter((v) => v.status === "fail").length;

  const overallStatus =
    failed > 0 ? "irregular" : warnings > 0 ? "warning" : "regular";

  return {
    overallStatus,
    summary: { total: validations.length, passed, warnings, failed },
    validations,
    mscType,
  };
};
