import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Materializar from "./pages/Materializar";
import Prospector from "./pages/Prospector";
import Copywriter from "./pages/Copywriter";
import LPBuilder from "./pages/LPBuilder";
import Academy from "./pages/Academy";
import Suporte from "./pages/Suporte";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import AppGenerator from "./pages/AppGenerator";
import Index from "./pages/Index";
import CRM from "./pages/CRM";
import PaymentHistory from "./pages/PaymentHistory";
import WhatsAppGenerator from "./pages/WhatsAppGenerator";
import SalesPipeline from "./pages/SalesPipeline";
import SalesApproach from "./pages/SalesApproach";
import Reports from "./pages/Reports";
import Finance from "./pages/Finance";
import Profile from "./pages/Profile";
import ProjectUpdates from "./pages/ProjectUpdates";
import WhatsAppAI from "./pages/WhatsAppAI";
import AdminSalesReport from "./pages/AdminSalesReport";
import Onboarding from "./pages/Onboarding";
import { OnboardingGate } from "./components/OnboardingGate";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/app-generator" element={<ProtectedRoute><AppLayout><AppGenerator /></AppLayout></ProtectedRoute>} />
            <Route path="/materializar" element={<ProtectedRoute><AppLayout><Materializar /></AppLayout></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/prospector" element={<ProtectedRoute><OnboardingGate><AppLayout><Prospector /></AppLayout></OnboardingGate></ProtectedRoute>} />
            <Route path="/copywriter" element={<ProtectedRoute><AppLayout><Copywriter /></AppLayout></ProtectedRoute>} />
            <Route path="/lp-builder" element={<ProtectedRoute><AppLayout><LPBuilder /></AppLayout></ProtectedRoute>} />
            <Route path="/academy" element={<ProtectedRoute><AppLayout><Academy /></AppLayout></ProtectedRoute>} />
            <Route path="/suporte" element={<ProtectedRoute><AppLayout><Suporte /></AppLayout></ProtectedRoute>} />
            <Route path="/crm" element={<ProtectedRoute><AppLayout><CRM /></AppLayout></ProtectedRoute>} />
            <Route path="/sales-pipeline" element={<ProtectedRoute><AppLayout><SalesPipeline /></AppLayout></ProtectedRoute>} />
            <Route path="/sales-approach" element={<ProtectedRoute><AppLayout><SalesApproach /></AppLayout></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
            <Route path="/finance" element={<ProtectedRoute><AppLayout><Finance /></AppLayout></ProtectedRoute>} />
            <Route path="/payment-history" element={<ProtectedRoute><AppLayout><PaymentHistory /></AppLayout></ProtectedRoute>} />
            <Route path="/whatsapp-generator" element={<ProtectedRoute><AppLayout><WhatsAppGenerator /></AppLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
            <Route path="/project-updates" element={<ProtectedRoute><AppLayout><ProjectUpdates /></AppLayout></ProtectedRoute>} />
            <Route path="/whatsapp-ai" element={<ProtectedRoute><AppLayout><WhatsAppAI /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/sales-report" element={<ProtectedRoute><AppLayout><AdminSalesReport /></AppLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
