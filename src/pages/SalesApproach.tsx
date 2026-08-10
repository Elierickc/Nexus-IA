import { useState } from "react";
import { Sparkles, Copy, Download, RefreshCw, MessageSquare, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

export default function SalesApproach() {
  const [formData, setFormData] = useState({
    companyName: "",
    businessType: "",
    pain: "",
    solution: "",
    productName: "",
    targetPerson: "",
  });
  const [generatedApproach, setGeneratedApproach] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    // Validação
    if (!formData.companyName || !formData.businessType || !formData.pain || !formData.solution) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha pelo menos empresa, tipo de negócio, dor e solução",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-sales-approach", {
        body: formData,
      });

      if (error) {
        if (error.message.includes("429") || error.message.includes("limite")) {
          toast({
            title: "Limite de requisições",
            description: "Aguarde alguns instantes e tente novamente",
            variant: "destructive",
          });
        } else if (error.message.includes("402") || error.message.includes("créditos")) {
          toast({
            title: "Créditos insuficientes",
            description: "Adicione créditos no workspace do Lovable AI",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      setGeneratedApproach(data.approach);
      toast({
        title: "Abordagem gerada!",
        description: "Sua sequência de vendas foi criada com sucesso",
      });
    } catch (error) {
      console.error("Erro ao gerar abordagem:", error);
      toast({
        title: "Erro ao gerar abordagem",
        description: "Não foi possível gerar a abordagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedApproach);
    toast({
      title: "Copiado!",
      description: "A abordagem foi copiada para a área de transferência",
    });
  };

  const handleDownload = () => {
    const blob = new Blob([generatedApproach], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `abordagem-vendas-${formData.companyName || "empresa"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download iniciado",
      description: "O arquivo foi baixado com sucesso",
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Gerador de Abordagem de Vendas</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Crie sequências completas de mensagens com IA para prospectar e fechar vendas
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Prospecto</CardTitle>
              <CardDescription>
                Preencha os dados para gerar uma abordagem personalizada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="companyName">Nome da Empresa *</Label>
                <Input
                  id="companyName"
                  placeholder="Ex: Restaurante Sabor Brasil"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="businessType">Tipo de Negócio *</Label>
                <Input
                  id="businessType"
                  placeholder="Ex: Restaurante, E-commerce, Consultoria"
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="pain">Dor/Problema do Cliente *</Label>
                <Textarea
                  id="pain"
                  placeholder="Ex: Perdem pedidos por não ter sistema de delivery integrado"
                  value={formData.pain}
                  onChange={(e) => setFormData({ ...formData, pain: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="solution">Nossa Solução *</Label>
                <Textarea
                  id="solution"
                  placeholder="Ex: App de delivery personalizado com gestão completa de pedidos"
                  value={formData.solution}
                  onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="productName">Nome do Produto/Serviço</Label>
                <Input
                  id="productName"
                  placeholder="Ex: DeliveryPro, Sistema CRM, Consultoria Premium"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="targetPerson">Pessoa de Contato</Label>
                <Input
                  id="targetPerson"
                  placeholder="Ex: João Silva, Gerente de Vendas"
                  value={formData.targetPerson}
                  onChange={(e) => setFormData({ ...formData, targetPerson: e.target.value })}
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Gerando Abordagem...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Gerar Abordagem com IA
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Output */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Abordagem Gerada</CardTitle>
                  <CardDescription>
                    Sequência completa de mensagens para cada etapa da venda
                  </CardDescription>
                </div>
                {generatedApproach && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={handleCopy}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleDownload}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!generatedApproach ? (
                <div className="flex flex-col items-center justify-center h-[500px] text-center space-y-4">
                  <div className="relative">
                    <MessageSquare className="h-16 w-16 text-muted-foreground" />
                    <BarChart3 className="h-6 w-6 text-primary absolute -top-1 -right-1" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-muted-foreground">
                      Preencha o formulário e clique em gerar
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      A IA criará mensagens personalizadas com análise de sentimento
                    </p>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="bg-muted/30 p-4 rounded-lg max-h-[500px] overflow-y-auto">
                    <ReactMarkdown
                      components={{
                        h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2 text-foreground" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-2 text-foreground" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-base font-semibold mt-2 mb-1 text-foreground" {...props} />,
                        p: ({ node, ...props }) => {
                          const content = props.children?.toString() || '';
                          // Detectar análise de tom
                          if (content.includes('📊') || content.includes('Análise de Tom')) {
                            return <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 my-2"><p className="mb-0 text-foreground" {...props} /></div>;
                          }
                          // Detectar sugestões
                          if (content.includes('💡') || content.includes('Sugestões')) {
                            return <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 my-2"><p className="mb-0 text-foreground" {...props} /></div>;
                          }
                          return <p className="mb-2 text-foreground" {...props} />;
                        },
                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 text-foreground" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 text-foreground" {...props} />,
                        li: ({ node, ...props }) => <li className="mb-1 text-foreground" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                        em: ({ node, ...props }) => <em className="italic text-foreground" {...props} />,
                        code: ({ node, ...props }) => <code className="bg-muted px-1 rounded text-foreground" {...props} />,
                        blockquote: ({ node, ...props }) => (
                          <blockquote className="border-l-4 border-primary pl-4 italic my-2 text-muted-foreground" {...props} />
                        ),
                      }}
                    >
                      {generatedApproach}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Como Usar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    1
                  </div>
                  <h3 className="font-semibold">Preencha os Dados</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Insira informações sobre a empresa, dor do cliente e sua solução
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    2
                  </div>
                  <h3 className="font-semibold">Gere a Abordagem</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  A IA cria mensagens personalizadas para cada etapa do funil de vendas
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">
                    3
                  </div>
                  <h3 className="font-semibold">Use e Adapte</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Copie, edite e use as mensagens em suas prospecções do WhatsApp
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sentiment Analysis Info */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Análise de Sentimento</CardTitle>
            </div>
            <CardDescription>
              Cada mensagem é analisada para garantir o tom adequado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-500/10 text-blue-500 rounded-full w-10 h-10 flex items-center justify-center font-bold">
                    📊
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Tom da Mensagem</h4>
                    <p className="text-xs text-muted-foreground">
                      Profissional, Casual, Urgente
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="bg-purple-500/10 text-purple-500 rounded-full w-10 h-10 flex items-center justify-center font-bold">
                    📈
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Níveis Medidos</h4>
                    <p className="text-xs text-muted-foreground">
                      Formalidade e Urgência (1-5)
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="bg-amber-500/10 text-amber-500 rounded-full w-10 h-10 flex items-center justify-center font-bold">
                    💡
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Sugestões de Ajuste</h4>
                    <p className="text-xs text-muted-foreground">
                      Recomendações para melhorar
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
