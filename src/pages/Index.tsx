import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Zap, Target, TrendingUp, Users, Sparkles, ArrowRight, Rocket, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
const Index = () => {
  const navigate = useNavigate();
  const features = [{
    icon: Zap,
    title: "Copywriter AI",
    description: "Crie textos persuasivos e profissionais em segundos com inteligência artificial avançada"
  }, {
    icon: Target,
    title: "Landing Page Builder",
    description: "Construa landing pages de alta conversão de forma simples e rápida"
  }, {
    icon: Users,
    title: "Prospector",
    description: "Encontre e qualifique leads automaticamente para sua empresa"
  }, {
    icon: Sparkles,
    title: "Materializar",
    description: "Transforme suas ideias em realidade com ferramentas poderosas"
  }, {
    icon: TrendingUp,
    title: "Academy",
    description: "Aprenda estratégias avançadas de marketing e vendas"
  }, {
    icon: Rocket,
    title: "Suporte Premium",
    description: "Atendimento dedicado para garantir seu sucesso"
  }];
  const benefits = ["Aumente suas vendas em até 300%", "Economize até 20 horas por semana", "Automatize processos repetitivos", "Melhore suas taxas de conversão", "Escale seu negócio rapidamente"];
  return <div className="min-h-screen bg-background">
      <SEO
        title="Nexus IA — Seu Funcionário Virtual de Vendas com IA"
        description="Prospecte, qualifique leads e venda no WhatsApp 24/7 com inteligência artificial. Aumente seu faturamento sem contratar."
        path="/"
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pt-20 pb-32">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        
        <div className="container relative mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            <div className="inline-block">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary border border-primary/20">
                <Sparkles className="w-4 h-4" />
                Plataforma All-in-One de Marketing Digital
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Transforme Seu Negócio com{" "}
              <span className="gradient-text">Inteligência Artificial</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              A plataforma completa para criar, automatizar e escalar suas campanhas de marketing. 
              Tudo que você precisa em um só lugar.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" className="text-lg px-8 py-6 glow-neon" onClick={() => navigate("/pricing")}>
                Começar Agora
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => navigate("/auth")}>
                Entrar
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-8 pt-8 text-sm text-muted-foreground">
              
              
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Suporte em português
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Tudo que Você Precisa em{" "}
              <span className="gradient-text">Uma Plataforma</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Ferramentas poderosas de IA para transformar seu marketing e vendas
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => <Card key={index} className="glass-card p-6 hover:border-primary/50 transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] group">
                <feature.icon className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-4 py-20 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Por Que Escolher Nossa{" "}
                <span className="gradient-text">Plataforma?</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Resultados comprovados por milhares de empresas que transformaram 
                suas estratégias de marketing digital.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-1" />
                    <span className="text-lg">{benefit}</span>
                  </div>)}
              </div>

              <Button size="lg" className="mt-8 glow-neon" onClick={() => navigate("/pricing")}>
                Ver Planos e Preços
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>

            <div className="relative">
              <Card className="glass-card p-8 border-primary/30">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                    <span className="font-semibold">Taxa de Conversão</span>
                    <span className="text-2xl font-bold text-primary">+300%</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg">
                    <span className="font-semibold">Tempo Economizado</span>
                    <span className="text-2xl font-bold text-secondary">20h/sem</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                    <span className="font-semibold">ROI Médio</span>
                    <span className="text-2xl font-bold text-primary">450%</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-4 py-20 bg-gradient-to-b from-transparent via-secondary/5 to-transparent">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Escolha Seu <span className="gradient-text">Plano Ideal</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Planos flexíveis para cada momento do seu negócio
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Plano Mensal */}
            <Card className="glass-card p-8 hover:border-primary/50 transition-all border-primary/30">
              <div className="text-center mb-6">
                <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Mensal</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">R$ 97,90</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <p className="text-muted-foreground">
                  Acesso completo a todas as funcionalidades
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>Criação de Prompts com IA</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>Prospector Automático</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>IA Copywriter</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>LP Builder</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>Suporte prioritário</span>
                </li>
              </ul>

              <Button size="lg" className="w-full glow-neon" onClick={() => navigate("/pricing")}>
                Assinar Agora
              </Button>
            </Card>

            {/* Plano Semestral */}
            <Card className="glass-card p-8 hover:border-primary/50 transition-all border-primary glow-neon relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                Mais Popular
              </div>
              
              <div className="text-center mb-6">
                <Crown className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Semestral</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">R$ 490</span>
                  <span className="text-muted-foreground">/semestre</span>
                </div>
                <p className="text-muted-foreground">
                  Economize R$ 97,40 em 6 meses
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>Criação de Prompts com IA</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>Prospector Automático</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>IA Copywriter</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>LP Builder</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>Suporte VIP (WhatsApp)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span>Atualizações garantidas</span>
                </li>
              </ul>

              <Button size="lg" className="w-full" onClick={() => navigate("/pricing")}>
                Assinar Semestral
              </Button>
            </Card>
          </div>

          <div className="text-center mt-8 text-sm text-muted-foreground">
            <p>✅ 14 dias de garantia de reembolso em todos os planos</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20">
        <div className="container mx-auto max-w-4xl">
          <Card className="glass-card p-12 text-center border-primary/30 glow-neon">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Pronto Para Começar?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Junte-se a milhares de empresas que já estão transformando 
              seus resultados com nossa plataforma.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 py-6" onClick={() => navigate("/pricing")}>
                Começar Agora
                <Sparkles className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => navigate("/auth")}>
                Já tenho conta
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              Comece com 5 créditos grátis. Sem necessidade de cartão de crédito.
            </p>
          </Card>
        </div>
      </section>
    </div>;
};
export default Index;