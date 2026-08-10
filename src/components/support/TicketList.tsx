import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { TicketDetailDialog } from "./TicketDetailDialog";

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at: string;
  first_response_at: string | null;
  response_sla_hours: number;
  resolved_at: string | null;
  resolution_sla_hours: number;
}

const statusConfig = {
  open: { label: "Aberto", icon: AlertCircle, color: "bg-blue-500" },
  in_progress: { label: "Em Progresso", icon: Clock, color: "bg-yellow-500" },
  waiting_customer: { label: "Aguardando Cliente", icon: Clock, color: "bg-orange-500" },
  resolved: { label: "Resolvido", icon: CheckCircle2, color: "bg-green-500" },
  closed: { label: "Fechado", icon: XCircle, color: "bg-gray-500" },
};

const priorityConfig = {
  low: { label: "Baixa", color: "bg-gray-500" },
  medium: { label: "Média", color: "bg-blue-500" },
  high: { label: "Alta", color: "bg-orange-500" },
  urgent: { label: "Urgente", color: "bg-red-500" },
};

const categoryLabels = {
  general: "Geral",
  technical: "Técnico",
  billing: "Financeiro",
  feature_request: "Sugestão",
  bug: "Bug/Erro",
};

export function TicketList({ refresh }: { refresh: number }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    fetchTickets();
  }, [refresh]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSLAStatus = (ticket: Ticket) => {
    if (ticket.first_response_at) return "responded";
    
    const createdAt = new Date(ticket.created_at);
    const now = new Date();
    const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursElapsed > ticket.response_sla_hours) return "breached";
    if (hoursElapsed > ticket.response_sla_hours * 0.75) return "warning";
    return "ok";
  };

  if (loading) {
    return <div className="text-center py-8">Carregando tickets...</div>;
  }

  if (tickets.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="pt-6 text-center text-muted-foreground">
          Você ainda não tem tickets abertos. Crie seu primeiro ticket de suporte!
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {tickets.map((ticket) => {
          const Status = statusConfig[ticket.status as keyof typeof statusConfig];
          const slaStatus = getSLAStatus(ticket);

          return (
            <Card
              key={ticket.id}
              className="glass-card hover:border-primary/50 transition-all cursor-pointer"
              onClick={() => setSelectedTicket(ticket)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono">
                        {ticket.ticket_number}
                      </Badge>
                      <Badge className={`${Status.color} text-white`}>
                        <Status.icon className="w-3 h-3 mr-1" />
                        {Status.label}
                      </Badge>
                      <Badge className={priorityConfig[ticket.priority as keyof typeof priorityConfig].color + " text-white"}>
                        {priorityConfig[ticket.priority as keyof typeof priorityConfig].label}
                      </Badge>
                      <Badge variant="secondary">
                        {categoryLabels[ticket.category as keyof typeof categoryLabels]}
                      </Badge>
                      {slaStatus === "breached" && (
                        <Badge variant="destructive">SLA Vencido</Badge>
                      )}
                      {slaStatus === "warning" && (
                        <Badge className="bg-orange-500 text-white">SLA Próximo</Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{ticket.title}</CardTitle>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>
                      {formatDistanceToNow(new Date(ticket.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground line-clamp-2">
                  {ticket.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedTicket && (
        <TicketDetailDialog
          ticket={selectedTicket}
          open={!!selectedTicket}
          onOpenChange={(open) => !open && setSelectedTicket(null)}
          onUpdate={fetchTickets}
        />
      )}
    </>
  );
}
