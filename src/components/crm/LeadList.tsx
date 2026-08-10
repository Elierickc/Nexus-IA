import { useEffect, useState } from "react";
import { Edit, Phone, Mail, Trash2, Building2, Search, UserPlus, CheckCircle, RefreshCw, Bell, BellOff, Monitor, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { playNotificationSound } from "@/lib/notification-sound";
import { requestNotificationPermission, notifyNewLead } from "@/lib/desktop-notification";
import { openWhatsAppLink } from "@/lib/whatsapp";

interface Lead {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  source: string | null;
  notes: string | null;
  converted_contact_id: string | null;
  created_at: string;
}

interface LeadListProps {
  onConvert: (leadId: string) => void;
  onEdit: (leadId: string) => void;
  onDelete: () => void;
}

const LeadList = ({ onConvert, onEdit, onDelete }: LeadListProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('lead-notifications-sound');
    return saved !== null ? saved === 'true' : true;
  });
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('lead-notifications-desktop');
    return saved !== null ? saved === 'true' : false;
  });
  const [previousLeadCount, setPreviousLeadCount] = useState(0);

  useEffect(() => {
    loadLeads();
    
    // Set up Realtime subscription for live updates
    const channel = supabase
      .channel('crm-leads-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Listen specifically for new leads
          schema: 'public',
          table: 'crm_leads',
          filter: `owner_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('New lead detected:', payload);
          
          // Play notification sound if enabled
          if (soundEnabled) {
            playNotificationSound();
          }

          // Show desktop notification if enabled
          if (desktopNotificationsEnabled && payload.new) {
            const leadName = payload.new.name || 'Lead sem nome';
            const leadCompany = payload.new.company;
            notifyNewLead(leadName, leadCompany);
          }
          
          // Reload leads when any change occurs
          loadLeads();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all other events
          schema: 'public',
          table: 'crm_leads',
          filter: `owner_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('Lead change detected:', payload);
          loadLeads();
        }
      )
      .subscribe();

    // Fallback: Auto-refresh every 30 seconds
    const intervalId = setInterval(() => {
      loadLeads();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, [user, soundEnabled, desktopNotificationsEnabled]);

  const loadLeads = async (showRefreshToast = false) => {
    if (!user) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from("crm_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar leads: " + error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setLeads(data || []);
    setIsLoading(false);

    if (showRefreshToast) {
      toast({
        title: "Leads atualizados!",
        description: `${data?.length || 0} leads carregados`,
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadLeads(true);
    setIsRefreshing(false);
  };

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('lead-notifications-sound', String(newValue));
    toast({
      title: newValue ? "Sons ativados" : "Sons desativados",
      description: newValue 
        ? "Você receberá um som quando novos leads chegarem"
        : "Notificações sonoras desativadas",
    });
  };

  const toggleDesktopNotifications = async () => {
    if (!desktopNotificationsEnabled) {
      // Request permission first
      const granted = await requestNotificationPermission();
      
      if (granted) {
        setDesktopNotificationsEnabled(true);
        localStorage.setItem('lead-notifications-desktop', 'true');
        toast({
          title: "Notificações de desktop ativadas",
          description: "Você receberá notificações quando novos leads chegarem",
        });
      } else {
        toast({
          title: "Permissão negada",
          description: "Habilite as notificações nas configurações do navegador",
          variant: "destructive",
        });
      }
    } else {
      setDesktopNotificationsEnabled(false);
      localStorage.setItem('lead-notifications-desktop', 'false');
      toast({
        title: "Notificações de desktop desativadas",
        description: "Você não receberá mais notificações de desktop",
      });
    }
  };

  const generateWhatsAppMessage = (lead: Lead) => {
    if (!lead.phone) {
      toast({
        title: "Erro",
        description: "Lead não possui telefone cadastrado",
        variant: "destructive",
      });
      return;
    }

    const message = 'ola';
    openWhatsAppLink(lead.phone as string, message);

    toast({
      title: "Abrindo WhatsApp...",
      description: "Link gerado no formato wa.me",
    });
  };

  const handleDelete = async () => {
    if (!deleteLeadId) return;

    const { error } = await supabase
      .from("crm_leads")
      .delete()
      .eq("id", deleteLeadId);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao deletar lead: " + error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Lead deletado com sucesso",
    });

    setDeleteLeadId(null);
    loadLeads();
    onDelete();
  };

  const filteredLeads = leads.filter((lead) => {
    const searchLower = searchTerm.toLowerCase();
    const name = lead.name?.toLowerCase() || "";
    const email = lead.email?.toLowerCase() || "";
    const company = lead.company?.toLowerCase() || "";
    
    return (
      name.includes(searchLower) ||
      email.includes(searchLower) ||
      company.includes(searchLower)
    );
  });

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length > 1
      ? `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "new":
        return "bg-blue-500/10 text-blue-500";
      case "contacted":
        return "bg-yellow-500/10 text-yellow-500";
      case "qualified":
        return "bg-green-500/10 text-green-500";
      case "lost":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case "new":
        return "Novo";
      case "contacted":
        return "Contatado";
      case "qualified":
        return "Qualificado";
      case "lost":
        return "Perdido";
      default:
        return "Sem status";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSound}
          title={soundEnabled ? "Desativar sons" : "Ativar sons"}
        >
          {soundEnabled ? (
            <Bell className="w-4 h-4" />
          ) : (
            <BellOff className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleDesktopNotifications}
          title={desktopNotificationsEnabled ? "Desativar notificações de desktop" : "Ativar notificações de desktop"}
        >
          <Monitor className={`w-4 h-4 ${desktopNotificationsEnabled ? '' : 'text-muted-foreground'}`} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Atualizar lista de leads"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {filteredLeads.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchTerm ? "Nenhum lead encontrado com esse termo" : "Nenhum lead cadastrado ainda"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                lead.converted_contact_id
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getInitials(lead.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg truncate">
                    {lead.name}
                  </h3>
                  {lead.converted_contact_id && (
                    <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Convertido
                    </Badge>
                  )}
                  {!lead.converted_contact_id && lead.status && (
                    <Badge className={getStatusColor(lead.status)}>
                      {getStatusLabel(lead.status)}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {lead.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                  
                  {lead.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      <span>{lead.phone}</span>
                    </div>
                  )}

                  {lead.company && (
                    <div className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      <span className="truncate">{lead.company}</span>
                    </div>
                  )}
                </div>

                {lead.source && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Fonte: {lead.source}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {!lead.converted_contact_id && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onConvert(lead.id)}
                    className="gap-1"
                  >
                    <UserPlus className="w-4 h-4" />
                    Converter
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => generateWhatsAppMessage(lead)}
                  title="Enviar mensagem no WhatsApp"
                  disabled={!lead.phone}
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(lead.id)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteLeadId(lead.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteLeadId} onOpenChange={() => setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeadList;
