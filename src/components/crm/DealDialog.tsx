import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const dealSchema = z.object({
  title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
  value: z.number().min(0, "Valor deve ser maior que zero"),
  stage: z.string(),
  probability: z.number().min(0).max(100),
  close_date: z.string().optional(),
  contact_id: z.string().optional(),
  account_id: z.string().optional(),
  notes: z.string().optional(),
  currency: z.string().default("BRL"),
});

type DealFormData = z.infer<typeof dealSchema>;

interface DealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: any;
  defaultStage?: string;
  onSaved: () => void;
}

export function DealDialog({ open, onOpenChange, deal, defaultStage, onSaved }: DealDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      stage: defaultStage || "prospect",
      probability: 50,
      currency: "BRL",
    },
  });

  useEffect(() => {
    loadContacts();
    loadAccounts();
  }, []);

  useEffect(() => {
    if (deal) {
      setValue("title", deal.title);
      setValue("value", deal.value);
      setValue("stage", deal.stage);
      setValue("probability", deal.probability);
      setValue("close_date", deal.close_date || "");
      setValue("contact_id", deal.contact_id || "");
      setValue("account_id", deal.account_id || "");
      setValue("notes", deal.notes || "");
      setValue("currency", deal.currency || "BRL");
    } else {
      reset({
        stage: defaultStage || "prospect",
        probability: 50,
        currency: "BRL",
      });
    }
  }, [deal, defaultStage, setValue, reset]);

  const loadContacts = async () => {
    const { data } = await supabase
      .from("crm_contacts")
      .select("id, first_name, last_name")
      .order("first_name");
    setContacts(data || []);
  };

  const loadAccounts = async () => {
    const { data } = await supabase
      .from("crm_accounts")
      .select("id, name")
      .order("name");
    setAccounts(data || []);
  };

  const onSubmit = async (data: DealFormData) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const dealData: any = {
        title: data.title,
        value: data.value,
        stage: data.stage,
        probability: data.probability,
        currency: data.currency,
        owner_id: user.id,
        contact_id: data.contact_id || null,
        account_id: data.account_id || null,
        close_date: data.close_date || null,
        notes: data.notes || null,
        status: data.stage === "closed_won" ? "won" : data.stage === "closed_lost" ? "lost" : "open",
      };

      if (deal) {
        const { error } = await supabase
          .from("crm_deals")
          .update(dealData)
          .eq("id", deal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("crm_deals")
          .insert([dealData]);
        if (error) throw error;
      }

      toast({
        title: deal ? "Oportunidade atualizada" : "Oportunidade criada",
        description: deal ? "A oportunidade foi atualizada com sucesso" : "Nova oportunidade adicionada ao pipeline",
      });

      onSaved();
    } catch (error) {
      console.error("Erro ao salvar deal:", error);
      toast({
        title: "Erro ao salvar oportunidade",
        description: "Não foi possível salvar a oportunidade",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deal ? "Editar Oportunidade" : "Nova Oportunidade"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="Ex: Venda de sistema CRM para Empresa X"
              />
              {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <Label htmlFor="value">Valor *</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                {...register("value", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.value && <p className="text-sm text-destructive mt-1">{errors.value.message}</p>}
            </div>

            <div>
              <Label htmlFor="currency">Moeda</Label>
              <Select value={watch("currency")} onValueChange={(value) => setValue("currency", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL - Real</SelectItem>
                  <SelectItem value="USD">USD - Dólar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="stage">Etapa *</Label>
              <Select value={watch("stage")} onValueChange={(value) => setValue("stage", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">Prospecção</SelectItem>
                  <SelectItem value="qualified">Qualificado</SelectItem>
                  <SelectItem value="proposal">Proposta</SelectItem>
                  <SelectItem value="negotiation">Negociação</SelectItem>
                  <SelectItem value="closed_won">Fechado (Ganho)</SelectItem>
                  <SelectItem value="closed_lost">Fechado (Perdido)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="probability">Probabilidade (%)</Label>
              <Input
                id="probability"
                type="number"
                min="0"
                max="100"
                {...register("probability", { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="close_date">Data de Fechamento Prevista</Label>
              <Input id="close_date" type="date" {...register("close_date")} />
            </div>

            <div>
              <Label htmlFor="contact_id">Contato</Label>
              <Select value={watch("contact_id")} onValueChange={(value) => setValue("contact_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um contato" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="account_id">Empresa</Label>
              <Select value={watch("account_id")} onValueChange={(value) => setValue("account_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                {...register("notes")}
                placeholder="Adicione observações sobre esta oportunidade..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deal ? "Atualizar" : "Criar"} Oportunidade
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
