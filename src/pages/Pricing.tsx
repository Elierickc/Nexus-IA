import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Zap, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import PixPaymentModal from "@/components/PixPaymentModal";
import PixCheckoutModal from "@/components/PixCheckoutModal";
import { SEO } from "@/components/SEO";

export default function Pricing() {
  const { user, plan } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [pixCheckoutOpen, setPixCheckoutOpen] = useState(false);
  const [pixCheckoutPlan, setPixCheckoutPlan] = useState<{
    planId: string;
    planName: string;
    planPrice: number;
  } | null>(null);

  const handleSubscribe = async (selectedPlan: string, priceId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setIsLoading(selectedPlan);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handlePixPayment = async (selectedPlan: string, planName: string, planPrice: number) => {
    // Para usuários logados, usa fluxo antigo
    if (user) {
      setIsLoading(`${selectedPlan}-pix`);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setPixCheckoutPlan({ planId: selectedPlan, planName, planPrice });
          setPixCheckoutOpen(true);
          return;
        }

        const { data, error } = await supabase.functions.invoke("create-mercadopago-payment", {
          body: { planId: selectedPlan, planName, planPrice },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (error) throw error;
        
        if (data) {
          setPixData(data);
          setSelectedPlanId(selectedPlan);
          setPixModalOpen(true);
        }
      } catch (error) {
        toast({
          title: "Erro",
          description: "Ocorreu um erro ao processar o pagamento via Pix.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(null);
      }
      return;
    }

    // Para novos usuários, abre modal de checkout Pix direto
    setPixCheckoutPlan({ planId: selectedPlan, planName, planPrice });
    setPixCheckoutOpen(true);
  };

  const plans = [
    {
      id: "monthly",
      name: "Mensal",
      price: "R$ 97,90",
      period: "/mês",
      priceInCents: 9790,
      description: "Acesso completo a todas as funcionalidades",
      icon: Zap,
      popular: false,
      features: [
        "Criação de Prompts com IA",
        "Prospector Automático",
        "IA Copywriter",
        "LP Builder",
        "Suporte prioritário",
      ],
      cta: "Assinar Agora",
      priceId: "price_1SPsdU0YTQOMW3jPV0DlVo7E",
    },
    {
      id: "semester",
      name: "Semestral",
      price: "R$ 490",
      period: "/semestre",
      priceInCents: 49000,
      description: "Economize R$ 97,40 em 6 meses",
      icon: Crown,
      popular: true,
      features: [
        "Criação de Prompts com IA",
        "Prospector Automático",
        "IA Copywriter",
        "LP Builder",
        "Suporte VIP (WhatsApp)",
        "Atualizações garantidas",
      ],
      cta: "Assinar Semestral",
      priceId: "price_1SPsfi0YTQOMW3jPenJuLdUP",
    },
  ];

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Nexus IA",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: plans.map((p) => ({
      "@type": "Offer",
      name: p.name,
      price: (p.priceInCents / 100).toFixed(2),
      priceCurrency: "BRL",
      description: p.description,
    })),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/20 py-12 px-4">
      <SEO
        title="Planos e Preços — Nexus IA"
        description="Escolha o plano ideal do Nexus IA. Assinatura mensal ou semestral com acesso completo às ferramentas de IA para vendas e prospecção."
        path="/pricing"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Escolha seu Plano</h1>
          <p className="text-muted-foreground text-lg">
            Selecione o plano ideal para suas necessidades
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((planItem) => {
            const Icon = planItem.icon;
            const isCurrentPlan = plan === planItem.id;

            return (
              <Card
                key={planItem.id}
                className={`relative ${
                  planItem.popular ? "border-primary shadow-lg scale-105" : ""
                }`}
              >
                {planItem.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      Mais Popular
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <Icon className="h-8 w-8 text-primary" />
                    {isCurrentPlan && (
                      <Badge variant="secondary">Plano Atual</Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl">{planItem.name}</CardTitle>
                  <CardDescription>{planItem.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{planItem.price}</span>
                    <span className="text-muted-foreground">{planItem.period}</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3">
                    {planItem.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="flex flex-col gap-2">
                  <Button
                    className="w-full"
                    variant={planItem.popular ? "default" : "outline"}
                    disabled={isCurrentPlan || isLoading === planItem.id}
                    onClick={() => handleSubscribe(planItem.id, planItem.priceId || "")}
                  >
                    {isLoading === planItem.id ? "Processando..." : planItem.cta}
                  </Button>
                  <Button
                    className="w-full"
                    variant="secondary"
                    disabled={isCurrentPlan || isLoading === `${planItem.id}-pix`}
                    onClick={() => handlePixPayment(planItem.id, planItem.name, planItem.priceInCents)}
                  >
                    {isLoading === `${planItem.id}-pix` ? "Processando..." : "Pagar com Pix"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Todos os planos incluem 14 dias de garantia de reembolso</p>
          <p className="mt-2">Dúvidas? Entre em contato pelo suporte@nexusia.com</p>
        </div>
      </div>

      <PixPaymentModal 
        isOpen={pixModalOpen}
        onClose={() => setPixModalOpen(false)}
        pixData={pixData}
        planId={selectedPlanId}
      />

      {pixCheckoutPlan && (
        <PixCheckoutModal
          isOpen={pixCheckoutOpen}
          onClose={() => {
            setPixCheckoutOpen(false);
            setPixCheckoutPlan(null);
          }}
          planId={pixCheckoutPlan.planId}
          planName={pixCheckoutPlan.planName}
          planPrice={pixCheckoutPlan.planPrice}
        />
      )}
    </div>
  );
}

function Badge({ children, className = "", variant = "default" }: any) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        variant === "default" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
      } ${className}`}
    >
      {children}
    </span>
  );
}
