const D3_00017_LABELS: Record<string, { nome: string; descricao: string }> = {
  // An06
  "RREO6TotalDespesaPrimaria|PAGOS (c)":
    { nome: "Total da Despesa Primária — Pagos (c)", descricao: "Soma dos RP Não Processados pagos no exercício (An06)" },
  "RREO6TotalDespesaPrimaria|RESTOS A PAGAR PROCESSADOS PAGOS (b)":
    { nome: "Total da Despesa Primária — RP Processados Pagos (b)", descricao: "Soma dos RP Processados pagos no exercício (An06)" },
  "RREO6JurosEEncargosDaDivida|PAGOS (c)":
    { nome: "Juros e Encargos da Dívida — Pagos (c)", descricao: "RP Não Processados de juros/encargos pagos no exercício (An06)" },
  "RREO6JurosEEncargosDaDivida|RESTOS A PAGAR PROCESSADOS PAGOS (b)":
    { nome: "Juros e Encargos da Dívida — RP Processados Pagos (b)", descricao: "RP Processados de juros/encargos pagos no exercício (An06)" },
  // An07
  "RestosAPagarProcessadosENaoProcessadosLiquidadosPagos|Pagos (c)":
    { nome: "RP Processados e Não Processados Liquidados — Pagos (c)", descricao: "Total de RP processados e não-processados liquidados e pagos (An07)" },
  "RestosAPagarNaoProcessadosPagos|Pagos (i)":
    { nome: "RP Não Processados — Pagos (i)", descricao: "Total de RP não-processados pagos no exercício (An07)" },
};

export default function DetalhesD3_00017({ detalhes }: { detalhes: any[] }) {
  if (!detalhes.length) return <p className="text-xs text-[#045ba3]/70 p-3">Sem detalhes disponíveis.</p>;
  const fmt = (v: number | null) =>
    v === null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-3 p-1">
      {detalhes.map((d: any, i: number) => (
        <div key={i} className={`rounded-lg border ${d.ok ? "border-[#c7dff0]" : "border-[#fca5a5]"}`}>
          {/* Cabeçalho do período */}
          <div className={`flex items-center justify-between px-4 py-2 rounded-t-lg ${d.ok ? "bg-[#e3eef6]/60" : "bg-[#fef2f2]"}`}>
            <span className="text-sm font-semibold text-[#033e66]">{d.label}</span>
            <div className="flex items-center gap-4">
              <span className={`text-xs font-mono font-semibold ${Math.abs(d.diferenca ?? 0) <= 1.00 ? "text-[#059669]" : "text-[#ef4444]"}`}>
                Diferença: {fmt(d.diferenca)}
              </span>
              {d.ok
                ? <span className="text-[#059669] font-bold text-xs bg-[#d1fae5] px-2 py-0.5 rounded">✓ Consistente</span>
                : <span className="text-[#ef4444] font-bold text-xs bg-[#fee2e2] px-2 py-0.5 rounded">✗ Divergente</span>}
            </div>
          </div>

          {/* Grade de componentes lado a lado */}
          <div className="grid grid-cols-2 divide-x divide-[#c7dff0]">
            {/* Coluna Anexo 06 */}
            <div className="p-3">
              <p className="text-[10px] font-bold text-[#033e66] uppercase tracking-wide mb-2">
                RREO-Anexo 06 — Total: <span className="font-mono">{fmt(d.total_anexo_06)}</span>
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#6b7280]">
                    <th className="text-left font-medium pb-1">Conta / Coluna</th>
                    <th className="text-right font-medium pb-1">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3eef6]">
                  {(d.componentes_06 ?? []).map((c: any, j: number) => {
                    const key = `${c.cod_conta}|${c.coluna}`;
                    const meta = D3_00017_LABELS[key];
                    return (
                      <tr key={j} className="hover:bg-[#f0f7ff]">
                        <td className="py-1.5 pr-2">
                          <p className="font-semibold text-[#033e66]">{meta?.nome ?? c.cod_conta}</p>
                          <p className="text-[10px] text-[#6b7280] mt-0.5">{c.cod_conta} | {c.coluna}</p>
                          {meta?.descricao && <p className="text-[10px] text-[#6b7280] italic">{meta.descricao}</p>}
                        </td>
                        <td className={`py-1.5 text-right font-mono whitespace-nowrap ${c.valor === 0 ? "text-[#9ca3af]" : "text-[#045ba3] font-semibold"}`}>
                          {fmt(c.valor)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Coluna Anexo 07 */}
            <div className="p-3">
              <p className="text-[10px] font-bold text-[#033e66] uppercase tracking-wide mb-2">
                RREO-Anexo 07 — Total: <span className="font-mono">{fmt(d.total_anexo_07)}</span>
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#6b7280]">
                    <th className="text-left font-medium pb-1">Conta / Coluna</th>
                    <th className="text-right font-medium pb-1">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3eef6]">
                  {(d.componentes_07 ?? []).map((c: any, j: number) => {
                    const key = `${c.cod_conta}|${c.coluna}`;
                    const meta = D3_00017_LABELS[key];
                    return (
                      <tr key={j} className="hover:bg-[#f0f7ff]">
                        <td className="py-1.5 pr-2">
                          <p className="font-semibold text-[#033e66]">{meta?.nome ?? c.cod_conta}</p>
                          <p className="text-[10px] text-[#6b7280] mt-0.5">{c.cod_conta} | {c.coluna}</p>
                          {meta?.descricao && <p className="text-[10px] text-[#6b7280] italic">{meta.descricao}</p>}
                        </td>
                        <td className={`py-1.5 text-right font-mono whitespace-nowrap ${c.valor === 0 ? "text-[#9ca3af]" : "text-[#045ba3] font-semibold"}`}>
                          {fmt(c.valor)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
