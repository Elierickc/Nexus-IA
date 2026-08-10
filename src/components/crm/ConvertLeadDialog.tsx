import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { contactSchema, type ContactInput, emailSchema, phoneSchema } from "@/lib/validations";

type ContactFormData = ContactInput;

interface Email {
  email: string;
  primary: boolean;
}

interface Phone {
  number: string;
  type: string;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface ConvertLeadDialogProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ConvertLeadDialog = ({ leadId, isOpen, onClose, onSuccess }: ConvertLeadDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const [emails, setEmails] = useState<Email[]>([{ email: "", primary: true }]);
  const [phones, setPhones] = useState<Phone[]>([{ number: "", type: "mobile" }]);
  const [address, setAddress] = useState<Address>({ street: "", city: "", state: "", zip: "" });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  useEffect(() => {
    if (leadId && isOpen) {
      loadLead();
    }
  }, [leadId, isOpen]);

  const loadLead = async () => {
    if (!leadId || !user) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from("crm_leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar lead",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Pre-fill form with lead data
    const nameParts = data.name.split(" ");
    setValue("first_name", nameParts[0]);
    setValue("last_name", nameParts.slice(1).join(" ") || "");
    setValue("notes", data.notes || "");

    if (data.email) {
      setEmails([{ email: data.email, primary: true }]);
    }

    if (data.phone) {
      setPhones([{ number: data.phone, type: "mobile" }]);
    }

    // Try to parse address from notes if available
    if (data.notes?.includes("Endereço:")) {
      const addressMatch = data.notes.match(/Endereço:\s*([^|]+)/);
      if (addressMatch) {
        setAddress({ ...address, street: addressMatch[1].trim() });
      }
    }

    setIsLoading(false);
  };

  const onSubmit = async (data: ContactFormData) => {
    if (!user || !leadId) {
      toast({
        title: "Erro",
        description: "Dados insuficientes para conversão",
        variant: "destructive",
      });
      return;
    }

    // Validate emails
    const validEmails = emails.filter(e => e.email);
    for (const email of validEmails) {
      const result = emailSchema.safeParse(email);
      if (!result.success) {
        toast({
          title: "Email inválido",
          description: result.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    // Validate phones
    const validPhones = phones.filter(p => p.number);
    for (const phone of validPhones) {
      const result = phoneSchema.safeParse(phone);
      if (!result.success) {
        toast({
          title: "Telefone inválido",
          description: result.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    if (validEmails.length === 0) {
      toast({
        title: "Email obrigatório",
        description: "Pelo menos um email válido é necessário",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const tags = data.tags
      ? data.tags.split(",").map(tag => tag.trim()).filter(tag => tag)
      : [];

    const contactData: any = {
      first_name: data.first_name,
      last_name: data.last_name || null,
      position: data.position || null,
      emails: validEmails,
      phones: validPhones,
      address: address.street || address.city ? address : null,
      notes: data.notes || null,
      tags,
      owner_id: user.id,
    };

    // Insert contact
    const { data: newContact, error: contactError } = await supabase
      .from("crm_contacts")
      .insert(contactData)
      .select()
      .single();

    if (contactError) {
      toast({
        title: "Erro",
        description: "Erro ao criar contato: " + contactError.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Update lead with converted_contact_id
    const { error: leadError } = await supabase
      .from("crm_leads")
      .update({ 
        converted_contact_id: newContact.id,
        status: "qualified"
      })
      .eq("id", leadId);

    if (leadError) {
      console.error("Error updating lead:", leadError);
    }

    toast({
      title: "Sucesso!",
      description: "Lead convertido em contato com sucesso",
    });

    setIsLoading(false);
    reset();
    onSuccess();
    onClose();
  };

  const addEmail = () => {
    setEmails([...emails, { email: "", primary: false }]);
  };

  const removeEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, field: keyof Email, value: string | boolean) => {
    const updated = [...emails];
    updated[index] = { ...updated[index], [field]: value };
    setEmails(updated);
  };

  const addPhone = () => {
    setPhones([...phones, { number: "", type: "mobile" }]);
  };

  const removePhone = (index: number) => {
    setPhones(phones.filter((_, i) => i !== index));
  };

  const updatePhone = (index: number, field: keyof Phone, value: string) => {
    const updated = [...phones];
    updated[index] = { ...updated[index], [field]: value };
    setPhones(updated);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Converter Lead em Contato</DialogTitle>
          <DialogDescription>
            Complete as informações para criar um contato completo no CRM
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações Básicas</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nome *</Label>
                <Input
                  id="first_name"
                  {...register("first_name")}
                  placeholder="João"
                />
                {errors.first_name && (
                  <p className="text-sm text-destructive">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Sobrenome</Label>
                <Input
                  id="last_name"
                  {...register("last_name")}
                  placeholder="Silva"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Cargo</Label>
              <Input
                id="position"
                {...register("position")}
                placeholder="Gerente de Vendas"
              />
            </div>
          </div>

          {/* Emails */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Emails</h3>
              <Button type="button" variant="outline" size="sm" onClick={addEmail}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Email
              </Button>
            </div>
            
            {emails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="email@exemplo.com"
                  value={email.email}
                  onChange={(e) => updateEmail(index, "email", e.target.value)}
                  className="flex-1"
                />
                <Select
                  value={email.primary ? "primary" : "secondary"}
                  onValueChange={(value) => updateEmail(index, "primary", value === "primary")}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Principal</SelectItem>
                    <SelectItem value="secondary">Secundário</SelectItem>
                  </SelectContent>
                </Select>
                {emails.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEmail(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Telefones */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Telefones</h3>
              <Button type="button" variant="outline" size="sm" onClick={addPhone}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Telefone
              </Button>
            </div>
            
            {phones.map((phone, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="+55 11 99999-9999"
                  value={phone.number}
                  onChange={(e) => updatePhone(index, "number", e.target.value)}
                  className="flex-1"
                />
                <Select
                  value={phone.type}
                  onValueChange={(value) => updatePhone(index, "type", value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile">Celular</SelectItem>
                    <SelectItem value="work">Trabalho</SelectItem>
                    <SelectItem value="home">Residencial</SelectItem>
                  </SelectContent>
                </Select>
                {phones.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePhone(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Endereço</h3>
            
            <div className="space-y-2">
              <Label htmlFor="street">Rua</Label>
              <Input
                id="street"
                value={address.street}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                placeholder="Rua Exemplo, 123"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  placeholder="São Paulo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip">CEP</Label>
                <Input
                  id="zip"
                  value={address.zip}
                  onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                  placeholder="00000-000"
                />
              </div>
            </div>
          </div>

          {/* Tags e Notas */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input
                id="tags"
                {...register("tags")}
                placeholder="cliente, vip, interessado"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                {...register("notes")}
                placeholder="Observações sobre o contato..."
                rows={4}
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Convertendo...
                </>
              ) : (
                "Converter em Contato"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ConvertLeadDialog;
