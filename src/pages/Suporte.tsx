import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Mail, Ticket } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateTicketDialog } from "@/components/support/CreateTicketDialog";
import { TicketList } from "@/components/support/TicketList";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";

export default function Suporte() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const userName = user?.email?.split("@")[0] || "Usuário";

  const faqData = [
    { q: "Como funciona o Materializar SaaS?", a: "O Materializar SaaS é um assistente guiado que faz perguntas estratégicas sobre seu projeto e gera um prompt completo para criar seu aplicativo com IA. Basta responder as perguntas e copiar o resultado para usar no Lovable ou outra plataforma de desenvolvimento." },
    { q: "O que é o Prospector?", a: "O Prospector é uma ferramenta que simula a busca por empresas locais e gera análises inteligentes sobre oportunidades de negócio. Ele identifica desafios do nicho e sugere soluções personalizadas que você pode oferecer." },
    { q: "Como usar o IA Copywriter?", a: "O IA Copywriter cria textos de prospecção personalizados. Preencha as informações sobre seu projeto e cliente alvo, e ele gerará uma abordagem persuasiva pronta para uso em e-mails, mensagens ou propostas comerciais." },
    { q: "Preciso saber programar?", a: "Não! A plataforma Nexus IA foi criada justamente para pessoas sem conhecimento técnico. Todas as ferramentas funcionam através de formulários guiados e geram resultados prontos para uso." },
    { q: "Como conectar com banco de dados?", a: "Recomendamos usar Lovable Cloud ou Supabase. Nos cursos da Academy, você encontra tutoriais completos sobre como integrar banco de dados ao seu projeto." },
    { q: "Posso vender os aplicativos criados?", a: "Sim! Todos os projetos criados através da plataforma são seus. Você tem total liberdade para vender, licenciar ou distribuir os aplicativos como desejar." },
    { q: "Quanto tempo leva para criar um app?", a: "Com o Materializar SaaS, você pode gerar um prompt completo em menos de 10 minutos. Depois, basta colar no Lovable e seu app estará pronto em minutos." },
    { q: "Como funciona a Academy?", a: "A Academy é nossa biblioteca de vídeos e tutoriais que ensinam desde o básico até técnicas avançadas de criação de SaaS." },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqData.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <SEO
        title="Suporte e FAQ — Nexus IA"
        description="Tire dúvidas sobre o Nexus IA, abra tickets e consulte as perguntas frequentes sobre as ferramentas de IA da plataforma."
        path="/suporte"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold">
          Olá, <span className="gradient-text">{userName}!</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          Tire suas dúvidas ou entre em contato conosco
        </p>
      </div>

      <Tabs defaultValue="tickets" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="tickets">Meus Tickets</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-card hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-primary/20">
                    <Ticket className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Novo Ticket</CardTitle>
                    <CardDescription>Suporte prioritário em até 2 horas</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CreateTicketDialog onTicketCreated={() => setRefreshKey((k) => k + 1)} />
              </CardContent>
            </Card>

            <Card className="glass-card hover:border-secondary/50 transition-all">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-secondary/20">
                    <Mail className="h-8 w-8 text-secondary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Enviar E-mail</CardTitle>
                    <CardDescription>Resposta garantida em até 24 horas</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <a
                  href="mailto:suportenylus@gmail.com"
                  className="inline-flex items-center justify-center w-full h-10 px-4 py-2 rounded-md bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium transition-colors"
                >
                  suportenylus@gmail.com
                </a>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Seus Tickets de Suporte</h2>
            <TicketList refresh={refreshKey} />
          </div>
        </TabsContent>

        <TabsContent value="faq" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Perguntas Frequentes (FAQ)</h2>
          </div>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-border">
                  <AccordionTrigger className="text-left hover:text-primary">
                    Como funciona o Materializar SaaS?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    O Materializar SaaS é um assistente guiado que faz perguntas estratégicas sobre seu projeto
                    e gera um prompt completo para criar seu aplicativo com IA. Basta responder as perguntas e
                    copiar o resultado para usar no Lovable ou outra plataforma de desenvolvimento.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="border-border">
                  <AccordionTrigger className="text-left hover:text-primary">
                    O que é o Prospector?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    O Prospector é uma ferramenta que simula a busca por empresas locais e gera análises
                    inteligentes sobre oportunidades de negócio. Ele identifica desafios do nicho e sugere
                    soluções personalizadas que você pode oferecer.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="border-border">
                  <AccordionTrigger className="text-left hover:text-primary">
                    Como usar o IA Copywriter?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    O IA Copywriter cria textos de prospecção personalizados. Preencha as informações sobre
                    seu projeto e cliente alvo, e ele gerará uma abordagem persuasiva pronta para uso em
                    e-mails, mensagens ou propostas comerciais.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4" className="border-border">
                  <AccordionTrigger className="text-left hover:text-primary">
                    Preciso saber programar?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    Não! A plataforma Nylus IA foi criada justamente para pessoas sem conhecimento técnico.
                    Todas as ferramentas funcionam através de formulários guiados e geram resultados prontos
                    para uso. Você só precisa saber descrever sua ideia.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5" className="border-border">
                  <AccordionTrigger className="text-left hover:text-primary">
                    Como conectar com banco de dados?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    Recomendamos usar Lovable Cloud ou Supabase. Nos cursos da Academy, você encontra
                    tutoriais completos sobre como integrar banco de dados ao seu projeto, incluindo
                    autenticação de usuários e armazenamento de dados.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6" className="border-border">
                  <AccordionTrigger className="text-left hover:text-primary">
                    Posso vender os aplicativos criados?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    Sim! Todos os projetos criados através da plataforma são seus. Você tem total liberdade
                    para vender, licenciar ou distribuir os aplicativos como desejar. A Nylus IA é apenas
                    uma ferramenta para facilitar a criação.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-7" className="border-border">
                  <AccordionTrigger className="text-left hover:text-primary">
                    Quanto tempo leva para criar um app?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    Com o Materializar SaaS, você pode gerar um prompt completo em menos de 10 minutos.
                    Depois, basta colar no Lovable e seu app estará pronto em minutos. A velocidade
                    depende da complexidade do projeto, mas geralmente é muito mais rápido do que
                    desenvolvimento tradicional.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-8" className="border-border">
                  <AccordionTrigger className="text-left hover:text-primary">
                    Como funciona a Academy?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    A Academy é nossa biblioteca de vídeos e tutoriais que ensinam desde o básico até
                    técnicas avançadas de criação de SaaS. Os cursos são divididos em módulos curtos e
                    práticos, com exemplos reais que você pode aplicar imediatamente.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
