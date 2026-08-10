import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Copy, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VisualIdentityTestDialog } from "@/components/VisualIdentityTestDialog";

export default function Materializar() {
  const { toast } = useToast();
  const { user, plan, refreshPlan } = useAuth();
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMoreFonts, setShowMoreFonts] = useState(false);
  const [isSuggestingFeatures, setIsSuggestingFeatures] = useState(false);
  const [complementaryFeatures, setComplementaryFeatures] = useState<string[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{title: string, description: string}>>([]);
  const [showVisualTest, setShowVisualTest] = useState(false);
  const [formData, setFormData] = useState({
    funcaoPrincipal: "",
    nomeProjeto: "",
    publicoAlvo: "",
    transformacao: "",
    pecaCentral: "",
    momentoMagico: "",
    menuPrincipal: "",
    funcionalidadesAdicionais: "",
    experienciaPersonalizada: "",
    identidadeVisual: "",
    paletaCores: "",
    corPrimaria: "#A974FF",
    corSecundaria: "#C0C0C0",
    fonte: "",
  });

  const userName = "Elierique";
  const greeting = "Boa noite";

  const generatePrompt = async () => {
    if (!user) {
      toast({
        title: "Autenticação necessária",
        description: "Faça login para usar esta funcionalidade.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    // Refresh plan before checking to ensure we have the latest status
    try {
      const { data: planData, error: planError } = await supabase
        .from("user_credits")
        .select("plan")
        .eq("user_id", user.id)
        .single();

      if (planError) throw planError;

      const currentPlan = planData?.plan;

      // Check subscription after fetching latest plan
      if (!currentPlan || (currentPlan !== "pro" && currentPlan !== "enterprise")) {
        setIsGenerating(false);
        toast({
          title: "Assinatura necessária",
          description: "Você precisa de uma assinatura para usar esta funcionalidade.",
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      console.error("Error checking plan:", error);
      setIsGenerating(false);
      toast({
        title: "Erro ao verificar plano",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
      return;
    }
    try {
      const featuresText = complementaryFeatures.length > 0 
        ? `\nFuncionalidades Complementares: ${complementaryFeatures.join(", ")}`
        : "";

      const { data, error } = await supabase.functions.invoke("generate-saas-prompt", {
        body: {
          projectName: formData.nomeProjeto,
          mainFunction: formData.funcaoPrincipal,
          targetAudience: formData.publicoAlvo,
          transformation: formData.transformacao,
          centerpiece: formData.pecaCentral,
          magicMoment: formData.momentoMagico,
          mainMenu: formData.menuPrincipal,
          features: formData.funcionalidadesAdicionais + featuresText,
          personalization: formData.experienciaPersonalizada,
          visualIdentity: formData.identidadeVisual,
          colorPalette: `${formData.paletaCores} - Cor Primária: ${formData.corPrimaria}, Cor Secundária: ${formData.corSecundaria}`,
          font: formData.fonte,
        },
      });

      if (error) throw error;

      setGeneratedPrompt(data.prompt);
      
      // Store the generated prompt in localStorage for cross-page usage
      localStorage.setItem("lastGeneratedPrompt", data.prompt);
      localStorage.setItem("lastGeneratedPromptTime", new Date().toISOString());

      // Save project to database
      await supabase.from("projects").insert({
        user_id: user.id,
        title: formData.nomeProjeto,
        description: formData.funcaoPrincipal,
        prompt: data.prompt,
        tech_stack: formData.identidadeVisual,
        features: formData.funcionalidadesAdicionais + featuresText,
      });

      toast({
        title: "Prompt gerado com sucesso!",
        description: "Prompt criado pela IA e pronto para usar no Lovable",
      });
    } catch (error) {
      console.error("Error generating prompt:", error);
      toast({
        title: "Erro ao gerar prompt",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    toast({
      title: "Copiado!",
      description: "Prompt copiado para a área de transferência",
    });
  };

  const suggestFeatures = async () => {
    if (!user) {
      toast({
        title: "Autenticação necessária",
        description: "Faça login para usar esta funcionalidade.",
        variant: "destructive",
      });
      return;
    }

    setIsSuggestingFeatures(true);
    
    try {
      // Refresh plan status before checking
      await refreshPlan();
      
      // Check again after refresh
      const { data: planData } = await supabase
        .from("user_credits")
        .select("plan")
        .eq("user_id", user.id)
        .single();
      
      const currentPlan = planData?.plan;

      if (!currentPlan || (currentPlan !== "pro" && currentPlan !== "enterprise")) {
        setIsSuggestingFeatures(false);
        toast({
          title: "Assinatura necessária",
          description: "Você precisa de uma assinatura para usar esta funcionalidade.",
          variant: "destructive",
        });
        return;
      }

      const projectContext = `
        Nome: ${formData.nomeProjeto}
        Função: ${formData.funcaoPrincipal}
        Público-alvo: ${formData.publicoAlvo}
        Transformação: ${formData.transformacao}
        Peça central: ${formData.pecaCentral}
      `;

      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Sessão não encontrada");
      }

      const { data, error } = await supabase.functions.invoke("suggest-features", {
        body: { fullContext: projectContext },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.suggestions && Array.isArray(data.suggestions)) {
        setAiSuggestions(data.suggestions);
        toast({
          title: "Recursos sugeridos!",
          description: `${data.suggestions.length} funcionalidades recomendadas pela IA`,
        });
      }
    } catch (error) {
      console.error("Error suggesting features:", error);
      toast({
        title: "Erro ao sugerir recursos",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setIsSuggestingFeatures(false);
    }
  };

  const toggleFeature = (feature: string) => {
    setComplementaryFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const handleVisualTestResult = (result: {
    primaryColor: string;
    secondaryColor: string;
    visualStyle: string;
    explanation: string;
  }) => {
    setFormData({
      ...formData,
      corPrimaria: result.primaryColor,
      corSecundaria: result.secondaryColor,
      identidadeVisual: result.visualStyle,
      paletaCores: "Personalizada (Sugerida pela IA)",
    });

    toast({
      title: "Identidade aplicada!",
      description: result.explanation,
    });
  };

  const projectContext = `
    Nome: ${formData.nomeProjeto}
    Função: ${formData.funcaoPrincipal}
    Público-alvo: ${formData.publicoAlvo}
    Transformação: ${formData.transformacao}
  `.trim();

  if (generatedPrompt) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6 text-primary" />
              Prompt Gerado com Sucesso!
            </CardTitle>
            <CardDescription>
              Copie o prompt abaixo e cole no Lovable para criar seu SaaS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-6 rounded-lg relative border border-border">
              <pre className="text-sm whitespace-pre-wrap text-muted-foreground">{generatedPrompt}</pre>
              <Button
                size="sm"
                className="absolute top-3 right-3 bg-primary hover:bg-primary/90"
                onClick={copyToClipboard}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Próximo passo: materialize seu SaaS no Lovable</p>
                  <p className="text-xs text-muted-foreground">
                    Copie o prompt acima, acesse <span className="font-medium text-foreground">lovable.dev</span> e cole no chat para gerar seu aplicativo automaticamente.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => window.open('https://lovable.dev/', '_blank')}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Abrir Lovable (lovable.dev)
              </Button>
            </div>
            <Button 
              onClick={() => { setGeneratedPrompt(""); }} 
              variant="outline"
              className="w-full"
            >
              Criar Novo Projeto
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold">
          {greeting}, <span className="gradient-text">{userName}!</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Vamos começar a construir seu projeto! Responda as perguntas abaixo e
          em poucos minutos teremos tudo pronto para a materialização.
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {/* Question 1 */}
        <div className="flex gap-4">
          <div className="step-number">1</div>
          <div className="question-card flex-1">
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Qual é a função principal do seu aplicativo?
              </Label>
              <p className="text-sm text-muted-foreground">
                💡 Exemplos: Organizar tarefas diárias, Conectar clientes e prestadores de
                serviço, Ensinar um novo idioma...
              </p>
              <Textarea
                placeholder="Organizar tarefas e fazer a gestão de projetos de forma colaborativa."
                value={formData.funcaoPrincipal}
                onChange={(e) => setFormData({ ...formData, funcaoPrincipal: e.target.value })}
                className="min-h-32 bg-muted border-border"
              />
            </div>
          </div>
        </div>

        {/* Question 2 */}
        <div className="flex gap-4">
          <div className="step-number">2</div>
          <div className="question-card flex-1">
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Qual será o nome do projeto?
              </Label>
              <p className="text-sm text-muted-foreground">
                📝 Escolha um nome que represente bem a proposta do seu app.
              </p>
              <Input
                placeholder="Ex: TaskMaster Social"
                value={formData.nomeProjeto}
                onChange={(e) => setFormData({ ...formData, nomeProjeto: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
          </div>
        </div>

        {/* Question 3 */}
        <div className="flex gap-4">
          <div className="step-number">3</div>
          <div className="question-card flex-1">
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Quem é o seu público-alvo?
              </Label>
              <p className="text-sm text-muted-foreground">
                🎯 Seja específico: Idade aproximada, profissão e o desafio que eles enfrentam no dia a dia.
              </p>
              <Textarea
                placeholder="Ex: Profissionais liberais que precisam gerenciar múltiplos projetos ao mesmo tempo..."
                value={formData.publicoAlvo}
                onChange={(e) => setFormData({ ...formData, publicoAlvo: e.target.value })}
                className="min-h-32 bg-muted border-border"
              />
            </div>
          </div>
        </div>

        {/* Question 4 */}
        <div className="flex gap-4">
          <div className="step-number">4</div>
          <div className="question-card flex-1">
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Qual transformação seu app oferece?
              </Label>
              <p className="text-sm text-muted-foreground">
                🚀 Pense: De "estado atual ruim" para "estado futuro desejável". Venda o resultado, não o app.
              </p>
              <Textarea
                placeholder="Ex: Sair de uma rotina desorganizada para ter total controle sobre suas atividades..."
                value={formData.transformacao}
                onChange={(e) => setFormData({ ...formData, transformacao: e.target.value })}
                className="min-h-32 bg-muted border-border"
              />
            </div>
          </div>
        </div>

        {/* Question 5 */}
        <div className="flex gap-4">
          <div className="step-number">5</div>
          <div className="question-card flex-1">
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Qual é a peça central do seu app?
              </Label>
              <p className="text-sm text-muted-foreground">
                ⚙️ Exemplo: Painel de controle, sistema de agendamento, feed de notícias...
              </p>
              <Textarea
                placeholder="Ex: Painel inteligente com visão geral dos projetos, prazos e responsáveis..."
                value={formData.pecaCentral}
                onChange={(e) => setFormData({ ...formData, pecaCentral: e.target.value })}
                className="min-h-32 bg-muted border-border"
              />
            </div>
          </div>
        </div>

        {/* Question 6 */}
        <div className="flex gap-4">
          <div className="step-number">6</div>
          <div className="question-card flex-1">
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Qual é o momento mágico?
              </Label>
              <p className="text-sm text-muted-foreground">
                ✨ O momento em que o usuário percebe o real valor do app e pensa "uau, isso realmente funciona!"
              </p>
              <Textarea
                placeholder="Ex: Quando o usuário vê sua semana toda organizada e percebe que não vai esquecer nada..."
                value={formData.momentoMagico}
                onChange={(e) => setFormData({ ...formData, momentoMagico: e.target.value })}
                className="min-h-32 bg-muted border-border"
              />
            </div>
          </div>
        </div>

        {/* Question 7 */}
        <div className="flex gap-4">
          <div className="step-number">7</div>
          <div className="question-card flex-1">
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Quais os itens do menu principal?
              </Label>
              <p className="text-sm text-muted-foreground">
                📋 Exemplo: Início, Tarefas, Projetos, Calendário, Configurações
              </p>
              <Textarea
                placeholder="Ex: Início, Projetos, Equipe, Relatórios, Configurações..."
                value={formData.menuPrincipal}
                onChange={(e) => setFormData({ ...formData, menuPrincipal: e.target.value })}
                className="min-h-24 bg-muted border-border"
              />
            </div>
          </div>
        </div>

        {/* Question 8 */}
        <div className="flex gap-4">
          <div className="step-number">8</div>
          <div className="question-card flex-1">
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Outras funcionalidades importantes? (Opcional)
              </Label>
              <p className="text-sm text-muted-foreground">
                ➕ Se tiver algo especial ou diferencial, coloque aqui.
              </p>
              <Textarea
                placeholder="Ex: Integração com calendário, notificações por email..."
                value={formData.funcionalidadesAdicionais}
                onChange={(e) => setFormData({ ...formData, funcionalidadesAdicionais: e.target.value })}
                className="min-h-24 bg-muted border-border"
              />
            </div>
          </div>
        </div>

        {/* Question 9 */}
        <div className="flex gap-4">
          <div className="step-number">9</div>
          <div className="question-card flex-1">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">
                  A experiência deve ser personalizada?
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  💬 Ou seja: o app vai chamar o usuário pelo nome ou adaptar conteúdo para ele?
                </p>
              </div>
              <RadioGroup
                value={formData.experienciaPersonalizada}
                onValueChange={(value) => setFormData({ ...formData, experienciaPersonalizada: value })}
                className="grid grid-cols-2 gap-4"
              >
                <Label
                  htmlFor="sim"
                  className="flex flex-col items-start space-y-2 border-2 border-border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors bg-muted/50"
                >
                  <RadioGroupItem value="sim" id="sim" className="sr-only" />
                  <div className={`w-full text-center font-semibold ${formData.experienciaPersonalizada === 'sim' ? 'text-primary' : ''}`}>
                    Sim, deve gerar relatórios personalizados
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Adaptar toda a interface ao comportamento e ao perfil de cada usuário.
                  </p>
                </Label>

                <Label
                  htmlFor="nao"
                  className="flex flex-col items-start space-y-2 border-2 border-border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors bg-muted/50"
                >
                  <RadioGroupItem value="nao" id="nao" className="sr-only" />
                  <div className={`w-full text-center font-semibold ${formData.experienciaPersonalizada === 'nao' ? 'text-primary' : ''}`}>
                    Não, a única mudança possível...
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Será a edição do perfil de usuário (nome, foto e dados básicos).
                  </p>
                </Label>
              </RadioGroup>
            </div>
          </div>
        </div>

        {/* Question 10 */}
        <div className="flex gap-4">
          <div className="step-number">10</div>
          <div className="question-card flex-1">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">
                  Qual será a identidade visual do app?
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  🎨 Defina um estilo que se alinhe à proposta do seu produto.
                </p>
              </div>
              <RadioGroup
                value={formData.identidadeVisual}
                onValueChange={(value) => setFormData({ ...formData, identidadeVisual: value })}
                className="grid grid-cols-2 gap-4"
              >
                <Label
                  htmlFor="apple"
                  className={`flex flex-col items-center justify-center space-y-2 border-2 rounded-lg p-6 cursor-pointer hover:border-primary transition-colors ${
                    formData.identidadeVisual === 'apple' ? 'border-primary bg-primary/10' : 'border-border bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="apple" id="apple" className="sr-only" />
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                    🍎
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">Estilo Apple</div>
                    <div className="text-xs text-muted-foreground">Minimalista, clean e elegante</div>
                  </div>
                </Label>

                <Label
                  htmlFor="retro"
                  className={`flex flex-col items-center justify-center space-y-2 border-2 rounded-lg p-6 cursor-pointer hover:border-primary transition-colors ${
                    formData.identidadeVisual === 'retro' ? 'border-primary bg-primary/10' : 'border-border bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="retro" id="retro" className="sr-only" />
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    📺
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">Retrô (Estilo vintage)</div>
                    <div className="text-xs text-muted-foreground">Cores quentes e fontes clássicas</div>
                  </div>
                </Label>

                <Label
                  htmlFor="neon"
                  className={`flex flex-col items-center justify-center space-y-2 border-2 rounded-lg p-6 cursor-pointer hover:border-primary transition-colors ${
                    formData.identidadeVisual === 'neon' ? 'border-primary bg-primary/10' : 'border-border bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="neon" id="neon" className="sr-only" />
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    🌟
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">Neon (Cores vibrantes)</div>
                    <div className="text-xs text-muted-foreground">Estilo tech com efeitos neon</div>
                  </div>
                </Label>

                <Label
                  htmlFor="moderna"
                  className={`flex flex-col items-center justify-center space-y-2 border-2 rounded-lg p-6 cursor-pointer hover:border-primary transition-colors ${
                    formData.identidadeVisual === 'moderna' ? 'border-primary bg-primary/10' : 'border-border bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="moderna" id="moderna" className="sr-only" />
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                    🎨
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">Moderna (Cores vivas)</div>
                    <div className="text-xs text-muted-foreground">Gradientes e elementos dinâmicos</div>
                  </div>
                </Label>
              </RadioGroup>
            </div>
          </div>
        </div>

        {/* Question 11 */}
        <div className="flex gap-4">
          <div className="step-number">11</div>
          <div className="question-card flex-1">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">
                  Quais as cores principais?
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  🎨 Selecione uma paleta que corresponda ao seu nicho e público-alvo.
                </p>
              </div>
              <div className="space-y-3">
                <div className="text-sm font-medium">Paleta Principal</div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { name: "Lilás Rosa", color: "#A974FF", id: "lilas" },
                    { name: "Energia Coralina", color: "#FF6B6B", id: "coral" },
                    { name: "Afterlook Coffe", color: "#8B4513", id: "coffee" },
                    { name: "Tech Mint", color: "#4ECDC4", id: "mint" },
                  ].map((palette) => (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => {
                        setFormData({ 
                          ...formData, 
                          paletaCores: palette.name,
                          corPrimaria: palette.color 
                        });
                      }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        formData.paletaCores === palette.name
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-full"
                        style={{ backgroundColor: palette.color }}
                      />
                      <span className="text-xs text-center">{palette.name}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-4 space-y-3">
                  <div className="text-sm font-medium">Ou escolha cores personalizadas:</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Cor Primária</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={formData.corPrimaria}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            corPrimaria: e.target.value,
                            paletaCores: "Personalizada"
                          })}
                          className="h-12 w-full cursor-pointer rounded-lg border-2 border-border hover:border-primary transition-colors"
                        />
                        <div className="flex-1">
                          <Input
                            value={formData.corPrimaria}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              corPrimaria: e.target.value,
                              paletaCores: "Personalizada"
                            })}
                            placeholder="#A974FF"
                            className="bg-muted border-border font-mono text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Cor Secundária</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={formData.corSecundaria}
                          onChange={(e) => setFormData({ ...formData, corSecundaria: e.target.value })}
                          className="h-12 w-full cursor-pointer rounded-lg border-2 border-border hover:border-primary transition-colors"
                        />
                        <div className="flex-1">
                          <Input
                            value={formData.corSecundaria}
                            onChange={(e) => setFormData({ ...formData, corSecundaria: e.target.value })}
                            placeholder="#C0C0C0"
                            className="bg-muted border-border font-mono text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowVisualTest(true)}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="h-4 w-4" />
                    + Quero um breve teste de identidade visual
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Question 12 */}
        <div className="flex gap-4">
          <div className="step-number">12</div>
          <div className="question-card flex-1">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">
                  Qual fonte você prefere para a interface?
                </Label>
              </div>
              <RadioGroup
                value={formData.fonte}
                onValueChange={(value) => setFormData({ ...formData, fonte: value })}
                className="grid grid-cols-2 gap-4"
              >
                {[
                  { name: "Roboto", desc: "Fonte Google clássica, ótima legibilidade" },
                  { name: "Poppins", desc: "Moderna e arredondada, ideal para SaaS" },
                  { name: "Lato", desc: "Elegante com personalidade, muito usada" },
                  { name: "Montserrat", desc: "Geométrica, impacto visual forte" },
                  ...(showMoreFonts ? [
                    { name: "Inter", desc: "Otimizada para UIs, design neutro" },
                    { name: "Open Sans", desc: "Humanista, fácil leitura em telas" },
                    { name: "Raleway", desc: "Elegante e moderna, versatilidade" },
                    { name: "Source Sans Pro", desc: "Adobe, profissional e limpa" },
                    { name: "Nunito", desc: "Amigável e arredondada, casual" },
                    { name: "Work Sans", desc: "Versátil para títulos e corpo" },
                    { name: "DM Sans", desc: "Geométrica, design contemporâneo" },
                    { name: "Space Grotesk", desc: "Tech, ideal para produtos digitais" },
                  ] : []),
                  { name: "Outra", desc: "Indique Google Fonts" },
                ].map((font) => (
                  <Label
                    key={font.name}
                    htmlFor={font.name}
                    className={`flex flex-col space-y-1 border-2 rounded-lg p-4 cursor-pointer hover:border-primary transition-colors ${
                      formData.fonte === font.name ? 'border-primary bg-primary/10' : 'border-border bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem value={font.name} id={font.name} className="sr-only" />
                    <div className="font-semibold">{font.name}</div>
                    <p className="text-xs text-muted-foreground">{font.desc}</p>
                  </Label>
                ))}
              </RadioGroup>
              <div className="text-center pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowMoreFonts(!showMoreFonts)}
                  className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                >
                  {showMoreFonts ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Ver menos opções
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Ver mais opções
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Features Section */}
        <div className="flex gap-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-bold shrink-0">
            +
          </div>
          <div className="question-card flex-1">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">
                  Funcionalidades Complementares
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  💡 Selecione funcionalidades extras que podem enriquecer seu aplicativo.
                </p>
              </div>
              
              {aiSuggestions.length > 0 && (
                <div className="space-y-3 mb-4">
                  <div className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Sugerido pela IA
                  </div>
                  {aiSuggestions.map((suggestion, index) => (
                    <Label
                      key={index}
                      className="flex items-start gap-3 p-4 border-2 border-primary/30 rounded-lg cursor-pointer hover:border-primary transition-colors bg-primary/5"
                    >
                      <Checkbox 
                        checked={complementaryFeatures.includes(suggestion.title)}
                        onCheckedChange={() => toggleFeature(suggestion.title)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{suggestion.title}</div>
                        <p className="text-xs text-muted-foreground mt-1">{suggestion.description}</p>
                      </div>
                    </Label>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { 
                    id: "loading",
                    title: "Estados de Carregamento", 
                    desc: "Animações e indicadores visuais que aparecem enquanto os dados são processados."
                  },
                  { 
                    id: "responsive",
                    title: "Design 100% Responsivo", 
                    desc: "Garante que a interface do aplicativo se adapte perfeitamente e seja fácil de usar em qualquer tamanho de tela."
                  },
                  { 
                    id: "errors",
                    title: "Tratamento de Erros Amigável", 
                    desc: "Exibe mensagens claras, humanas e úteis quando algo dá errado."
                  },
                  { 
                    id: "darkmode",
                    title: "Modo Escuro / Claro (Dark/Light Mode)", 
                    desc: "Permite que o usuário alterne entre um tema visual claro e um escuro."
                  },
                  { 
                    id: "profile",
                    title: "Gerenciamento de Perfil", 
                    desc: "Uma página dedicada onde o usuário pode atualizar suas informações pessoais."
                  },
                  { 
                    id: "onboarding",
                    title: "Onboarding Interativo (Tour Guiado)", 
                    desc: "Um tour passo a passo na primeira visita do usuário para apresentar as funcionalidades."
                  },
                  { 
                    id: "search",
                    title: "Busca Global", 
                    desc: "Uma barra de busca proeminente que permite ao usuário encontrar rapidamente qualquer informação."
                  },
                  { 
                    id: "gamification",
                    title: "Sistema de Gamificação", 
                    desc: "Adiciona elementos de jogo como pontos, medalhas (badges) e rankings."
                  },
                ].map((feature) => (
                  <Label
                    key={feature.id}
                    className="flex items-start gap-3 p-4 border-2 border-border rounded-lg cursor-pointer hover:border-primary transition-colors bg-muted/50"
                  >
                    <Checkbox 
                      checked={complementaryFeatures.includes(feature.title)}
                      onCheckedChange={() => toggleFeature(feature.title)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{feature.title}</div>
                      <p className="text-xs text-muted-foreground mt-1">{feature.desc}</p>
                    </div>
                  </Label>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={suggestFeatures}
                  disabled={isSuggestingFeatures}
                  className="bg-primary/10 border-primary text-primary hover:bg-primary hover:text-white"
                >
                  {isSuggestingFeatures ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sugerindo...
                    </>
                  ) : (
                    <>+ Sugerir Novos Recursos</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="flex justify-center pt-6">
          <Button
            size="lg"
            onClick={generatePrompt}
            disabled={isGenerating}
            className="bg-primary hover:bg-primary/90 text-lg px-12 py-6"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Gerando com IA...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Materializar Conceito
              </>
            )}
          </Button>
        </div>
      </div>

      <VisualIdentityTestDialog
        open={showVisualTest}
        onOpenChange={setShowVisualTest}
        projectContext={projectContext}
        onResultApply={handleVisualTestResult}
      />
    </div>
  );
}
