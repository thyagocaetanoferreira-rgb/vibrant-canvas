import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

// Column mapping: Excel header → DB field
const COLUMN_MAP: Record<string, string> = {
  "município": "municipio",
  "ibge": "ibge",
  "mês de referência": "mes_ref",
  "receita prevista ano (receira orçamentaria)": "receita_prevista_ano",
  "receita realizada": "receita_realizada",
  "despesa fixada": "despesa_fixada",
  "despesa empenhada (fonte 1)": "despesa_empenhada_f1",
  "despesa empenhada (fonte 2)": "despesa_empenhada_f2",
  "despesa liquidada": "despesa_liquidada",
  "despesa paga": "despesa_paga",
  "caixa": "caixa",
  "despesa não processada": "despesa_nao_processada",
  "despesa processada": "despesa_processada",
  "consignações/ tesouraria": "consignacoes_tesouraria",
  "resto não processado": "resto_nao_processado",
  "resto processado": "resto_processado",
  "percentual de suplementação para anulação de dotação (%)": "supl_anulacao_perc",
  "suplementação autorizada para anulação (r$)": "supl_anulacao_autorizada",
  "crédito utilizado: anulação de dotação (r$) - mensal": "supl_anulacao_utilizado",
  "percentual de suplementação para superávit financeiro (%)": "supl_superavit_perc",
  "superávit apurado exercício anterior (r$)": "superavit_exerc_anterior",
  "suplementação autorizada para superavit financeiro (r$)": "supl_superavit_autorizada",
  "crédito utilizado: superávit financeiro (r$)": "supl_superavit_utilizado",
  "percentual de suplementação para excesso de arrecadação (%)": "supl_excesso_perc",
  "valor de excesso projetado (r$)": "excesso_projetado",
  "crédito utilizado: excesso de arrecadação (r$)": "supl_excesso_utilizado",
  "aplicação em educação (r$)": "aplicacao_educacao",
  "aplicação saúde (r$)": "aplicacao_saude",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function ImportarLancamentosPage() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setProgress(0);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json(ws, { defval: "" });

      // Map headers
      const mapped = jsonRows.map((raw: any) => {
        const row: Record<string, any> = {};
        for (const [excelKey, value] of Object.entries(raw)) {
          const normalized = normalizeHeader(excelKey);
          const dbField = COLUMN_MAP[normalized];
          if (dbField) {
            row[dbField] = value;
          }
        }
        return row;
      }).filter((r) => r.municipio && r.mes_ref);

      setRows(mapped);
      toast.success(`${mapped.length} linhas lidas da planilha.`);
    };
    reader.readAsArrayBuffer(f);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    setResult(null);
    setProgress(0);

    const BATCH_SIZE = 200;
    let totalInserted = 0;
    let totalSkipped = 0;
    const allErrors: string[] = [];
    const allSkippedMunicipios = new Set<string>();

    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      try {
        const data = await api.post<any>("/lancamentos/importar", { rows: batch });
        totalInserted += data.total || 0;
        totalSkipped += data.ignorados || 0;
        if (data.municipios_sem_cliente) {
          data.municipios_sem_cliente.forEach((m: string) => allSkippedMunicipios.add(m));
        }
        if (data.erros?.length) {
          allErrors.push(...data.erros.map((e: string) => `Lote ${batchNum}: ${e}`));
        }
      } catch (err: any) { allErrors.push(`Lote ${batchNum}: ${err.message}`); }

      setProgress(Math.round((batchNum / totalBatches) * 100));
    }

    setResult({
      total: totalInserted,
      ignorados: totalSkipped,
      municipios_sem_cliente: Array.from(allSkippedMunicipios),
      erros: allErrors,
    });

    if (allErrors.length === 0) {
      toast.success(`✅ Importação concluída: ${totalInserted} registros importados.`);
    } else {
      toast.warning(`Importação parcial: ${totalInserted} importados, ${allErrors.length} erros.`);
    }

    setImporting(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          Importar Lançamentos Mensais
        </h1>
        <p className="text-muted-foreground mt-1">
          Importe dados de uma planilha Excel para a base de lançamentos mensais.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Upload da Planilha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {file ? file.name : "Clique para selecionar o arquivo .xlsx"}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {rows.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <p className="font-medium text-foreground">
                📊 {rows.length} linhas prontas para importação
              </p>
              <p className="text-muted-foreground text-xs">
                Municípios detectados:{" "}
                {[...new Set(rows.map((r) => r.municipio))].slice(0, 10).join(", ")}
                {[...new Set(rows.map((r) => r.municipio))].length > 10 && "..."}
              </p>
            </div>
          )}

          {importing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{progress}% concluído</p>
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={rows.length === 0 || importing}
            className="w-full"
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-2 w-4 h-4" />
                Importar {rows.length > 0 ? `${rows.length} registros` : ""}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {result.erros.length === 0 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              )}
              Resultado da Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                <p className="text-green-700 dark:text-green-400 font-medium text-lg">{result.total}</p>
                <p className="text-green-600 dark:text-green-500 text-xs">Registros importados</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground font-medium text-lg">{result.ignorados}</p>
                <p className="text-muted-foreground text-xs">Linhas ignoradas</p>
              </div>
            </div>

            {result.municipios_sem_cliente.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3">
                <p className="font-medium text-yellow-700 dark:text-yellow-400 text-xs mb-1">
                  Municípios sem cliente cadastrado:
                </p>
                <p className="text-yellow-600 dark:text-yellow-500 text-xs">
                  {result.municipios_sem_cliente.join(", ")}
                </p>
              </div>
            )}

            {result.erros.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
                <p className="font-medium text-red-700 dark:text-red-400 text-xs mb-1">Erros:</p>
                {result.erros.slice(0, 10).map((e: string, i: number) => (
                  <p key={i} className="text-red-600 dark:text-red-500 text-xs">{e}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
