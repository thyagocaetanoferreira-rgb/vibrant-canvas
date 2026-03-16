import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MapPin, Check, Eye, EyeOff, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Municipio {
  id: number;
  nome: string;
  codigo_uf: number;
  codigo_ibge: number;
}

const UF_MAP: Record<number, string> = {
  11:"RO",12:"AC",13:"AM",14:"RR",15:"PA",16:"AP",17:"TO",21:"MA",22:"PI",
  23:"CE",24:"RN",25:"PB",26:"PE",27:"AL",28:"SE",29:"BA",31:"MG",32:"ES",
  33:"RJ",35:"SP",41:"PR",42:"SC",43:"RS",50:"MS",51:"MT",52:"GO",53:"DF",
};

const SERVICOS = ["Contábil", "Jurídico", "Auditoria", "Compliance"] as const;

const ClienteFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;

  const [municipioId, setMunicipioId] = useState<number | null>(null);
  const [selectedMunicipio, setSelectedMunicipio] = useState<Municipio | null>(null);
  const [tiposServico, setTiposServico] = useState<string[]>([]);
  const [status, setStatus] = useState(true);
  const [linkSistema, setLinkSistema] = useState("");
  const [loginSistema, setLoginSistema] = useState("");
  const [senhaSistema, setSenhaSistema] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [municipioTcmgoId, setMunicipioTcmgoId] = useState<number | null>(null);
  const [tcmgoMunicipios, setTcmgoMunicipios] = useState<{ id: number; descricao: string }[]>([]);
  const [tcmgoBusca, setTcmgoBusca] = useState("");
  const [tcmgoPopoverAberto, setTcmgoPopoverAberto] = useState(false);
  const [tcmgoSelecionadoNome, setTcmgoSelecionadoNome] = useState("");

  const [munSearch, setMunSearch] = useState("");
  const [munResults, setMunResults] = useState<Municipio[]>([]);
  const [munSearching, setMunSearching] = useState(false);
  const [existingClienteMunIds, setExistingClienteMunIds] = useState<Set<number>>(new Set());

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get<{ municipio_id: number }[]>("/clientes").then((data) => {
      setExistingClienteMunIds(new Set(data.map((c) => c.municipio_id)));
    });

    api.get<{ id: number; descricao: string }[]>("/tcmgo/municipios").then(setTcmgoMunicipios).catch(() => {});

    if (isEdit) loadCliente();
  }, [id]);

  const loadCliente = async () => {
    setLoading(true);
    try {
      const data = await api.get<any>(`/clientes/${id}`);
      setMunicipioId(data.municipio_id);
      setTiposServico(data.tipos_servico || []);
      setStatus(data.status ?? true);
      setLinkSistema(data.link_sistema || "");
      setLoginSistema(data.login_sistema || "");
      setMunicipioTcmgoId(data.municipio_tcmgo_id ?? null);

      if (data.municipio_id) {
        const muns = await api.get<Municipio[]>(`/municipios?ids=${data.municipio_id}`);
        if (muns[0]) setSelectedMunicipio(muns[0]);
      }

      if (data.municipio_tcmgo_id) {
        const muns = await api.get<{ id: number; descricao: string }[]>("/tcmgo/municipios");
        const found = muns.find((m) => m.id === data.municipio_tcmgo_id);
        if (found) setTcmgoSelecionadoNome(found.descricao);
      }
    } catch {
      toast({ title: "Erro", description: "Cliente não encontrado", variant: "destructive" });
      navigate("/clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (munSearch.length < 2) { setMunResults([]); return; }
    const timer = setTimeout(async () => {
      setMunSearching(true);
      const data = await api.get<Municipio[]>(`/municipios?search=${encodeURIComponent(munSearch)}`);
      setMunResults(data);
      setMunSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [munSearch]);

  const toggleServico = (s: string) => {
    setTiposServico((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
    setErrors((e) => ({ ...e, servicos: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!municipioId) newErrors.municipio = "Selecione um município";
    if (tiposServico.length === 0) newErrors.servicos = "Selecione pelo menos um serviço";
    if (linkSistema && !/^https?:\/\/.+/.test(linkSistema)) {
      newErrors.link = "URL inválida (deve começar com http:// ou https://)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      const payload = {
        tipos_servico: tiposServico,
        status,
        link_sistema: linkSistema || null,
        login_sistema: loginSistema || null,
        municipio_tcmgo_id: municipioTcmgoId,
      };

      if (isEdit) {
        await api.put(`/clientes/${id}`, payload);
        if (senhaSistema) {
          await api.post(`/clientes/${id}/senha`, { action: "encrypt", senha: senhaSistema });
        }
        toast({ title: "Cliente atualizado com sucesso!" });
      } else {
        const newCliente = await api.post<{ id: string }>("/clientes", {
          ...payload,
          municipio_id: municipioId,
        });
        if (senhaSistema && newCliente.id) {
          await api.post(`/clientes/${newCliente.id}/senha`, { action: "encrypt", senha: senhaSistema });
        }
        toast({ title: "Cliente cadastrado com sucesso!" });
      }

      navigate("/clientes");
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
        description: err.message?.includes("unique")
          ? "Este município já está cadastrado como cliente"
          : err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-primary">
          {isEdit ? "Editar Cliente" : "Novo Cliente"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEdit ? "Atualize os dados do cliente" : "Cadastre um novo município como cliente"}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Município */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Município *</Label>
            {selectedMunicipio ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium">
                  {selectedMunicipio.nome} ({UF_MAP[selectedMunicipio.codigo_uf] || "?"})
                </span>
                <span className="text-muted-foreground text-sm">| IBGE: {selectedMunicipio.codigo_ibge}</span>
                {!isEdit && (
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setSelectedMunicipio(null); setMunicipioId(null); }}>
                    Alterar
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <Input
                  placeholder="🔍 Digite para buscar o município..."
                  value={munSearch}
                  onChange={(e) => setMunSearch(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Selecione o município da tabela oficial (IBGE)</p>
                {munSearching && <p className="text-xs text-muted-foreground">Buscando...</p>}
                {munResults.length > 0 && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto bg-popover">
                    {munResults.map((m) => {
                      const isExisting = existingClienteMunIds.has(m.id) && (!isEdit || m.id !== municipioId);
                      return (
                        <button
                          key={m.id}
                          disabled={isExisting}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                          onClick={() => {
                            setSelectedMunicipio(m);
                            setMunicipioId(m.id);
                            setMunSearch("");
                            setMunResults([]);
                            setErrors((e) => ({ ...e, municipio: "" }));
                          }}
                        >
                          <span>{m.nome} — {UF_MAP[m.codigo_uf] || "?"}</span>
                          {isExisting && <span className="text-xs text-destructive">Já é cliente</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {errors.municipio && <p className="text-sm text-destructive">{errors.municipio}</p>}
          </div>

          {/* Município TCM-GO */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              Município TCM-GO
              <span className="text-muted-foreground text-xs font-normal ml-1">(para integração com o Tribunal de Contas)</span>
            </Label>
            <Popover open={tcmgoPopoverAberto} onOpenChange={setTcmgoPopoverAberto}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal" type="button">
                  {municipioTcmgoId ? tcmgoSelecionadoNome || `ID: ${municipioTcmgoId}` : "Selecione o município TCM-GO (opcional)"}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <div className="p-2 border-b border-border">
                  <Input placeholder="Buscar município TCM-GO..." value={tcmgoBusca} onChange={(e) => setTcmgoBusca(e.target.value)} className="h-8" autoFocus />
                </div>
                <ScrollArea className="h-[200px]">
                  {municipioTcmgoId && (
                    <button
                      onClick={() => { setMunicipioTcmgoId(null); setTcmgoSelecionadoNome(""); setTcmgoPopoverAberto(false); setTcmgoBusca(""); }}
                      className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                    >
                      ✕ Remover vínculo
                    </button>
                  )}
                  {(tcmgoBusca.trim()
                    ? tcmgoMunicipios.filter((m) => m.descricao.toLowerCase().includes(tcmgoBusca.toLowerCase()))
                    : tcmgoMunicipios
                  ).slice(0, 100).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setMunicipioTcmgoId(m.id); setTcmgoSelecionadoNome(m.descricao); setTcmgoPopoverAberto(false); setTcmgoBusca(""); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${municipioTcmgoId === m.id ? "bg-primary/10 text-primary font-medium" : ""}`}
                    >
                      {m.descricao}
                    </button>
                  ))}
                </ScrollArea>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">Vincule ao município do TCM-GO para habilitar a verificação de balancetes</p>
          </div>

          <Separator />

          {/* Tipos de Serviço */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Tipos de Serviço * <span className="text-muted-foreground text-xs font-normal">(selecione um ou mais)</span></Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SERVICOS.map((s) => {
                const selected = tiposServico.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleServico(s)}
                    className={`relative flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${selected ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30"}`}
                  >
                    {selected && <Check className="w-4 h-4" />}
                    {s}
                  </button>
                );
              })}
            </div>
            {errors.servicos && <p className="text-sm text-destructive">{errors.servicos}</p>}
          </div>

          <Separator />

          {/* Acesso ao Sistema ERP */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Acesso ao Sistema ERP Municipal</Label>
              <p className="text-xs text-muted-foreground">Credenciais de acesso ao sistema do município cliente</p>
            </div>
            <div className="space-y-2">
              <Label>Link do Sistema</Label>
              <Input placeholder="https://..." value={linkSistema} onChange={(e) => { setLinkSistema(e.target.value); setErrors((err) => ({ ...err, link: "" })); }} />
              {errors.link ? <p className="text-sm text-destructive">{errors.link}</p> : <p className="text-xs text-muted-foreground">URL de acesso ao sistema ERP do município</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Login do Sistema</Label>
                <Input value={loginSistema} onChange={(e) => setLoginSistema(e.target.value)} placeholder="Usuário de acesso" />
              </div>
              <div className="space-y-2">
                <Label>Senha do Sistema</Label>
                <div className="relative">
                  <Input
                    type={showSenha ? "text" : "password"}
                    value={senhaSistema}
                    onChange={(e) => setSenhaSistema(e.target.value)}
                    placeholder={isEdit ? "Deixe vazio para manter a atual" : "Senha de acesso"}
                  />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowSenha(!showSenha)}>
                    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">⚠️ Credenciais armazenadas de forma criptografada</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-base font-semibold">Configurações</Label>
            <div className="flex items-center gap-3">
              <Switch checked={status} onCheckedChange={setStatus} />
              <span className="text-sm">{status ? "Ativo" : "Inativo"}</span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate("/clientes")}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar Cliente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClienteFormPage;
