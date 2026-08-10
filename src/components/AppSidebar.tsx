import { Home, Sparkles, Search, FileText, Globe, GraduationCap, HelpCircle, LogOut, CreditCard, Users, Receipt, MessageCircle, TrendingUp, Lightbulb, Trophy, Wallet, MessageSquare, User, RefreshCw, ShieldCheck, Rocket } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { CreditsDisplay } from "./CreditsDisplay";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const growthItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Encontrar Clientes", url: "/prospector", icon: Rocket },
  { title: "Conversas IA", url: "/whatsapp-ai", icon: MessageCircle },
  { title: "Oportunidades", url: "/sales-pipeline", icon: TrendingUp },
  { title: "Clientes", url: "/crm", icon: Users },
  { title: "Resultados", url: "/reports", icon: Trophy },
];

const toolsItems = [
  { title: "Abordagem de Vendas", url: "/sales-approach", icon: Lightbulb },
  { title: "Chat de Vendas", url: "/app-generator", icon: MessageSquare },
  { title: "Gerador WhatsApp", url: "/whatsapp-generator", icon: MessageCircle },
  { title: "IA Copywriter", url: "/copywriter", icon: FileText },
  { title: "LP Builder", url: "/lp-builder", icon: Globe },
  { title: "Materializar SaaS", url: "/materializar", icon: Sparkles },
  { title: "Atualizações de Projetos", url: "/project-updates", icon: RefreshCw },
  { title: "Financeiro", url: "/finance", icon: Wallet },
  
];

const accountItems = [
  { title: "Histórico de Pagamentos", url: "/payment-history", icon: Receipt },
  { title: "Meu Perfil", url: "/profile", icon: User },
  { title: "Suporte", url: "/suporte", icon: HelpCircle },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { signOut, user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" as any }).then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [user]);

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="px-6 py-4">
          <h1 className={`text-2xl font-bold gradient-text ${!open ? 'hidden' : ''}`}>
            Nexus IA
          </h1>
          {!open && <span className="text-2xl font-bold gradient-text">N</span>}
        </div>
        
        {[
          { label: "Crescimento", items: growthItems },
          { label: "Ferramentas", items: toolsItems },
          { label: "Conta", items: accountItems },
        ].map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "hover:bg-sidebar-accent/50"
                          }`
                        }
                      >
                        <item.icon className="w-5 h-5" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin/sales-report"
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "hover:bg-sidebar-accent/50"
                        }`
                      }
                    >
                      <ShieldCheck className="w-5 h-5" />
                      {open && <span>Relatório de Vendas</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-4 py-3 space-y-3">
          {open && (
            <>
              <div className="flex flex-col gap-2">
                <CreditsDisplay />
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/pricing'}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Upgrade
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={signOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
              {user && (
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              )}
            </>
          )}
          {!open && (
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/pricing'}
              >
                <CreditCard className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
