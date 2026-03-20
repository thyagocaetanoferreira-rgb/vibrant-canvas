# Status de Homologação — Layouts TCM-GO v5.2

> **Metodologia:** Para cada arquivo, verificar registros na `stg_linha_bruta`, extrair layout oficial do XLSX em `C:/Users/Thyago/Downloads/Layout Balancete.xlsx`, dissecar linhas com `substring()`, corrigir parser em `tcmgoLayouts.ts`, reconstruir DDL e reparse. Detalhes em `stgbruta_stglayout.md`.

---

## Resumo

| # | Arquivo | Tipos homologados | Comprimento | Status | Obs |
|---|---------|-------------------|-------------|--------|-----|
| 1 | IDE | 10 | 28 chars | ✅ OK | Parser original correto |
| 2 | ORGAO | 10 | 413 chars | ✅ OK | Parser original correto |
| 3 | UOC | 10, 11, 12, 13, 14 | 390 chars | ✅ Corrigido | nro_seq, email, escolaridade, OAB, provimento corrigidos |
| 4 | REC | 10, 11, 12 | 160 chars | ✅ Corrigido | nro_sequencial de REC.11 (51→155) e REC.12 (57→155) corrigidos |
| 5 | ARE | 10, 11, 12, 99 | 289 chars | ✅ OK | |
| 6 | AOC | 10, 11, 12, 90-94, 99 | 86 chars | ✅ OK | |
| 7 | COB | 10 | 324 chars | ✅ OK | Parser original correto |
| 8 | EMP | 10, 11, 12, 13, 14, 99 | 979 chars | ✅ OK | |
| 9 | ANL | 10, 11, 99 | 349 chars | ✅ OK | |
| 10 | EOC | 10, 11, 12 | 77 chars | ✅ Corrigido | Parser completamente reescrito; header classificatório padrão; sem dados na remessa jan/2026 |
| 11 | LQD | 10, 11, 12 | 357 chars | ✅ Corrigido | Posições completamente reescritas |
| 12 | ALQ | 10, 11, 12 | 242 chars | ✅ Corrigido | ALQ.12 criada do zero |
| 13 | OPS | 10, 11, 12, 13, 14 | 443 chars | ✅ Corrigido | Posições completamente reescritas |
| 14 | AOP | 10, 11, 12, 13, 14 | 391 chars | ✅ Corrigido | AOP.12/13/14 criadas do zero; sem dados jan/2026 |
| 15 | EXT | 10, 11, 12 | 90 chars | ✅ Corrigido | Parser completamente reescrito; estrutura categoria/tipoLancamento/subTipo; nro_seq sempre em 85-90 |
| 16 | AEX | 10, 11, 12 | 78 chars | ✅ Corrigido | Parser completamente reescrito; sem dados na remessa jan/2026 |
| 17 | RSP | 10, 11, 12 | 157 chars | ✅ Corrigido | Estrutura única: sem header classificatório; dot_orig_p2002 exclusivo; tipos 13-17 removidos |
| 18 | CTB | 10, 11, 90, 91 | 96 chars | ✅ Corrigido | Parser completamente reescrito; CTB.90 criada do zero; CTB.91 estrutura de saldos (não aplicação) |
| 19 | TRB | 10, 11, 99 | 77 chars | ✅ Corrigido | Parser completamente reescrito; TRB.10 tem cod_fonte+vl_orig; TRB.11 acrescenta conta_destino+vl_dest |
| 20 | TFR | 10, 11, 99 | 59 chars | ✅ Corrigido | TFR.10 sem fonte_dest (vl em 35-47); TFR.11 com fonte_dest (vl em 41-53); sem dt_transferencia |
| 21 | DFR | 10, 99 | 213 chars | ✅ Corrigido | cod_det_fr(5-7,3c) + descricao(8-207,200c); sem cod_unidade |
| 22 | DIC | 10, 99 | 216 chars | ✅ Corrigido | Parser completamente reescrito; sem dados na remessa jan/2026 |
| 23 | DCL | 10 | 90 chars | ⚠️ Posições parciais | nro_seq(85-90) corrigido; campos internos pendentes de dados reais |
| 24 | PAR | 10 | 62 chars | ⚠️ Posições parciais | nro_seq(57-62); exercicio(5-8,4c); 3×val(16c); sem cod_unidade |
| 25 | CVC | 10, 20 | 262 chars | ⚠️ Posições parciais | nro_seq(257-262); codVeiculo(7-16,10c) não placa(7c) |
| 26 | ECL | 10, 20 | 76 chars | ⚠️ Posições parciais | nro_seq(71-76); campos extras pendentes |
| 27 | AAL | 10 | 287 chars | ⚠️ Posições parciais | nro_seq(282-287); sem cod_programa |
| 28 | PCT | 10, 11, 12, 13, 14, 99 | 185 chars | ✅ Corrigido | tipoUnidade(3-4) não cod_orgao; 7920 registros: 1×PCT.10, 8×PCT.11, 7910×PCT.12 |
| 29 | LNC | 10, 11, 99 | 1042 chars | ✅ Corrigido | tipoUnidade(3-4); historico(37-1036,1000c); nro_seq(1037-1042); 2176×LNC.10, 13176×LNC.11 |
| 30 | CON | 10, 11, 20, 21, 22, 23 | 939 chars | ⚠️ Posições parciais | nro_seq(934-939) todos tipos; campos internos ok até posição 698 |
| 31 | ISI | 10 | 638 chars | ✅ Corrigido | cpfCnpjProp(3-16); nomeRazao(18-67); logra(118-167); email(228-307); nro_seq(633-638); 1 registro |
| 32 | DMR | 10 | 35 chars | ⚠️ Posições parciais | nro_seq(30-35); sem cod_unidade; nro_decreto(5-14); dt_decreto(15-22) |
| 33 | ABL | 10, 11, 12, 13 | 1034 chars | ⚠️ Posições parciais | nro_seq(1029-1034) todos tipos |
| 34 | DSI | 10, 11, 12, 13, 14, 15 | 1046 chars | ⚠️ Posições parciais | nro_seq(1041-1046) todos tipos |
| 35 | RPL | 10 | 397 chars | ⚠️ Posições parciais | nro_seq(392-397) |
| 36 | HBL | 10, 20 | 929 chars | ⚠️ Posições parciais | nro_seq(924-929) todos tipos |
| 37 | JGL | 10, 30 | 329 chars | ⚠️ Posições parciais | nro_seq(324-329) todos tipos |
| 38 | HML | 10, 20, 30 | 329 chars | ⚠️ Posições parciais | nro_seq(324-329) todos tipos |
| 39 | ARP | 10, 12, 20 | 678 chars | ⚠️ Posições parciais | nro_seq(673-678) todos tipos |

