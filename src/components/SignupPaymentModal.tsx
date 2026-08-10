import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import PixPaymentModal from "./PixPaymentModal";
import { signupPaymentSchema } from "@/lib/validations";

interface SignupPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planName: string;
  planPrice: number;
}

export default function SignupPaymentModal({ 
  isOpen, 
  onClose, 
  planId, 
  planName, 
  planPrice 
}: SignupPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cpf: "",
    phone: "",
    password: "",
  });

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setFormData({ ...formData, cpf: formatted });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate with Zod
      const result = signupPaymentSchema.safeParse(formData);
      
      if (!result.success) {
        toast({
          title: "Dados inválidos",
          description: result.error.errors[0].message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Remove formatação do CPF e telefone
      const cpfOnlyNumbers = formData.cpf.replace(/\D/g, "");
      const phoneOnlyNumbers = formData.phone.replace(/\D/g, "");

      // Criar conta
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            display_name: formData.name,
            email: formData.email,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          toast({
            title: "Email já cadastrado",
            description: "Este email já possui uma conta. Faça login para continuar.",
            variant: "destructive",
          });
        } else {
          throw signUpError;
        }
        return;
      }

      if (!signUpData.user) {
        throw new Error("Erro ao criar conta");
      }

      // Atualizar perfil com CPF e telefone
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          cpf: cpfOnlyNumbers,
          cellphone: phoneOnlyNumbers,
          display_name: formData.name,
          tax_id: cpfOnlyNumbers 
        })
        .eq("user_id", signUpData.user.id);

      if (updateError) {
        console.error("Error updating profile:", updateError);
      }

      // Aguardar um momento para garantir que o perfil foi atualizado
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Obter nova sessão
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Erro ao criar sessão");
      }

      // Gerar QR Code com Mercado Pago
      const { data: pixResponse, error: pixError } = await supabase.functions.invoke("create-mercadopago-payment", {
        body: { 
          planId,
          planName,
          planPrice,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (pixError) throw pixError;

      if (pixResponse) {
        setPixData(pixResponse);
        setPixModalOpen(true);
        onClose(); // Fechar modal de cadastro
        
        toast({
          title: "Conta criada com sucesso! 🎉",
          description: "Complete o pagamento para ativar seu plano.",
        });
      }
    } catch (error: any) {
      console.error("Error in signup/payment:", error);
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao processar sua solicitação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Conta e Comprar</DialogTitle>
            <DialogDescription>
              Preencha seus dados para criar sua conta e gerar o QR Code de pagamento
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                type="text"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={handleCPFChange}
                maxLength={14}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={formData.phone}
                onChange={handlePhoneChange}
                maxLength={15}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Criar e Pagar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PixPaymentModal 
        isOpen={pixModalOpen}
        onClose={() => setPixModalOpen(false)}
        pixData={pixData}
        planId={planId}
      />
    </>
  );
}