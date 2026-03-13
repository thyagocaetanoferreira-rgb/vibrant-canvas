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
import JuridicoPage from "@/pages/JuridicoPage";
import RiscosPage from "@/pages/RiscosPage";
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
import { Calendar, BarChart3, MapPin, Users, Globe, CreditCard, FileText, Bell, Settings } from "lucide-react";

const queryClient = new QueryClient();

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
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/entregas" element={<EntregasPage />} />
              <Route path="/demandas" element={<DemandasPage />} />
              <Route path="/juridico" element={<JuridicoPage />} />
              <Route path="/riscos" element={<RiscosPage />} />
              <Route path="/agenda" element={<ModulePlaceholder title="Agenda" description="Calendário unificado de visitas, reuniões e diligências" icon={Calendar} />} />
              <Route path="/relatorios" element={<ModulePlaceholder title="Relatórios" description="Dashboards BI e relatórios consolidados" icon={BarChart3} />} />
              <Route path="/visitas" element={<ModulePlaceholder title="Visitas" description="Controle de viagens e visitas aos clientes" icon={MapPin} />} />
              <Route path="/gente-gestao" element={<ModulePlaceholder title="Gente e Gestão" description="Solicitação e aprovação de férias" icon={Users} />} />
              <Route path="/portal-tcm" element={<ModulePlaceholder title="Portal Cidadão TCM" description="Consulta de cargos, contas e legislações" icon={Globe} />} />
              <Route path="/financeiro" element={<ModulePlaceholder title="Financeiro" description="Controle de faturamento" icon={CreditCard} />} />
              <Route path="/documentos" element={<ModulePlaceholder title="Documentos Internos" description="Documentos e formulários internos" icon={FileText} />} />
              <Route path="/notificacoes" element={<ModulePlaceholder title="Notificações" description="Caixa de entrada e saída de mensagens" icon={Bell} />} />
              <Route path="/configuracoes" element={<ModulePlaceholder title="Configurações" description="Cadastros, usuários e compliance" icon={Settings} />} />
              <Route path="/usuarios" element={<UsuariosListPage />} />
              <Route path="/usuarios/novo" element={<UsuarioFormPage />} />
              <Route path="/usuarios/:id/editar" element={<UsuarioFormPage />} />
              <Route path="/usuarios/:id/permissoes" element={<UsuarioPermissoesPage />} />
              <Route path="/clientes" element={<ClientesListPage />} />
              <Route path="/clientes/novo" element={<ClienteFormPage />} />
              <Route path="/clientes/:id/editar" element={<ClienteFormPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
