import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import EntregasPage from "@/pages/EntregasPage";
import DemandasPage from "@/pages/DemandasPage";
import JuridicoPage from "@/pages/JuridicoPage";
import RiscosPage from "@/pages/RiscosPage";
import ModulePlaceholder from "@/components/ModulePlaceholder";
import NotFound from "./pages/NotFound";
import { Calendar, BarChart3, MapPin, Users, Globe, CreditCard, FileText, Bell, Settings } from "lucide-react";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
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
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
