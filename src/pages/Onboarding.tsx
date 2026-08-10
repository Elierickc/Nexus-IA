import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Loader2, Target, MapPin, DollarSign, Users, MessageCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  niche: z.string().trim().min(2, "Informe seu nicho").max(120),
  city: z.string().trim().min(2, "Informe sua cidade").max(120),
  monthly_goal: z.coerce.number().positive("Meta deve ser maior que zero").max(100000000),
  target_audience: z.string().trim().min(5, "Descreva seu público-alvo").max(500),
  whatsapp: z.string().trim().regex(/^[0-9+()\s-]{8,20}$/, "WhatsApp inválido"),
});

const STEPS = [
  { key: "niche", title: "Qual é o seu nicho?", desc: "Em que mercado você atua?", icon: Target, placeholder: "Ex: Estética, Advocacia, Imobiliária..." },
  { key: "city", title: "Onde você atende?", desc: "Cidade principal de atuação", icon: MapPin, placeholder: "Ex: São Paulo - SP" },
  { key: "monthly_goal", title: "Qual sua meta mensal?", desc: "Quanto deseja faturar por mês?", icon: DollarSign, placeholder: "Ex: 30000" },
  { key: "target_audience", title: "Quem é seu cliente ideal?", desc: "Descreva o público que você quer atrair", icon: Users, placeholder: "Ex: Mulheres 25-45 anos, classe B, interessadas em estética facial..." },
  { key: "whatsapp", title: "Qual seu WhatsApp principal?", desc: "Usaremos para automações de mensagens", icon: MessageCircle, placeholder: "Ex: 11999990000" },
] as const;

type FormData = {
  niche: string;
  city: string;
  monthly_goal: string;
  target_audience: string;
  whatsapp: string;
};

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<FormData>({ niche: "", city: "", monthly_goal: "", target_audience: "", whatsapp: "" });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: existing } = await supabase
        .from("user_onboarding")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        if (existing.completed) {
          navigate("/prospector", { replace: true });
          return;
        }
        setData({
          niche: existing.niche ?? "",
          city: existing.city ?? "",
          monthly_goal: existing.monthly_goal?.toString() ?? "",
          target_audience: existing.target_audience ?? "",
          whatsapp: existing.whatsapp ?? "",
        });
        setStep(Math.max(0, (existing.current_step ?? 1) - 1));
      }
      setLoading(false);
    })();
  }, [user, navigate]);

  const current = STEPS[step];
  const value = data[current.key as keyof FormData];
  const isLast = step === STEPS.length - 1;
  const Icon = current.icon;

  const persist = async (patch: Partial<FormData>, nextStep: number, complete = false) => {
    if (!user) return;
    const merged = { ...data, ...patch };
    const payload: any = {
      user_id: user.id,
      niche: merged.niche || null,
      city: merged.city || null,
      monthly_goal: merged.monthly_goal ? Number(merged.monthly_goal) : null,
      target_audience: merged.target_audience || null,
      whatsapp: merged.whatsapp || null,
      current_step: nextStep + 1,
      completed: complete,
      completed_at: complete ? new Date().toISOString() : null,
    };
    const { error } = await supabase
      .from("user_onboarding")
      .upsert(payload, { onConflict: "user_id" });
    if (error) throw error;
  };

  const handleNext = async () => {
    const fieldSchema = (schema.shape as any)[current.key];
    const result = fieldSchema.safeParse(value);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      if (isLast) {
        const full = schema.safeParse(data);
        if (!full.success) {
          toast.error("Verifique os campos preenchidos");
          setSaving(false);
          return;
        }
        await persist({}, step, true);
        toast.success("Tudo pronto! Vamos encontrar seus primeiros clientes 🚀");
        navigate("/prospector", { replace: true });
      } else {
        await persist({}, step + 1);
        setStep(step + 1);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-xl border-border/50">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Etapa {step + 1} de {STEPS.length}</span>
            <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
          <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
          <div className="flex items-start gap-3 pt-2">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">{current.title}</CardTitle>
              <CardDescription className="mt-1">{current.desc}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor={current.key}>{current.title}</Label>
            {current.key === "target_audience" ? (
              <Textarea
                id={current.key}
                value={value}
                onChange={(e) => setData({ ...data, [current.key]: e.target.value })}
                placeholder={current.placeholder}
                rows={4}
                maxLength={500}
                autoFocus
              />
            ) : (
              <Input
                id={current.key}
                type={current.key === "monthly_goal" ? "number" : "text"}
                value={value}
                onChange={(e) => setData({ ...data, [current.key]: e.target.value })}
                placeholder={current.placeholder}
                maxLength={current.key === "whatsapp" ? 20 : 120}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleNext(); }}
              />
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0 || saving}
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
            <Button onClick={handleNext} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isLast ? (<>Concluir <CheckCircle2 className="w-4 h-4 ml-1" /></>) : (<>Próximo <ArrowRight className="w-4 h-4 ml-1" /></>)}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
