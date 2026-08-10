import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayCircle, GraduationCap, Clock, BookOpen } from "lucide-react";
import { SEO } from "@/components/SEO";

const cursos = [
  {
    id: 1,
    titulo: "Como criar SaaS com IA",
    descricao: "Aprenda a transformar suas ideias em aplicativos funcionais",
    duracao: "45 min",
    aulas: 8,
    videoUrl: "https://www.youtube.com/watch?v=ttGTX1Fcjc0&t=2s",
  },
  {
    id: 2,
    titulo: "Como prospectar clientes",
    descricao: "Técnicas eficazes para encontrar e converter leads",
    duracao: "30 min",
    aulas: 5,
  },
  {
    id: 3,
    titulo: "Como conectar banco de dados",
    descricao: "Integre seu app com Supabase e outros bancos",
    duracao: "35 min",
    aulas: 6,
  },
  {
    id: 4,
    titulo: "Como atualizar o projeto",
    descricao: "Adicione funcionalidades e corrija bugs facilmente",
    duracao: "25 min",
    aulas: 4,
  },
  {
    id: 5,
    titulo: "Como criar páginas de vendas",
    descricao: "Construa landing pages de alta conversão",
    duracao: "40 min",
    aulas: 7,
  },
  {
    id: 6,
    titulo: "Estratégias de validação",
    descricao: "Valide sua ideia antes de desenvolver",
    duracao: "28 min",
    aulas: 5,
  },
];

export default function Academy() {
  const userName = "Elierique";

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: cursos.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Course",
        name: c.titulo,
        description: c.descricao,
        provider: { "@type": "Organization", name: "Nexus IA", sameAs: "https://nexusia.pro" },
      },
    })),
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <SEO
        title="Academy — Cursos e Tutoriais | Nexus IA"
        description="Aprenda a criar SaaS com IA, prospectar clientes e dominar o Nexus IA com tutoriais práticos da Academy."
        path="/academy"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold">
          Boa noite, <span className="gradient-text">{userName}!</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          Aprenda a dominar a plataforma e criar aplicativos incríveis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cursos.map((curso, index) => (
          <div key={curso.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="step-number">{index + 1}</div>
              <span className="text-sm text-muted-foreground">Módulo {index + 1}</span>
            </div>
            <Card 
              className="glass-card hover:border-primary/50 transition-all cursor-pointer group h-full"
              onClick={() => curso.videoUrl && window.open(curso.videoUrl, '_blank')}
            >
              <CardHeader>
                <div className="aspect-video bg-gradient-card rounded-lg flex items-center justify-center mb-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-20 transition-opacity" />
                  <PlayCircle className="h-16 w-16 text-primary group-hover:scale-110 transition-transform z-10" />
                </div>
                <CardTitle className="text-lg">{curso.titulo}</CardTitle>
                <CardDescription>{curso.descricao}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>{curso.aulas} aulas</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{curso.duracao}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <Card className="glass-card border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/20">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Em breve: Mais conteúdos</CardTitle>
              <CardDescription>
                Estamos preparando novos cursos e tutoriais para você dominar completamente a criação de SaaS com IA
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
