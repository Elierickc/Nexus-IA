import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Subscription {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  plan_name: string;
  amount: number;
  billing_cycle: string;
  status: string;
  start_date: string;
  next_billing_date: string;
  last_billing_date: string | null;
}

interface SubscriptionListProps {
  onRefresh?: () => void;
}

const statusColors = {
  active: "default",
  pending: "outline",
  cancelled: "destructive",
  overdue: "destructive"
} as const;

const statusLabels = {
  active: "Ativo",
  pending: "Pendente",
  cancelled: "Cancelado",
  overdue: "Vencido"
};

const billingCycleLabels = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual"
};

export function SubscriptionList({ onRefresh }: SubscriptionListProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("finance_subscriptions")
        .select("*")
        .order("next_billing_date", { ascending: true });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as assinaturas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta assinatura?")) return;

    try {
      const { error } = await supabase
        .from("finance_subscriptions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Assinatura excluída com sucesso"
      });

      loadSubscriptions();
      onRefresh?.();
    } catch (error) {
      console.error("Error deleting subscription:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a assinatura",
        variant: "destructive"
      });
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    return differenceInDays(new Date(dueDate), new Date());
  };

  if (loading) {
    return <div className="text-center py-4">Carregando assinaturas...</div>;
  }

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma assinatura cadastrada
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Ciclo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Próximo Vencimento</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.map((subscription) => {
            const daysUntilDue = getDaysUntilDue(subscription.next_billing_date);
            const isNearDue = daysUntilDue <= 7 && daysUntilDue >= 0;
            
            return (
              <TableRow key={subscription.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{subscription.client_name}</div>
                    {subscription.client_email && (
                      <div className="text-xs text-muted-foreground">{subscription.client_email}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{subscription.plan_name}</TableCell>
                <TableCell>
                  {billingCycleLabels[subscription.billing_cycle as keyof typeof billingCycleLabels] || subscription.billing_cycle}
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[subscription.status as keyof typeof statusColors] || "secondary"}>
                    {statusLabels[subscription.status as keyof typeof statusLabels] || subscription.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  R$ {Number(subscription.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {isNearDue && subscription.status === 'active' && (
                      <Bell className="h-4 w-4 text-warning" />
                    )}
                    <div>
                      <div>{format(new Date(subscription.next_billing_date), "dd/MM/yyyy", { locale: ptBR })}</div>
                      {subscription.status === 'active' && (
                        <div className={`text-xs ${isNearDue ? 'text-warning font-medium' : 'text-muted-foreground'}`}>
                          {daysUntilDue > 0 ? `${daysUntilDue} dias` : daysUntilDue === 0 ? 'Hoje' : `${Math.abs(daysUntilDue)} dias atrasado`}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(subscription.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
