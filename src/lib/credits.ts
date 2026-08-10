import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export async function deductCredit(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("deduct_credit", {
      user_id_param: userId,
    });

    if (error) throw error;

    if (!data) {
      toast({
        title: "Créditos insuficientes",
        description: "Você não tem créditos suficientes. Faça upgrade do seu plano!",
        variant: "destructive",
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deducting credit:", error);
    toast({
      title: "Erro",
      description: "Erro ao deduzir crédito. Tente novamente.",
      variant: "destructive",
    });
    return false;
  }
}

export async function checkCredits(userId: string): Promise<{ hasCredits: boolean; credits: number; plan: string }> {
  try {
    const { data, error } = await supabase
      .from("user_credits")
      .select("credits, plan")
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    const hasCredits = data.plan === "enterprise" || data.credits > 0;

    return {
      hasCredits,
      credits: data.credits,
      plan: data.plan,
    };
  } catch (error) {
    console.error("Error checking credits:", error);
    return { hasCredits: false, credits: 0, plan: "free" };
  }
}
