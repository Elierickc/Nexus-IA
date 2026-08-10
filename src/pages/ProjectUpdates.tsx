import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, Copy } from "lucide-react";

const ProjectUpdates = () => {
  const { user } = useAuth();
  const [initialPrompt, setInitialPrompt] = useState("");
  const [updateType, setUpdateType] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const updateTypes = [
    { value: "new-feature", label: "Nova Funcionalidade" },
    { value: "ui-change", label: "Alteração de Interface" },
    { value: "bug-fix", label: "Correção de Bug" },
    { value: "performance", label: "Melhoria de Performance" },
    { value: "integration", label: "Nova Integração" },
    { value: "refactoring", label: "Refatoração de Código" },
    { value: "security", label: "Melhoria de Segurança" },
    { value: "database", label: "Alteração no Banco de Dados" },
  ];

  const handleGeneratePrompt = async () => {
    if (!user) {
      toast.error("Você precisa estar autenticado");
      return;
    }

    if (!initialPrompt.trim()) {
      toast.error("Por favor, cole o prompt inicial do projeto");
      return;
    }

    if (!updateType) {
      toast.error("Por favor, selecione o tipo de atualização");
      return;
    }

    setIsGenerating(true);

    try {
      // Refresh plan before checking
      const { data: planData, error: planError } = await supabase
        .from("user_credits")
        .select("plan")
        .eq("user_id", user.id)
        .single();

      if (planError) throw planError;

      const currentPlan = planData?.plan;

      if (!currentPlan || (currentPlan !== "pro" && currentPlan !== "enterprise")) {
        setIsGenerating(false);
        toast.error("Assinatura necessária", {
          description: "Você precisa de uma assinatura para usar esta funcionalidade.",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-update-prompt", {
        body: {
          initialPrompt,
          updateType,
        },
      });

      if (error) throw error;

      if (data.prompt) {
        setGeneratedPrompt(data.prompt);
        toast.success("Prompt de atualização gerado com sucesso!");
      }
    } catch (error: any) {
      console.error("Error generating update prompt:", error);
      toast.error("Erro ao gerar prompt de atualização", {
        description: error.message || "Tente novamente em alguns instantes.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    toast.success("Prompt copiado para a área de transferência!");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Atualizações de Projetos</h1>
          <p className="text-muted-foreground">
            Estruture as alterações do seu projeto para gerar um prompt claro para a IA.
          </p>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>1. Prompt Inicial do Projeto</CardTitle>
            <CardDescription>
              Cole o prompt que você usou para criar a versão atual do seu projeto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Cole o prompt mestre gerado pelo assistente ou o seu prompt inicial..."
              value={initialPrompt}
              onChange={(e) => setInitialPrompt(e.target.value)}
              className="min-h-[200px] resize-y"
            />
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>2. Tipo de Atualização</CardTitle>
            <CardDescription>
              Selecione a categoria principal da alteração que você deseja fazer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={updateType} onValueChange={setUpdateType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de atualização..." />
              </SelectTrigger>
              <SelectContent>
                {updateTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {generatedPrompt && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-primary">Prompt de Atualização Gerado</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
              </div>
              <CardDescription>
                Use este prompt otimizado para instruir a IA sobre as alterações desejadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-background/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                {generatedPrompt}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center">
          <Button
            onClick={handleGeneratePrompt}
            disabled={isGenerating || !initialPrompt.trim() || !updateType}
            size="lg"
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Sparkles className="h-5 w-5" />
            {isGenerating ? "Gerando..." : "Gerar Prompt de Atualização"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectUpdates;