---

## Contadores

- **Total de arquivos:** 39
- **✅ Homologados (25/39):** IDE, ORGAO, UOC, REC, ARE, AOC, COB, EMP, ANL, EOC, LQD, ALQ, OPS, AOP, EXT, AEX, RSP, CTB, TRB, TFR, DFR, DIC, PCT, LNC, ISI
- **⚠️ Posições parciais (14/39, sem dados jan/2026):** DCL, PAR, CVC, ECL, AAL, CON, DMR, ABL, DSI, RPL, HBL, JGL, HML, ARP — nro_seq correto, campos internos a verificar quando dados chegarem
- **⏳ Pendentes:** 0

---

## Ordem sugerida de homologação

Prioridade por volume de dados na remessa jan/2026 e criticidade para ETL:

1. ~~IDE~~ ✅
2. ~~UOC~~ ✅
3. ~~ARE~~ ✅
4. ~~AOC~~ ✅
5. ~~EMP~~ ✅
6. ~~ANL~~ ✅
7. ~~LQD~~ ✅
8. ~~ALQ~~ ✅
9. ~~OPS~~ ✅
10. ~~AOP~~ ✅
11. ~~RSP~~ ✅
12. ~~ORGAO~~ ✅
13. ~~REC~~ ✅
14. ~~COB~~ ✅
15. ~~EOC~~ ✅
16. ~~EXT~~ ✅
17. ~~AEX~~ ✅
18. ~~CTB~~ ✅
19. ~~TRB~~ ✅
20. ~~TFR~~ ✅
21. ~~DFR~~ ✅
22. ~~DIC~~ ✅
23. ~~PCT~~ ✅
24. ~~LNC~~ ✅
25. ~~ISI~~ ✅
26. ~~DCL~~ ⚠️ (nro_seq corrigido, sem dados)
27. ~~PAR~~ ⚠️
28. ~~CVC~~ ⚠️
29. ~~ECL~~ ⚠️
30. ~~AAL~~ ⚠️
31. ~~CON~~ ⚠️
32. ~~DMR~~ ⚠️
33. ~~ABL~~ ⚠️
34. ~~DSI~~ ⚠️
35. ~~RPL~~ ⚠️
36. ~~HBL~~ ⚠️
37. ~~JGL~~ ⚠️
38. ~~HML~~ ⚠️
39. ~~ARP~~ ⚠️
