import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Pencil, Lock, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Usuario {
  id: string;
  nome: string;
  username: string;
  email: string;
  perfil: string;
  municipio_id: number;
  ativo: boolean;
  foto_url: string | null;
  telefone: string | null;
  municipio_nome?: string;
}

const PERFIS = ["Administrador", "Auxiliar", "Comercial", "Coordenador", "Juridico", "Suporte"];

const UsuariosListPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroPerfil, setFiltroPerfil] = useState<string>("todos");
  const [filtroMunicipio, setFiltroMunicipio] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busca, setBusca] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [{ data: users }, { data: munis }] = await Promise.all([
      supabase.from("usuarios").select("*").order("nome"),
      supabase.from("municipios").select("id, nome").order("nome"),
    ]);
    setMunicipios(munis || []);
    const usersWithMunicipio = (users || []).map((u: any) => ({
      ...u,
      municipio_nome: (munis || []).find((m: any) => m.id === u.municipio_id)?.nome || "",
    }));
    setUsuarios(usersWithMunicipio);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleAtivo = async (usuario: Usuario) => {
    const { error } = await supabase
      .from("usuarios")
      .update({ ativo: !usuario.ativo })
      .eq("id", usuario.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, ativo: !u.ativo } : u))
      );
    }
  };

  const filtered = usuarios.filter((u) => {
    if (filtroPerfil !== "todos" && u.perfil !== filtroPerfil) return false;
    if (filtroMunicipio !== "todos" && String(u.municipio_id) !== filtroMunicipio) return false;
    if (filtroStatus !== "todos" && String(u.ativo) !== filtroStatus) return false;
    if (busca && !u.nome.toLowerCase().includes(busca.toLowerCase()) && !u.username.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const getInitials = (nome: string) =>
    nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold text-brand-blue-dark">Usuários</h1>
        <Button
          onClick={() => navigate("/usuarios/novo")}
          className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou usuário..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroPerfil} onValueChange={setFiltroPerfil}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Perfil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os perfis</SelectItem>
            {PERFIS.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroMunicipio} onValueChange={setFiltroMunicipio}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Município" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os municípios</SelectItem>
            {municipios.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="true">Ativo</SelectItem>
            <SelectItem value="false">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Foto</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Município</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário cadastrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={u.foto_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(u.nome)}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell className="text-muted-foreground">@{u.username}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">{u.perfil}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.municipio_nome}</TableCell>
                  <TableCell>
                    <Badge
                      className={u.ativo
                        ? "bg-success/15 text-success border-success/30 hover:bg-success/20"
                        : "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20"
                      }
                      variant="outline"
                    >
                      {u.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/usuarios/${u.id}/editar`)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/usuarios/${u.id}/permissoes`)}
                        title="Permissões"
                      >
                        <Lock className="w-4 h-4" />
                      </Button>
                      <Switch
                        checked={u.ativo}
                        onCheckedChange={() => toggleAtivo(u)}
                        className="data-[state=checked]:bg-success data-[state=unchecked]:bg-destructive"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UsuariosListPage;
