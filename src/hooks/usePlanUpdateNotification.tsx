import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const usePlanUpdateNotification = (userId: string | undefined) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('user-credits-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_credits',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const oldPlan = payload.old.plan;
          const newPlan = payload.new.plan;
          
          if (oldPlan !== newPlan) {
            const planNames: Record<string, string> = {
              free: 'Gratuito',
              monthly: 'Mensal',
              lifetime: 'Vitalício',
            };

            toast({
              title: "Plano Atualizado! 🎉",
              description: `Seu plano foi atualizado para ${planNames[newPlan] || newPlan}. Aproveite seus novos créditos!`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);
};
