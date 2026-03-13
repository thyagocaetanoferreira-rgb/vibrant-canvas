import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Permissao {
  modulo_id: number;
  modulo_nome: string;
  pode_ver: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
}

interface Usuario {
  id: string;
  nome: string;
  perfil: string;
  foto_url: string | null;
  municipio_id: number;
  municipio_nome?: string;
}

const UsuarioPermissoesPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = usuario?.perfil === "Administrador";

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      setLoading(true);
      const [{ data: user }, { data: modulos }, { data: perms }, { data: municipios }] = await Promise.all([
        supabase.from("usuarios").select("*").eq("id", id).single(),
        supabase.from("modulos").select("id, nome").order("ordem"),
        supabase.from("permissoes_usuario").select("*").eq("usuario_id", id),
        supabase.from("municipios").select("id, nome"),
      ]);

      if (user) {
        const muni = (municipios || []).find((m: any) => m.id === user.municipio_id);
        setUsuario({ ...user, municipio_nome: muni?.nome || "" });
      }

      if (modulos) {
        setPermissoes(
          modulos.map((m: any) => {
            const p = (perms || []).find((pp: any) => pp.modulo_id === m.id);
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
      setLoading(false);
    };
    fetch();
  }, [id]);

  const updatePermissao = (moduloId: number, field: keyof Permissao, value: boolean) => {
    if (isAdmin) return;
    setPermissoes((prev) =>
      prev.map((p) => {
        if (p.modulo_id !== moduloId) return p;
        const updated = { ...p, [field]: value };
        // If criar/editar/excluir is enabled, ver must be too
        if ((field === "pode_criar" || field === "pode_editar" || field === "pode_excluir") && value) {
          updated.pode_ver = true;
        }
        // If ver is disabled, disable all
        if (field === "pode_ver" && !value) {
          updated.pode_criar = false;
          updated.pode_editar = false;
          updated.pode_excluir = false;
        }
        return updated;
      })
    );
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);

    // Delete existing and re-insert
    await supabase.from("permissoes_usuario").delete().eq("usuario_id", id);

    const rows = permissoes.map((p) => ({
      usuario_id: id,
      modulo_id: p.modulo_id,
      pode_ver: p.pode_ver,
      pode_criar: p.pode_criar,
      pode_editar: p.pode_editar,
      pode_excluir: p.pode_excluir,
    }));

    const { error } = await supabase.from("permissoes_usuario").insert(rows);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Permissões salvas com sucesso!" });
    }
    setSaving(false);
  };

  const handleRestore = async () => {
    if (!id || !usuario) return;
    setSaving(true);
    await supabase.rpc("copiar_permissoes_perfil", {
      p_usuario_id: id,
      p_perfil: usuario.perfil as any,
    });
    // Reload
    const { data: perms } = await supabase.from("permissoes_usuario").select("*").eq("usuario_id", id);
    const { data: modulos } = await supabase.from("modulos").select("id, nome").order("ordem");
    if (modulos) {
      setPermissoes(
        modulos.map((m: any) => {
          const p = (perms || []).find((pp: any) => pp.modulo_id === m.id);
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
    toast({ title: "Permissões restauradas para o padrão do perfil!" });
    setSaving(false);
  };

  const getInitials = (n: string) =>
    n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando...</div>;
  }

  if (!usuario) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Usuário não encontrado</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/usuarios")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-heading font-bold text-brand-blue-dark">Permissões do Usuário</h1>
      </div>

      {/* Cabeçalho do usuário */}
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="w-14 h-14">
            <AvatarImage src={usuario.foto_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
              {getInitials(usuario.nome)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="font-heading font-semibold text-lg">{usuario.nome}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{usuario.perfil}</Badge>
              <span className="text-sm text-muted-foreground">{usuario.municipio_nome}</span>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isAdmin}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Restaurar permissões do perfil
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restaurar permissões?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso irá redefinir todas as permissões para o padrão do perfil "{usuario.perfil}". As customizações serão perdidas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleRestore}>Restaurar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {isAdmin && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm text-primary">
          O perfil Administrador tem acesso total. As permissões não podem ser alteradas.
        </div>
      )}

      {/* Tabela de permissões */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Módulo</TableHead>
                <TableHead className="text-center w-20">Ver</TableHead>
                <TableHead className="text-center w-20">Criar</TableHead>
                <TableHead className="text-center w-20">Editar</TableHead>
                <TableHead className="text-center w-20 bg-destructive/5">Excluir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissoes.map((p) => (
                <TableRow key={p.modulo_id}>
                  <TableCell className="font-medium">{p.modulo_nome}</TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={isAdmin ? true : p.pode_ver}
                      disabled={isAdmin}
                      onCheckedChange={(v) => updatePermissao(p.modulo_id, "pode_ver", !!v)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={isAdmin ? true : p.pode_criar}
                      disabled={isAdmin}
                      onCheckedChange={(v) => updatePermissao(p.modulo_id, "pode_criar", !!v)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={isAdmin ? true : p.pode_editar}
                      disabled={isAdmin}
                      onCheckedChange={(v) => updatePermissao(p.modulo_id, "pode_editar", !!v)}
                    />
                  </TableCell>
                  <TableCell className="text-center bg-destructive/5">
                    <Checkbox
                      checked={isAdmin ? true : p.pode_excluir}
                      disabled={isAdmin}
                      onCheckedChange={(v) => updatePermissao(p.modulo_id, "pode_excluir", !!v)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Botões */}
      <div className="flex gap-3 justify-end pb-6">
        <Button variant="outline" onClick={() => navigate("/usuarios")}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving || isAdmin} className="bg-primary hover:bg-primary/90">
          {saving ? "Salvando..." : "Salvar Permissões"}
        </Button>
      </div>
    </div>
  );
};

export default UsuarioPermissoesPage;
