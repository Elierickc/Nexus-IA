import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UpcomingSubscription {
  id: string;
  client_name: string;
  plan_name: string;
  amount: number;
  next_billing_date: string;
  daysUntilDue: number;
}

export function SubscriptionReminders() {
  const [upcomingSubscriptions, setUpcomingSubscriptions] = useState<UpcomingSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUpcomingSubscriptions();
  }, []);

  const loadUpcomingSubscriptions = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(today.getDate() + 7);

      const { data, error } = await supabase
        .from("finance_subscriptions")
        .select("id, client_name, plan_name, amount, next_billing_date")
        .eq("status", "active")
        .gte("next_billing_date", format(today, "yyyy-MM-dd"))
        .lte("next_billing_date", format(sevenDaysFromNow, "yyyy-MM-dd"))
        .order("next_billing_date", { ascending: true });

      if (error) throw error;

      const subscriptionsWithDays = (data || []).map(sub => ({
        ...sub,
        daysUntilDue: differenceInDays(new Date(sub.next_billing_date), today)
      }));

      setUpcomingSubscriptions(subscriptionsWithDays);
    } catch (error) {
      console.error("Error loading upcoming subscriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (upcomingSubscriptions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-warning" />
          <div>
            <CardTitle>Lembretes de Vencimento</CardTitle>
            <CardDescription>
              Assinaturas com vencimento nos próximos 7 dias
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingSubscriptions.map((subscription) => (
          <Alert key={subscription.id} className="border-l-4 border-l-warning">
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{subscription.client_name}</div>
                  <div className="text-sm text-muted-foreground">{subscription.plan_name}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    R$ {Number(subscription.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {subscription.daysUntilDue === 0
                      ? "Vence hoje"
                      : subscription.daysUntilDue === 1
                      ? "Vence amanhã"
                      : `Vence em ${subscription.daysUntilDue} dias`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(subscription.next_billing_date), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}
