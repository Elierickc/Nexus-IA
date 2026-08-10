import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  pixData: {
    paymentId?: string;
    qrData?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
    amount?: number;
    status?: string;
    expiresAt?: string;
  } | null;
  planId?: string;
}

export default function PixPaymentModal({ isOpen, onClose, pixData, planId }: PixPaymentModalProps) {
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { refreshPlan } = useAuth();

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
    if (!pixData?.paymentId || !planId) return;

    setVerifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão não encontrada");

      const { data, error } = await supabase.functions.invoke("verify-mercadopago-payment", {
        body: { paymentId: pixData.paymentId, planId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.paid) {
        toast({
          title: "Pagamento Confirmado! 🎉",
          description: "Muito obrigado! Seu plano foi atualizado com sucesso.",
          duration: 5000,
        });
        await refreshPlan();
        onClose();
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

  if (!pixData) return null;

  const formattedAmount = pixData.amount 
    ? Number(pixData.amount).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    : 'R$ 0,00';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar com Pix</DialogTitle>
          <DialogDescription>
            Escaneie o QR Code ou copie o código para pagar
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* QR Code Base64 */}
          {pixData.qrCodeBase64 ? (
            <div className="bg-white p-4 rounded-lg">
              <img 
                src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                alt="QR Code Pix" 
                className="w-64 h-64"
              />
            </div>
          ) : pixData.qrData && (
            <div className="bg-white p-4 rounded-lg">
              <div className="w-64 h-64 flex items-center justify-center">
                <div className="text-xs break-all text-center font-mono p-2">
                  {pixData.qrData}
                </div>
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Valor</p>
            <p className="text-2xl font-bold">{formattedAmount}</p>
          </div>

          {/* Pix Code */}
          {pixData.qrData && (
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

          {/* Status */}
          {pixData.status && (
            <p className="text-xs text-muted-foreground">
              Status: {pixData.status}
            </p>
          )}

          {/* Instructions */}
          <div className="bg-secondary/50 p-4 rounded-lg w-full">
            <p className="text-sm font-medium mb-2">Como pagar:</p>
            <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
              <li>Abra o app do seu banco</li>
              <li>Escolha pagar com Pix QR Code</li>
              <li>Escaneie o código acima ou cole o código Pix</li>
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

          <Button onClick={onClose} variant="outline" className="w-full">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
