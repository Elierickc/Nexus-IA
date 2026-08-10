import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Globe, Copy, Wand2, ExternalLink, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function LPBuilder() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const userName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Empreendedor";
  const [formData, setFormData] = useState({
    tipoOferta: "",
    nomeProduto: "",
    descricaoProduto: "",
    publicoAlvo: "",
    beneficiosPrincipais: "",
    preco: "",
    garantia: "",
    depoimentos: "",
    chamadaAcao: "",
    corPrincipal: "",
    estiloVisual: "",
  });

  const gerarPromptLP = async () => {
    const prompt = `
Crie uma landing page moderna e persuasiva com as seguintes características:

# Produto/Serviço
**Nome:** ${formData.nomeProduto}
**Tipo:** ${formData.tipoOferta}
**Descrição:** ${formData.descricaoProduto}

# Público-Alvo
${formData.publicoAlvo}

# Benefícios Principais
${formData.beneficiosPrincipais}

# Oferta
**Preço:** ${formData.preco}
**Garantia:** ${formData.garantia}

# Depoimentos
${formData.depoimentos}

# Chamada para Ação
${formData.chamadaAcao}

# Design
**Cor Principal:** ${formData.corPrincipal}
**Estilo Visual:** ${formData.estiloVisual}

---

A landing page deve incluir:
- Hero section impactante
- Seção de benefícios com ícones
- Área de depoimentos
- Seção de garantia
- CTA destacado
- Footer com informações de contato

Use design moderno, responsivo e otimizado para conversão.
    `.trim();

    setGeneratedPrompt(prompt);

    // Save to database if user is authenticated
    if (user) {
      await supabase.from("landing_pages").insert({
        user_id: user.id,
        title: formData.nomeProduto,
        prompt: prompt,
      });
    }

    toast({
      title: "Prompt gerado!",
      description: "Copie e use no Lovable para criar sua landing page",
    });
  };

  const copiarPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt);
    toast({
      title: "Copiado!",
      description: "Prompt copiado para a área de transferência",
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold">
          Boa noite, <span className="gradient-text">{userName}!</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          Gerador de Landing Pages de Alta Conversão
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="step-number">1</div>
            <Card className="glass-card flex-1">
              <CardContent className="pt-6 space-y-4">
                <Label className="text-base font-semibold">Tipo de Oferta</Label>
                <RadioGroup
                  value={formData.tipoOferta}
                  onValueChange={(value) => setFormData({ ...formData, tipoOferta: value })}
                  className="grid grid-cols-2 gap-3"
                >
                  <Label
                    htmlFor="produto-digital"
                    className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.tipoOferta === 'produto-digital' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="produto-digital" id="produto-digital" className="sr-only" />
                    <span>Produto Digital</span>
                  </Label>
                  <Label
                    htmlFor="servico"
                    className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.tipoOferta === 'servico' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="servico" id="servico" className="sr-only" />
                    <span>Serviço</span>
                  </Label>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {[
            { step: 2, label: "Nome do Produto/Serviço", id: "nomeProduto", type: "input", placeholder: "Ex: Curso de Marketing Digital" },
            { step: 3, label: "Descrição", id: "descricaoProduto", type: "textarea", placeholder: "Descreva o produto/serviço..." },
            { step: 4, label: "Público-Alvo", id: "publicoAlvo", type: "textarea", placeholder: "Quem é o público ideal..." },
            { step: 5, label: "Benefícios Principais", id: "beneficiosPrincipais", type: "textarea", placeholder: "Liste os principais benefícios..." },
            { step: 6, label: "Preço", id: "preco", type: "input", placeholder: "Ex: R$ 497,00" },
            { step: 7, label: "Garantia", id: "garantia", type: "input", placeholder: "Ex: 30 dias de garantia" },
            { step: 8, label: "Depoimentos", id: "depoimentos", type: "textarea", placeholder: "Cole alguns depoimentos de clientes..." },
            { step: 9, label: "Chamada para Ação", id: "chamadaAcao", type: "input", placeholder: "Ex: Quero começar agora" },
            { step: 10, label: "Cor Principal", id: "corPrincipal", type: "input", placeholder: "Ex: Azul, Verde, Laranja..." },
            { step: 11, label: "Estilo Visual", id: "estiloVisual", type: "input", placeholder: "Ex: Moderno, Minimalista, Corporativo..." },
          ].map((field) => (
            <div key={field.step} className="flex gap-4">
              <div className="step-number">{field.step}</div>
              <Card className="glass-card flex-1">
                <CardContent className="pt-6 space-y-3">
                  <Label htmlFor={field.id} className="text-base font-semibold">
                    {field.label}
                  </Label>
                  {field.type === "input" ? (
                    <Input
                      id={field.id}
                      placeholder={field.placeholder}
                      value={formData[field.id as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                      className="bg-muted border-border"
                    />
                  ) : (
                    <Textarea
                      id={field.id}
                      placeholder={field.placeholder}
                      value={formData[field.id as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                      className="min-h-24 bg-muted border-border"
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          ))}

          <div className="flex justify-center pt-4">
            <Button onClick={gerarPromptLP} size="lg" className="bg-primary hover:bg-primary/90 px-12">
              <Wand2 className="mr-2 h-5 w-5" />
              Gerar Prompt da Landing Page
            </Button>
          </div>
        </div>

        <div className="lg:sticky lg:top-20 h-fit">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Prompt Gerado
                </span>
                {generatedPrompt && (
                  <Button size="sm" variant="outline" onClick={copiarPrompt}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedPrompt ? (
                <>
                  <div className="bg-muted/50 p-6 rounded-lg border border-border max-h-[600px] overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap leading-relaxed">{generatedPrompt}</pre>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">Próximo passo: criar sua Landing Page no Lovable</p>
                        <p className="text-xs text-muted-foreground">
                          Copie o prompt acima, acesse o Lovable e cole no chat para gerar sua landing page automaticamente.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => window.open('https://lovable.dev/', '_blank')}
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir Lovable (lovable.dev)
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center min-h-96 text-muted-foreground text-center p-8">
                  Preencha o formulário ao lado e clique em "Gerar Prompt" para criar o prompt da sua landing page
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
