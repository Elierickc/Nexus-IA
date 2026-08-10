import { useState } from "react";
import { Copy, ExternalLink, QrCode, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

export default function WhatsAppGenerator() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [useApiFormat, setUseApiFormat] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const formatPhoneDisplay = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4)}`;
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 9)}-${cleaned.slice(9, 13)}`;
  };

  const validatePhone = (phoneNumber: string): { valid: boolean; message?: string; cleaned: string } => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (!cleaned) {
      return { valid: false, message: "Telefone é obrigatório", cleaned: "" };
    }

    let finalPhone = cleaned;
    
    // Se não começar com 55 e tiver 10-11 dígitos (formato BR sem DDI), adicionar 55
    if (!cleaned.startsWith('55') && (cleaned.length === 10 || cleaned.length === 11)) {
      finalPhone = '55' + cleaned;
    }

    // Validar comprimento final (12-13 dígitos)
    if (finalPhone.length < 12 || finalPhone.length > 13) {
      return { 
        valid: false, 
        message: "Telefone deve ter 12-13 dígitos (ex: 55 11 91234-5678)", 
        cleaned: finalPhone 
      };
    }

    return { valid: true, cleaned: finalPhone };
  };

  const generateLink = () => {
    setIsGenerating(true);

    // Validar telefone
    const validation = validatePhone(phone);
    if (!validation.valid) {
      toast({
        title: "Telefone inválido",
        description: validation.message,
        variant: "destructive",
      });
      setIsGenerating(false);
      return;
    }

    // Validar mensagem
    if (!message.trim()) {
      toast({
        title: "Mensagem inválida",
        description: "Por favor, digite uma mensagem",
        variant: "destructive",
      });
      setIsGenerating(false);
      return;
    }

    // Gerar link
    const encodedMessage = encodeURIComponent(message.trim());
    let link = "";

    if (useApiFormat) {
      link = `https://api.whatsapp.com/send?phone=${validation.cleaned}&text=${encodedMessage}`;
    } else {
      link = `https://wa.me/${validation.cleaned}?text=${encodedMessage}`;
    }

    setGeneratedLink(link);
    setIsGenerating(false);

    toast({
      title: "Link gerado!",
      description: "Seu link do WhatsApp está pronto",
    });
  };

  const copyLink = () => {
    if (!generatedLink) return;
    
    navigator.clipboard.writeText(generatedLink);
    toast({
      title: "Link copiado!",
      description: "O link foi copiado para a área de transferência",
    });
  };

  const openLink = () => {
    if (!generatedLink) return;
    window.open(generatedLink, '_blank');
  };

  const generateQRCode = () => {
    toast({
      title: "Em breve",
      description: "Funcionalidade de QR Code será adicionada em breve",
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Gerador de Link do WhatsApp</h1>
          <p className="text-muted-foreground">
            Crie links personalizados do WhatsApp para enviar mensagens diretas aos seus clientes
          </p>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle>Criar novo link</CardTitle>
            <CardDescription>
              Preencha os campos abaixo para gerar seu link do WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Phone Input */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone (com DDI e DDD)
              </Label>
              <Input
                id="phone"
                type="text"
                placeholder="55 11 91234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-lg h-12"
              />
              <p className="text-sm text-muted-foreground">
                Digite com DDI (55 para Brasil) + DDD + número
              </p>
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <Label htmlFor="message" className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Mensagem
              </Label>
              <Textarea
                id="message"
                placeholder="Digite sua mensagem aqui..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[120px] text-base"
              />
              <p className="text-sm text-muted-foreground text-right">
                {message.length} caracteres
              </p>
            </div>

            {/* Format Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="format-toggle" className="text-base">
                  Formato do link
                </Label>
                <p className="text-sm text-muted-foreground">
                  {useApiFormat ? "api.whatsapp.com/send" : "wa.me (recomendado)"}
                </p>
              </div>
              <Switch
                id="format-toggle"
                checked={useApiFormat}
                onCheckedChange={setUseApiFormat}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={generateLink} 
                disabled={isGenerating}
                size="lg"
                className="flex-1 min-w-[200px]"
              >
                {isGenerating ? "Gerando..." : "Gerar Link"}
              </Button>
            </div>

            {/* Generated Link */}
            {generatedLink && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-base">Link gerado</Label>
                  <div className="p-4 bg-muted rounded-lg break-all text-sm font-mono">
                    {generatedLink}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={copyLink} variant="outline" size="lg">
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Link
                    </Button>
                    <Button onClick={openLink} variant="outline" size="lg">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir
                    </Button>
                    <Button onClick={generateQRCode} variant="outline" size="lg">
                      <QrCode className="h-4 w-4 mr-2" />
                      Gerar QR Code
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Example Section */}
        <Card>
          <CardHeader>
            <CardTitle>Exemplo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Telefone:</p>
              <p className="text-sm text-muted-foreground font-mono">55 11 91234-5678</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Mensagem:</p>
              <p className="text-sm text-muted-foreground">Olá! Gostaria de saber mais sobre seus serviços.</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Link gerado:</p>
              <p className="text-sm text-muted-foreground font-mono break-all">
                https://wa.me/5511912345678?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20seus%20servi%C3%A7os.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* How to Use */}
        <Card>
          <CardHeader>
            <CardTitle>Como usar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Digite o número de telefone completo com DDI e DDD (ex: 55 11 91234-5678)</li>
              <li>Escreva a mensagem que deseja enviar</li>
              <li>Escolha o formato do link (wa.me é recomendado)</li>
              <li>Clique em "Gerar Link" para criar o link</li>
              <li>Copie o link ou abra diretamente no WhatsApp</li>
            </ol>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Dúvidas frequentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium text-sm mb-1">Qual a diferença entre os formatos?</p>
              <p className="text-sm text-muted-foreground">
                O formato <code className="bg-muted px-1 rounded">wa.me</code> é mais curto e recomendado. 
                O formato <code className="bg-muted px-1 rounded">api.whatsapp.com</code> é uma alternativa 
                que funciona da mesma forma.
              </p>
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Preciso adicionar o DDI?</p>
              <p className="text-sm text-muted-foreground">
                Sim, sempre adicione o DDI do país (55 para Brasil). Se você digitar apenas DDD + número, 
                o sistema automaticamente adiciona o 55.
              </p>
            </div>
            <div>
              <p className="font-medium text-sm mb-1">O link funciona em qualquer dispositivo?</p>
              <p className="text-sm text-muted-foreground">
                Sim! O link abre o WhatsApp automaticamente em desktop e mobile.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
