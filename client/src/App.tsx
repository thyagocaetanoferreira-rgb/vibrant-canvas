import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import EntregasPage from "@/pages/EntregasPage";
import DemandasPage from "@/pages/DemandasPage";
import DiagnosticoListPage from "@/pages/diagnostico/DiagnosticoListPage";
import DiagnosticoFormPage from "@/pages/diagnostico/DiagnosticoFormPage";
import JuridicoPage from "@/pages/JuridicoPage";
import RiscosPage from "@/pages/RiscosPage";
import IntegracoesPage from "@/pages/IntegracoesPage";
import ModulePlaceholder from "@/components/ModulePlaceholder";
import NotFound from "./pages/NotFound";
import LoginPage from "@/pages/LoginPage";
import EsqueciSenhaPage from "@/pages/EsqueciSenhaPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import SelecionarMunicipioPage from "@/pages/SelecionarMunicipioPage";
import UsuariosListPage from "@/pages/usuarios/UsuariosListPage";
import UsuarioFormPage from "@/pages/usuarios/UsuarioFormPage";
import UsuarioPermissoesPage from "@/pages/usuarios/UsuarioPermissoesPage";
import ClientesListPage from "@/pages/clientes/ClientesListPage";
import ClienteFormPage from "@/pages/clientes/ClienteFormPage";
import ImportarLancamentosPage from "@/pages/ImportarLancamentosPage";
import BalancetesPage from "@/pages/integracoes/BalancetesPage";
import ValidadorSiconfiPage from "@/pages/siconfi/ValidadorSiconfiPage";
import InssRppsPage from "@/pages/paineis/InssRppsPage";
import SaldosBancariosPage from "@/pages/paineis/SaldosBancariosPage";
import AlteracoesOrcamentariasPage from "@/pages/paineis/AlteracoesOrcamentariasPage";
import DividaConsolidadaPage from "@/pages/paineis/DividaConsolidadaPage";
import BoletimContabilPage from "@/pages/relatorios/BoletimContabilPage";
import CaucMunicipioPage from "@/pages/relatorios/CaucMunicipioPage";
import CaucGeralPage from "@/pages/relatorios/CaucGeralPage";
import { Calendar, BarChart3, MapPin, Users, Globe, CreditCard, FileText, Bell, Settings } from "lucide-react";

import { useNavigate } from "react-router-dom";

const queryClient = new QueryClient();

function RelatoriosHubPage() {
  const nav = useNavigate();
  const relatorios = [
    {
      titulo: "Painel CAUC",
      descricao: "Situação cadastral, fiscal e legal do município para transferências voluntárias da União.",
      rota: "/relatorios/cauc",
      icone: "🛡️",
    },
    {
      titulo: "Boletim Contábil",
      descricao: "Indicadores da Lei de Responsabilidade Fiscal e execução orçamentária mensal.",
      rota: "/relatorios/boletim-contabil",
      icone: "📊",
    },
    {
      titulo: "CAUC Geral",
      descricao: "Matriz de situação CAUC de todos os municípios clientes ativos.",
      rota: "/relatorios/cauc-geral",
      icone: "🗺️",
    },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-primary">Relatórios</h1>
        <p className="text-muted-foreground mt-1">Dashboards e relatórios consolidados do município.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {relatorios.map((r) => (
          <button
            key={r.rota}
            onClick={() => nav(r.rota)}
            className="text-left rounded-xl border bg-card p-5 hover:shadow-md hover:border-primary/40 transition-all group"
          >
            <div className="text-3xl mb-3">{r.icone}</div>
            <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{r.titulo}</div>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{r.descricao}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/selecionar-municipio" element={<SelecionarMunicipioPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/entregas" element={<EntregasPage />} />
              <Route path="/demandas" element={<DemandasPage />} />
              <Route path="/diagnostico" element={<DiagnosticoListPage />} />
              <Route path="/diagnostico/novo" element={<DiagnosticoFormPage />} />
              <Route path="/diagnostico/:id/editar" element={<DiagnosticoFormPage />} />
              <Route path="/juridico" element={<JuridicoPage />} />
              <Route path="/riscos" element={<RiscosPage />} />
              <Route path="/agenda" element={<ModulePlaceholder title="Agenda" description="Calendário unificado de visitas, reuniões e diligências" icon={Calendar} />} />
              <Route path="/relatorios" element={<RelatoriosHubPage />} />
              <Route path="/relatorios/boletim-contabil" element={<BoletimContabilPage />} />
              <Route path="/relatorios/cauc" element={<CaucMunicipioPage />} />
              <Route path="/relatorios/cauc-geral" element={<CaucGeralPage />} />
              <Route path="/visitas" element={<ModulePlaceholder title="Visitas" description="Controle de viagens e visitas aos clientes" icon={MapPin} />} />
              <Route path="/gente-gestao" element={<ModulePlaceholder title="Gente e Gestão" description="Solicitação e aprovação de férias" icon={Users} />} />
              <Route path="/portal-tcm" element={<ModulePlaceholder title="Portal Cidadão TCM" description="Consulta de cargos, contas e legislações" icon={Globe} />} />
              <Route path="/financeiro" element={<ModulePlaceholder title="Financeiro" description="Controle de faturamento" icon={CreditCard} />} />
              <Route path="/documentos" element={<ModulePlaceholder title="Documentos Internos" description="Documentos e formulários internos" icon={FileText} />} />
              <Route path="/notificacoes" element={<ModulePlaceholder title="Notificações" description="Caixa de entrada e saída de mensagens" icon={Bell} />} />
              <Route path="/configuracoes" element={<ModulePlaceholder title="Configurações" description="Cadastros, usuários e compliance" icon={Settings} />} />
              <Route path="/integracoes" element={<IntegracoesPage />} />
              <Route path="/integracoes/balancetes" element={<BalancetesPage />} />
              <Route path="/usuarios" element={<UsuariosListPage />} />
              <Route path="/usuarios/novo" element={<UsuarioFormPage />} />
              <Route path="/usuarios/:id/editar" element={<UsuarioFormPage />} />
              <Route path="/usuarios/:id/permissoes" element={<UsuarioPermissoesPage />} />
              <Route path="/clientes" element={<ClientesListPage />} />
              <Route path="/clientes/novo" element={<ClienteFormPage />} />
              <Route path="/clientes/:id/editar" element={<ClienteFormPage />} />
              <Route path="/importar-lancamentos" element={<ImportarLancamentosPage />} />
              <Route path="/siconfi/validador" element={<ValidadorSiconfiPage />} />
              <Route path="/paineis/extraorcamentario/inss-rpps" element={<InssRppsPage />} />
              <Route path="/paineis/financeiro/saldos-bancarios" element={<SaldosBancariosPage />} />
              <Route path="/paineis/orcamentario/alteracoes-orcamentarias" element={<AlteracoesOrcamentariasPage />} />
              <Route path="/paineis/orcamentario/divida-consolidada" element={<DividaConsolidadaPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
