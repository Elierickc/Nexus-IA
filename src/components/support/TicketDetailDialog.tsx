import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User, MessageSquare, Send } from "lucide-react";

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  first_response_at: string | null;
  response_sla_hours: number;
  resolved_at: string | null;
  resolution_sla_hours: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  is_internal: boolean;
}

interface TicketDetailDialogProps {
  ticket: Ticket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function TicketDetailDialog({ ticket, open, onOpenChange, onUpdate }: TicketDetailDialogProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchComments();
    }
  }, [open, ticket.id]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("ticket_comments")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("ticket_comments").insert({
        ticket_id: ticket.id,
        user_id: user.id,
        content: newComment.trim(),
        is_internal: false,
      });

      if (error) throw error;

      // Update first_response_at if this is the first comment
      if (!ticket.first_response_at) {
        await supabase
          .from("support_tickets")
          .update({ first_response_at: new Date().toISOString() })
          .eq("id", ticket.id);
      }

      setNewComment("");
      fetchComments();
      onUpdate();

      toast({
        title: "Comentário adicionado",
        description: "Seu comentário foi enviado com sucesso.",
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Erro ao adicionar comentário",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSLAInfo = () => {
    const createdAt = new Date(ticket.created_at);
    const now = new Date();
    const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (ticket.first_response_at) {
      const responseTime = new Date(ticket.first_response_at);
      const responseHours = (responseTime.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      return {
        status: "responded",
        message: `Respondido em ${responseHours.toFixed(1)} horas`,
        color: "text-green-600",
      };
    }

    if (hoursElapsed > ticket.response_sla_hours) {
      return {
        status: "breached",
        message: `SLA vencido há ${(hoursElapsed - ticket.response_sla_hours).toFixed(1)} horas`,
        color: "text-red-600",
      };
    }

    const remaining = ticket.response_sla_hours - hoursElapsed;
    return {
      status: "pending",
      message: `SLA: ${remaining.toFixed(1)} horas restantes`,
      color: remaining < 1 ? "text-orange-600" : "text-blue-600",
    };
  };

  const slaInfo = getSLAInfo();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {ticket.ticket_number}
              </Badge>
              <Badge className={slaInfo.color}>
                <Clock className="w-3 h-3 mr-1" />
                {slaInfo.message}
              </Badge>
            </div>
            <DialogTitle className="text-xl">{ticket.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-muted-foreground mt-1" />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground mb-1">
                    {formatDistanceToNow(new Date(ticket.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </div>
                  <p className="text-sm">{ticket.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold">Histórico de Atendimento</h3>
            </div>

            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum comentário ainda. Adicione uma mensagem abaixo.
              </p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <Card key={comment.id} className="bg-background">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <User className="w-4 h-4 text-muted-foreground mt-1" />
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground mb-1">
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <label className="text-sm font-medium">Adicionar Comentário</label>
            <Textarea
              placeholder="Digite sua mensagem..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={4}
            />
            <Button
              onClick={handleAddComment}
              disabled={loading || !newComment.trim()}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {loading ? "Enviando..." : "Enviar Comentário"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
