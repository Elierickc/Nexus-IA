import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VisualIdentityTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectContext: string;
  onResultApply: (result: {
    primaryColor: string;
    secondaryColor: string;
    visualStyle: string;
    explanation: string;
  }) => void;
}

const questions = [
  {
    id: "mood",
    question: "Qual sensação você quer passar?",
    options: [
      { value: "confianca", label: "Confiança e Profissionalismo" },
      { value: "energia", label: "Energia e Dinamismo" },
      { value: "calma", label: "Calma e Tranquilidade" },
      { value: "criatividade", label: "Criatividade e Inovação" },
    ],
  },
  {
    id: "target",
    question: "Para quem é o seu público?",
    options: [
      { value: "corporativo", label: "Empresas e Corporações" },
      { value: "jovem", label: "Público Jovem (18-30 anos)" },
      { value: "premium", label: "Clientes Premium/Luxo" },
      { value: "geral", label: "Público Geral" },
    ],
  },
  {
    id: "preference",
    question: "Que estilo visual você prefere?",
    options: [
      { value: "minimalista", label: "Minimalista e Limpo" },
      { value: "vibrante", label: "Colorido e Vibrante" },
      { value: "elegante", label: "Elegante e Sofisticado" },
      { value: "moderno", label: "Moderno e Tech" },
    ],
  },
];

export function VisualIdentityTestDialog({
  open,
  onOpenChange,
  projectContext,
  onResultApply,
}: VisualIdentityTestDialogProps) {
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // All questions answered, analyze with AI
      await analyzeAndSuggest();
    }
  };

  const analyzeAndSuggest = async () => {
    setIsAnalyzing(true);
    try {
      const answersText = Object.entries(answers)
        .map(([key, value]) => {
          const q = questions.find((q) => q.id === key);
          const option = q?.options.find((o) => o.value === value);
          return `${q?.question} ${option?.label}`;
        })
        .join("\n");

      const { data, error } = await supabase.functions.invoke("visual-identity-test", {
        body: {
          projectContext,
          answers: answersText,
        },
      });

      if (error) throw error;

      toast({
        title: "Identidade visual sugerida!",
        description: "Aplicando as cores recomendadas pela IA",
      });

      onResultApply(data.suggestion);
      onOpenChange(false);
      resetTest();
    } catch (error) {
      console.error("Error analyzing visual identity:", error);
      toast({
        title: "Erro ao analisar",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetTest = () => {
    setCurrentQuestion(0);
    setAnswers({});
  };

  const currentQ = questions[currentQuestion];
  const canProceed = answers[currentQ.id] !== undefined;
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Teste de Identidade Visual
          </DialogTitle>
          <DialogDescription>
            Responda 3 perguntas rápidas para descobrir a identidade visual perfeita
          </DialogDescription>
        </DialogHeader>

        {!isAnalyzing ? (
          <div className="space-y-6">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Pergunta {currentQuestion + 1} de {questions.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">{currentQ.question}</h3>
              <RadioGroup
                value={answers[currentQ.id] || ""}
                onValueChange={(value) => handleAnswer(currentQ.id, value)}
              >
                {currentQ.options.map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={option.value}
                    className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      answers[currentQ.id] === option.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <span className="flex-1">{option.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {currentQuestion > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(currentQuestion - 1)}
                  className="flex-1"
                >
                  Voltar
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!canProceed}
                className="flex-1"
              >
                {currentQuestion === questions.length - 1 ? "Analisar" : "Próxima"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <h3 className="font-semibold">Analisando suas respostas...</h3>
              <p className="text-sm text-muted-foreground">
                A IA está criando a identidade visual perfeita para seu projeto
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
