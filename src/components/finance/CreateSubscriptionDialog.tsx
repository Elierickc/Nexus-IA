import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { addMonths, format } from "date-fns";

const subscriptionSchema = z.object({
  client_name: z.string().min(1, "Nome do cliente é obrigatório"),
  client_email: z.string().email("Email inválido").optional().or(z.literal("")),
  client_phone: z.string().optional(),
  plan_name: z.string().min(1, "Nome do plano é obrigatório"),
  amount: z.string().min(1, "Valor é obrigatório"),
  billing_cycle: z.string().min(1, "Ciclo de cobrança é obrigatório"),
  start_date: z.string().min(1, "Data de início é obrigatória"),
  notes: z.string().optional()
});

type SubscriptionFormData = z.infer<typeof subscriptionSchema>;

interface CreateSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateSubscriptionDialog({ open, onOpenChange, onSuccess }: CreateSubscriptionDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      billing_cycle: "monthly",
      start_date: format(new Date(), "yyyy-MM-dd")
    }
  });

  const startDate = watch("start_date");
  const billingCycle = watch("billing_cycle");

  const calculateNextBillingDate = () => {
    if (!startDate) return "";
    
    const start = new Date(startDate);
    let months = 1;
    
    switch (billingCycle) {
      case "quarterly":
        months = 3;
        break;
      case "semiannual":
        months = 6;
        break;
      case "annual":
        months = 12;
        break;
      default:
        months = 1;
    }
    
    return format(addMonths(start, months), "yyyy-MM-dd");
  };

  const onSubmit = async (data: SubscriptionFormData) => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const nextBillingDate = calculateNextBillingDate();

      const { error } = await supabase
        .from("finance_subscriptions")
        .insert({
          user_id: user.id,
          client_name: data.client_name,
          client_email: data.client_email || null,
          client_phone: data.client_phone || null,
          plan_name: data.plan_name,
          amount: parseFloat(data.amount),
          billing_cycle: data.billing_cycle,
          start_date: data.start_date,
          next_billing_date: nextBillingDate,
          notes: data.notes || null,
          status: "active"
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Assinatura criada com sucesso"
      });

      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating subscription:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a assinatura",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Assinatura</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_name">Nome do Cliente *</Label>
              <Input
                id="client_name"
                {...register("client_name")}
                placeholder="Nome completo ou empresa"
              />
              {errors.client_name && (
                <p className="text-sm text-destructive">{errors.client_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_email">Email</Label>
              <Input
                id="client_email"
                type="email"
                {...register("client_email")}
                placeholder="email@exemplo.com"
              />
              {errors.client_email && (
                <p className="text-sm text-destructive">{errors.client_email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_phone">Telefone</Label>
              <Input
                id="client_phone"
                {...register("client_phone")}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan_name">Nome do Plano *</Label>
              <Input
                id="plan_name"
                {...register("plan_name")}
                placeholder="Ex: Plano Premium"
              />
              {errors.plan_name && (
                <p className="text-sm text-destructive">{errors.plan_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register("amount")}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing_cycle">Ciclo de Cobrança *</Label>
              <Select defaultValue="monthly" onValueChange={(value) => register("billing_cycle").onChange({ target: { value } })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="semiannual">Semestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Data de Início *</Label>
              <Input
                id="start_date"
                type="date"
                {...register("start_date")}
              />
              {errors.start_date && (
                <p className="text-sm text-destructive">{errors.start_date.message}</p>
              )}
            </div>
          </div>

          {startDate && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <strong>Próxima cobrança:</strong> {format(new Date(calculateNextBillingDate()), "dd/MM/yyyy")}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Informações adicionais sobre a assinatura"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Assinatura"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
