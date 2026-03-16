import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, ExternalLink, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Cliente {
  id: string;
  municipio_id: number;
  tipos_servico: string[];
  status: boolean;
  link_sistema: string | null;
  login_sistema: string | null;
  criado_em: string | null;
  municipio_nome?: string;
  municipio_uf?: number;
}

const UF_MAP: Record<number, string> = {
  11:"RO",12:"AC",13:"AM",14:"RR",15:"PA",16:"AP",17:"TO",21:"MA",22:"PI",
  23:"CE",24:"RN",25:"PB",26:"PE",27:"AL",28:"SE",29:"BA",31:"MG",32:"ES",
  33:"RJ",35:"SP",41:"PR",42:"SC",43:"RS",50:"MS",51:"MT",52:"GO",53:"DF",
};

const SERVICO_COLORS: Record<string, { bg: string; text: string }> = {
  "Contábil": { bg: "bg-blue-100", text: "text-blue-700" },
  "Jurídico": { bg: "bg-purple-100", text: "text-purple-700" },
  "Auditoria": { bg: "bg-green-100", text: "text-green-700" },
  "Compliance": { bg: "bg-orange-100", text: "text-orange-700" },
};

const SERVICOS = ["Contábil", "Jurídico", "Auditoria", "Compliance"];

const ClientesListPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterServico, setFilterServico] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [toggleDialog, setToggleDialog] = useState<Cliente | null>(null);
  const [linkedUsersCount, setLinkedUsersCount] = useState(0);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>("/clientes");
      setClientes(
        data.map((c) => ({
          ...c,
          tipos_servico: c.tipos_servico || [],
          municipio_nome: c.municipio_nome || "—",
          municipio_uf: c.municipio_uf,
        }))
      );
    } catch (err: any) {
      toast({ title: "Erro ao carregar clientes", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (cliente: Cliente) => {
    if (cliente.status) {
      // Activating→inactivating: check linked users
      const { count } = await api.get<{ count: number }>(`/clientes/${cliente.id}/count-usuarios`);
      if (count > 0) {
        setLinkedUsersCount(count);
        setToggleDialog(cliente);
        return;
      }
    }
    await confirmToggle(cliente);
  };

  const confirmToggle = async (cliente: Cliente) => {
    try {
      await api.patch(`/clientes/${cliente.id}/status`, { status: !cliente.status });
      setClientes((prev) =>
        prev.map((c) => (c.id === cliente.id ? { ...c, status: !c.status } : c))
      );
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setToggleDialog(null);
  };

  const filtered = clientes.filter((c) => {
    const matchSearch = !search || c.municipio_nome?.toLowerCase().includes(search.toLowerCase());
    const matchServico = filterServico === "todos" || c.tipos_servico.includes(filterServico);
    const matchStatus =
      filterStatus === "todos" ||
      (filterStatus === "ativo" && c.status) ||
      (filterStatus === "inativo" && !c.status);
    return matchSearch && matchServico && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">Clientes</h1>
          <p className="text-sm text-muted-foreground">Municípios atendidos pela VH Contabilidade</p>
        </div>
        <Button onClick={() => navigate("/clientes/novo")} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Cliente
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Buscar por nome do município..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={filterServico} onValueChange={setFilterServico}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de Serviço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Serviços</SelectItem>
                {SERVICOS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Município</TableHead>
                <TableHead>UF</TableHead>
                <TableHead>Serviços</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Building2 className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Nenhum cliente encontrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c, i) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{c.municipio_nome}</TableCell>
                    <TableCell>{c.municipio_uf ? UF_MAP[c.municipio_uf] || "—" : "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.tipos_servico.map((s) => (
                          <span key={s} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SERVICO_COLORS[s]?.bg || "bg-muted"} ${SERVICO_COLORS[s]?.text || "text-foreground"}`}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status ? "default" : "destructive"}>
                        {c.status ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/clientes/${c.id}/editar`)} title="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {c.link_sistema && (
                          <Button variant="ghost" size="icon" onClick={() => window.open(c.link_sistema!, "_blank")} title="Abrir Sistema">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                        <Switch checked={c.status} onCheckedChange={() => handleToggleStatus(c)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!toggleDialog} onOpenChange={() => setToggleDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              {linkedUsersCount} usuário(s) estão vinculados a este município. Eles perderão acesso ao sistema. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toggleDialog && confirmToggle(toggleDialog)}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientesListPage;
