import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Eye, EyeOff, Check, X, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MunicipioMultiSelect from "@/components/MunicipioMultiSelect";

const PERFIS_MULTI_MUNICIPIO = ["Administrador", "Comercial", "Juridico", "Suporte"];

const PERFIS = [
  { value: "Administrador", label: "Administrador", desc: "Acesso total ao sistema" },
  { value: "Auxiliar", label: "Auxiliar", desc: "Acesso operacional básico" },
  { value: "Comercial", label: "Comercial", desc: "Foco em visitas e relatórios" },
  { value: "Coordenador", label: "Coordenador", desc: "Acesso amplo de coordenação" },
  { value: "Juridico", label: "Jurídico", desc: "Foco em processos e diligências" },
  { value: "Suporte", label: "Suporte", desc: "Foco em demandas e atendimento" },
];

interface PermissaoPerfil {
  modulo_id: number;
  modulo_nome: string;
  pode_ver: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
}

const UsuarioFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;

  const [nome, setNome] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaConfirm, setSenhaConfirm] = useState("");
  const [telefone, setTelefone] = useState("");
  const [perfil, setPerfil] = useState("");
  const [municipioId, setMunicipioId] = useState("");
  const [municipioIds, setMunicipioIds] = useState<number[]>([]);
  const [ativo, setAtivo] = useState(true);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [showSenha, setShowSenha] = useState(false);
  const [showSenhaConfirm, setShowSenhaConfirm] = useState(false);
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([]);
  const [permissoesPerfil, setPermissoesPerfil] = useState<PermissaoPerfil[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [perfilOriginal, setPerfilOriginal] = useState("");
  const [showPerfilChangeAlert, setShowPerfilChangeAlert] = useState(false);
  const [pendingPerfil, setPendingPerfil] = useState("");

  useEffect(() => {
    const fetchMunicipios = async () => {
      const { data } = await supabase.from("municipios").select("id, nome").order("nome");
      setMunicipios(data || []);
    };
    fetchMunicipios();
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      const fetchUsuario = async () => {
        const { data } = await supabase.from("usuarios").select("*").eq("id", id).single();
        if (data) {
          setNome(data.nome);
          setUsername(data.username);
          setEmail(data.email);
          setTelefone(data.telefone || "");
          setPerfil(data.perfil);
          setPerfilOriginal(data.perfil);
          setMunicipioId(String(data.municipio_id));
          setAtivo(data.ativo);
          setFotoUrl(data.foto_url);

          // Load additional municipalities
          const { data: extraMunicipios } = await supabase
            .from("usuario_municipios")
            .select("municipio_id")
            .eq("usuario_id", id);
          if (extraMunicipios && extraMunicipios.length > 0) {
            setMunicipioIds(extraMunicipios.map((m: any) => m.municipio_id));
          } else {
            setMunicipioIds(data.municipio_id ? [data.municipio_id] : []);
          }
        }
      };
      fetchUsuario();
    }
  }, [id, isEdit]);

  useEffect(() => {
    if (!perfil) {
      setPermissoesPerfil([]);
      return;
    }
    const fetchPermissoes = async () => {
      const { data: modulos } = await supabase.from("modulos").select("id, nome").order("ordem");
      const { data: perms } = await supabase
        .from("permissoes_perfil")
        .select("*")
        .eq("perfil", perfil as "Administrador" | "Auxiliar" | "Comercial" | "Coordenador" | "Juridico" | "Suporte");
      if (modulos && perms) {
        setPermissoesPerfil(
          modulos.map((m: any) => {
            const p = perms.find((pp: any) => pp.modulo_id === m.id);
            return {
              modulo_id: m.id,
              modulo_nome: m.nome,
              pode_ver: p?.pode_ver || false,
              pode_criar: p?.pode_criar || false,
              pode_editar: p?.pode_editar || false,
              pode_excluir: p?.pode_excluir || false,
            };
          })
        );
      }
    };
    fetchPermissoes();
  }, [perfil]);

  const handlePerfilChange = (newPerfil: string) => {
    if (isEdit && perfilOriginal && newPerfil !== perfilOriginal) {
      setPendingPerfil(newPerfil);
      setShowPerfilChangeAlert(true);
    } else {
      setPerfil(newPerfil);
    }
  };

  const confirmPerfilChange = () => {
    setPerfil(pendingPerfil);
    setShowPerfilChangeAlert(false);
  };

  const formatTelefone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const isMultiMunicipio = PERFIS_MULTI_MUNICIPIO.includes(perfil);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!nome.trim()) errs.nome = "Nome é obrigatório";
    if (!username.trim()) errs.username = "Usuário é obrigatório";
    else if (!/^[a-zA-Z0-9_]+$/.test(username)) errs.username = "Somente letras, números e underscore";
    if (!email.trim()) errs.email = "E-mail é obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "E-mail inválido";
    if (!isEdit && !senha) errs.senha = "Senha é obrigatória";
    if (senha && senha.length < 8) errs.senha = "Mínimo 8 caracteres";
    if (senha && !/[A-Z]/.test(senha)) errs.senha = "Deve ter ao menos 1 letra maiúscula";
    if (senha && !/[0-9]/.test(senha)) errs.senha = "Deve ter ao menos 1 número";
    if (senha && senha !== senhaConfirm) errs.senhaConfirm = "Senhas não conferem";
    if (!perfil) errs.perfil = "Perfil é obrigatório";
    if (isMultiMunicipio) {
      if (municipioIds.length === 0) errs.municipioId = "Selecione ao menos um município";
    } else {
      if (!municipioId) errs.municipioId = "Município é obrigatório";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);

    let uploadedFotoUrl = fotoUrl;
    if (fotoFile) {
      const ext = fotoFile.name.split(".").pop();
      const path = `usuarios/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("imports").upload(path, fotoFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("imports").getPublicUrl(path);
        uploadedFotoUrl = urlData.publicUrl;
      }
    }

    const primaryMunicipioId = isMultiMunicipio ? (municipioIds[0] || 0) : parseInt(municipioId);

    const userData = {
      nome,
      username,
      email,
      telefone: telefone || null,
      perfil: perfil as any,
      municipio_id: primaryMunicipioId,
      ativo,
      foto_url: uploadedFotoUrl,
    };

    const saveMultiMunicipios = async (userId: string) => {
      // Delete old entries
      await supabase.from("usuario_municipios").delete().eq("usuario_id", userId);
      // Insert new if multi-municipio profile
      if (isMultiMunicipio && municipioIds.length > 0) {
        await supabase.from("usuario_municipios").insert(
          municipioIds.map((mid) => ({ usuario_id: userId, municipio_id: mid }))
        );
      }
    };

    if (isEdit && id) {
      const { error } = await supabase.from("usuarios").update(userData).eq("id", id);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      await saveMultiMunicipios(id);
      if (perfil !== perfilOriginal) {
        await supabase.rpc("copiar_permissoes_perfil", {
          p_usuario_id: id,
          p_perfil: perfil as any,
        });
      }
      toast({ title: "Usuário atualizado com sucesso!" });
    } else {
      const { data: newUser, error } = await supabase.from("usuarios").insert(userData).select().single();
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      await saveMultiMunicipios(newUser.id);
      await supabase.rpc("copiar_permissoes_perfil", {
        p_usuario_id: newUser.id,
        p_perfil: perfil as any,
      });
      toast({ title: "Usuário criado com sucesso!" });
    }

    setSaving(false);
    navigate("/usuarios");
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 2MB", variant: "destructive" });
      return;
    }
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast({ title: "Formato inválido", description: "Apenas PNG e JPG", variant: "destructive" });
      return;
    }
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const getInitials = (n: string) =>
    n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/usuarios")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-heading font-bold text-brand-blue-dark">
          {isEdit ? "Editar Usuário" : "Novo Usuário"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados Principais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
              {errors.nome && <p className="text-sm text-destructive">{errors.nome}</p>}
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Usuário *</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))} placeholder="nome_usuario" />
              {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@email.com" />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                placeholder="(99) 99999-9999"
              />
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="senha">Senha {!isEdit && "*"}</Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={showSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder={isEdit ? "Deixe vazio para manter" : "Mínimo 8 caracteres"}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSenha(!showSenha)}
                >
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.senha && <p className="text-sm text-destructive">{errors.senha}</p>}
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <Label htmlFor="senhaConfirm">Confirme a Senha {!isEdit && "*"}</Label>
              <div className="relative">
                <Input
                  id="senhaConfirm"
                  type={showSenhaConfirm ? "text" : "password"}
                  value={senhaConfirm}
                  onChange={(e) => setSenhaConfirm(e.target.value)}
                  placeholder="Repita a senha"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSenhaConfirm(!showSenhaConfirm)}
                >
                  {showSenhaConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.senhaConfirm && <p className="text-sm text-destructive">{errors.senhaConfirm}</p>}
            </div>
          </div>

          {/* Foto */}
          <div className="space-y-2">
            <Label>Foto</Label>
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={fotoPreview || fotoUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {nome ? getInitials(nome) : "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <Input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleFotoChange}
                  className="w-auto"
                />
                <p className="text-xs text-muted-foreground mt-1">PNG ou JPG, até 2MB</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Perfil *</CardTitle>
          {errors.perfil && <p className="text-sm text-destructive">{errors.perfil}</p>}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PERFIS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => handlePerfilChange(p.value)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  perfil === p.value
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <p className="font-semibold text-sm">{p.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
              </button>
            ))}
          </div>

          {/* Preview de permissões do perfil */}
          {permissoesPerfil.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Permissões padrão do perfil "{PERFIS.find((p) => p.value === perfil)?.label}":
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {permissoesPerfil.map((p) => (
                  <div key={p.modulo_id} className="flex items-center gap-2 py-1.5 px-3 rounded text-sm">
                    <span className="text-muted-foreground flex-1">{p.modulo_nome}</span>
                    <span title="Ver">{p.pode_ver ? <Check className="w-3.5 h-3.5 text-success" /> : <X className="w-3.5 h-3.5 text-destructive/40" />}</span>
                    <span title="Criar">{p.pode_criar ? <Check className="w-3.5 h-3.5 text-success" /> : <X className="w-3.5 h-3.5 text-destructive/40" />}</span>
                    <span title="Editar">{p.pode_editar ? <Check className="w-3.5 h-3.5 text-success" /> : <X className="w-3.5 h-3.5 text-destructive/40" />}</span>
                    <span title="Excluir">{p.pode_excluir ? <Check className="w-3.5 h-3.5 text-success" /> : <X className="w-3.5 h-3.5 text-destructive/40" />}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Município */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Município *</CardTitle>
          <p className="text-sm text-muted-foreground">
            Município vinculado — este usuário só verá dados deste município
          </p>
        </CardHeader>
        <CardContent>
          <Select value={municipioId} onValueChange={setMunicipioId}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Selecione o município" />
            </SelectTrigger>
            <SelectContent>
              {municipios.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.municipioId && <p className="text-sm text-destructive mt-2">{errors.municipioId}</p>}
        </CardContent>
      </Card>

      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              checked={ativo}
              onCheckedChange={setAtivo}
              className="data-[state=checked]:bg-success data-[state=unchecked]:bg-destructive"
            />
            <Label>{ativo ? "Ativo" : "Inativo"}</Label>
          </div>
        </CardContent>
      </Card>

      {/* Botões */}
      <div className="flex gap-3 justify-end pb-6">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">Cancelar</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
              <AlertDialogDescription>Todas as alterações não salvas serão perdidas.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continuar editando</AlertDialogCancel>
              <AlertDialogAction onClick={() => navigate("/usuarios")}>Descartar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button onClick={handleSubmit} disabled={saving} className="bg-primary hover:bg-primary/90">
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* Alert de troca de perfil */}
      <AlertDialog open={showPerfilChangeAlert} onOpenChange={setShowPerfilChangeAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trocar perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              Trocar o perfil irá redefinir as permissões deste usuário para o padrão do novo perfil. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPerfilChange}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsuarioFormPage;
