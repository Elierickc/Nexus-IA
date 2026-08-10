import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/EmptyState";
import { ResultCard } from "@/components/dashboard/ResultCard";
import { WeeklyEvolutionChart } from "@/components/dashboard/WeeklyEvolutionChart";
import {
  Users,
  MessageCircle,
  MessageSquare,
  CalendarCheck,
  FileText,
  Trophy,
  DollarSign,
  Rocket,
  ArrowRight,
  Sparkles,
  TrendingUp,
} from "lucide-react";

type MetricPair = { current: number; previous: number };
type Metrics = {
  leads: MetricPair;
  conversations: MetricPair;
  responses: MetricPair;
  meetings: MetricPair;
  proposals: MetricPair;
  won: MetricPair;
  revenue: MetricPair;
  weekly: Array<{ week: string; leads: number; won: number; revenue: number }>;
};

const empty: Metrics = {
  leads: { current: 0, previous: 0 },
  conversations: { current: 0, previous: 0 },
  responses: { current: 0, previous: 0 },
  meetings: { current: 0, previous: 0 },
  proposals: { current: 0, previous: 0 },
  won: { current: 0, previous: 0 },
  revenue: { current: 0, previous: 0 },
  weekly: [],
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics>(empty);
  const [loading, setLoading] = useState(true);

  const userName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Empreendedor";

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_dashboard_metrics", { period_days: 30 });
      if (!error && data && typeof data === "object") {
        setMetrics({ ...empty, ...(data as unknown as Metrics) });
      }
      setLoading(false);
    })();
  }, [user]);

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);

  const revGrowth =
    metrics.revenue.previous > 0
      ? Math.round(((metrics.revenue.current - metrics.revenue.previous) / metrics.revenue.previous) * 100)
      : metrics.revenue.current > 0
      ? 100
      : 0;

  const hasAnyActivity =
    metrics.leads.current + metrics.conversations.current + metrics.won.current > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-background to-background p-6 md:p-8">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Olá, {userName} 👋</p>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Resultado do mês
            </h1>
            <p className="text-muted-foreground max-w-xl">
              Aqui está tudo que a Nexus IA gerou para você nos últimos 30 dias.
            </p>
            {revGrowth !== 0 && (
              <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm">
                <TrendingUp className="w-4 h-4" />
                Sua receita cresceu {revGrowth > 0 ? "+" : ""}
                {revGrowth}% vs. mês anterior
              </div>
            )}
          </div>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-base px-6 py-6 rounded-full group shadow-lg shadow-primary/30"
            onClick={() => navigate("/prospector")}
          >
            <Rocket className="mr-2 h-5 w-5" />
            Encontrar Clientes
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>

      {/* Result Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <ResultCard label="Leads encontrados" value={metrics.leads.current} previous={metrics.leads.previous} current={metrics.leads.current} icon={Users} />
        <ResultCard label="Conversas iniciadas" value={metrics.conversations.current} previous={metrics.conversations.previous} current={metrics.conversations.current} icon={MessageCircle} />
        <ResultCard label="Respostas recebidas" value={metrics.responses.current} previous={metrics.responses.previous} current={metrics.responses.current} icon={MessageSquare} />
        <ResultCard label="Reuniões marcadas" value={metrics.meetings.current} previous={metrics.meetings.previous} current={metrics.meetings.current} icon={CalendarCheck} />
        <ResultCard label="Propostas enviadas" value={metrics.proposals.current} previous={metrics.proposals.previous} current={metrics.proposals.current} icon={FileText} />
        <ResultCard label="Vendas fechadas" value={metrics.won.current} previous={metrics.won.previous} current={metrics.won.current} icon={Trophy} />
        <ResultCard
          label="Receita gerada"
          value={fmtMoney(metrics.revenue.current)}
          previous={metrics.revenue.previous}
          current={metrics.revenue.current}
          icon={DollarSign}
          accent="text-emerald-400"
        />
      </div>

      {/* Evolution */}
      {hasAnyActivity ? (
        <WeeklyEvolutionChart data={metrics.weekly} />
      ) : (
        <EmptyState
          icon={Sparkles}
          title="Vamos encontrar seus primeiros clientes agora"
          description="A Nexus IA pode buscar empresas do seu nicho, gerar a abordagem e iniciar as conversas no WhatsApp por você. Tudo começa com um clique."
          ctaLabel="Gerar meus primeiros leads"
          onCta={() => navigate("/prospector")}
        />
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="glass-card p-5 cursor-pointer hover:border-primary/50 transition-all group"
          onClick={() => navigate("/whatsapp-ai")}
        >
          <MessageCircle className="w-6 h-6 text-primary mb-3" />
          <h3 className="font-semibold mb-1">Conversas IA</h3>
          <p className="text-sm text-muted-foreground">Atendimento automático 24/7 no WhatsApp</p>
        </Card>
        <Card
          className="glass-card p-5 cursor-pointer hover:border-primary/50 transition-all group"
          onClick={() => navigate("/sales-pipeline")}
        >
          <TrendingUp className="w-6 h-6 text-primary mb-3" />
          <h3 className="font-semibold mb-1">Oportunidades</h3>
          <p className="text-sm text-muted-foreground">Veja seus negócios em andamento</p>
        </Card>
        <Card
          className="glass-card p-5 cursor-pointer hover:border-primary/50 transition-all group"
          onClick={() => navigate("/reports")}
        >
          <Trophy className="w-6 h-6 text-primary mb-3" />
          <h3 className="font-semibold mb-1">Resultados</h3>
          <p className="text-sm text-muted-foreground">Análise completa do seu crescimento</p>
        </Card>
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground text-center">Atualizando seus resultados...</p>
      )}
    </div>
  );
}
