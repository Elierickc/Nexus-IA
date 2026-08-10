import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface PixCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planName: string;
  planPrice: number;
}

type Step = "form" | "qrcode";

export default function PixCheckoutModal({ 
  isOpen, 
  onClose, 
  planId, 
  planName, 
  planPrice 
}: PixCheckoutModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
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
    setFormData({ ...formData, cpf: formatCPF(e.target.value) });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, phone: formatPhone(e.target.value) });
  };

  const handleGenerateQRCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Basic validation
      if (!formData.name || formData.name.trim().length < 3) {
        throw new Error("Nome completo é obrigatório");
      }
      if (!formData.email || !formData.email.includes("@")) {
        throw new Error("Email válido é obrigatório");
      }
      if (formData.cpf.replace(/\D/g, "").length !== 11) {
        throw new Error("CPF inválido");
      }
      if (formData.phone.replace(/\D/g, "").length < 10) {
        throw new Error("Telefone inválido");
      }
      if (!formData.password || formData.password.length < 6) {
        throw new Error("Senha deve ter no mínimo 6 caracteres");
      }

      const { data, error } = await supabase.functions.invoke("create-pix-payment", {
        body: { 
          planId,
          planName,
          planPrice,
          email: formData.email,
          name: formData.name,
          cpf: formData.cpf,
          phone: formData.phone,
          password: formData.password,
        },
      });

      if (error) throw error;
      
      if (data) {
        setPixData(data);
        setStep("qrcode");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao gerar o QR Code.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (pixData?.qrData) {
      await navigator.clipboard.writeText(pixData.qrData);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Cole no app do seu banco para pagar",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerifyPayment = async () => {
    if (!pixData?.paymentId) return;

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-pix-payment", {
        body: { paymentId: pixData.paymentId },
      });

      if (error) throw error;

      if (data.paid) {
        toast({
          title: "Pagamento Confirmado! 🎉",
          description: data.userCreated 
            ? "Sua conta foi criada! Faça login para acessar."
            : "Seu plano foi atualizado com sucesso.",
          duration: 5000,
        });
        onClose();
        navigate("/auth");
      } else {
        toast({
          title: "Pagamento Pendente",
          description: data.message || "Aguarde alguns instantes e tente novamente.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      toast({
        title: "Erro ao verificar pagamento",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleClose = () => {
    setStep("form");
    setPixData(null);
    setFormData({ name: "", email: "", cpf: "", phone: "", password: "" });
    onClose();
  };

  const formattedAmount = planPrice 
    ? (planPrice / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    : 'R$ 0,00';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Pagar com Pix - {planName}</DialogTitle>
              <DialogDescription>
                Preencha seus dados para gerar o QR Code de pagamento
              </DialogDescription>
            </DialogHeader>

            <div className="text-center py-2">
              <span className="text-2xl font-bold text-primary">{formattedAmount}</span>
            </div>

            <form onSubmit={handleGenerateQRCode} className="space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha para sua conta</Label>
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
                <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    "Gerar QR Code"
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Pagar com Pix</DialogTitle>
              <DialogDescription>
                Escaneie o QR Code ou copie o código para pagar
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-4">
              {pixData?.qrCodeBase64 ? (
                <div className="bg-white p-4 rounded-lg">
                  <img 
                    src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                    alt="QR Code Pix" 
                    className="w-56 h-56"
                  />
                </div>
              ) : pixData?.qrData && (
                <div className="bg-white p-4 rounded-lg">
                  <div className="w-56 h-56 flex items-center justify-center">
                    <div className="text-xs break-all text-center font-mono p-2">
                      {pixData.qrData}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center">
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className="text-2xl font-bold">{formattedAmount}</p>
              </div>

              {pixData?.qrData && (
                <div className="w-full">
                  <p className="text-sm text-muted-foreground mb-2">Código Pix</p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-secondary p-3 rounded-md overflow-hidden">
                      <p className="text-xs font-mono truncate">{pixData.qrData}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyCode}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-secondary/50 p-4 rounded-lg w-full">
                <p className="text-sm font-medium mb-2">Como pagar:</p>
                <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Abra o app do seu banco</li>
                  <li>Escolha pagar com Pix QR Code</li>
                  <li>Escaneie o código ou cole o código Pix</li>
                  <li>Confirme o pagamento</li>
                </ol>
              </div>

              <Button 
                onClick={handleVerifyPayment} 
                className="w-full"
                disabled={verifying}
              >
                {verifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Já realizei o pagamento"
                )}
              </Button>

              <Button onClick={handleClose} variant="outline" className="w-full">
                Cancelar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
