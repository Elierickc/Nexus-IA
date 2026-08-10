import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Users, Target, DollarSign, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface KPI {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  trend: "up" | "down";
}

interface ConversionData {
  stage: string;
  count: number;
  percentage: number;
}

export default function Reports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [conversionData, setConversionData] = useState<ConversionData[]>([]);
  const [dealsByStage, setDealsByStage] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    await loadDashboardData();
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch leads
      const { data: leads } = await supabase
        .from("crm_leads")
        .select("*");

      // Fetch contacts
      const { data: contacts } = await supabase
        .from("crm_contacts")
        .select("*");

      // Fetch deals
      const { data: deals } = await supabase
        .from("crm_deals")
        .select("*");

      // Calculate KPIs
      const totalLeads = leads?.length || 0;
      const totalContacts = contacts?.length || 0;
      const totalDeals = deals?.length || 0;
      const wonDeals = deals?.filter(d => d.stage === "won").length || 0;
      const totalRevenue = deals
        ?.filter(d => d.stage === "won")
        .reduce((sum, d) => sum + (d.value || 0), 0) || 0;
      
      const conversionRate = totalLeads > 0 ? ((totalContacts / totalLeads) * 100).toFixed(1) : 0;
      const winRate = totalDeals > 0 ? ((wonDeals / totalDeals) * 100).toFixed(1) : 0;

      // Set KPIs
      setKpis([
        {
          title: "Total de Leads",
          value: totalLeads,
          change: 12.5,
          icon: <Users className="h-4 w-4" />,
          trend: "up"
        },
        {
          title: "Taxa de Conversão",
          value: `${conversionRate}%`,
          change: 8.2,
          icon: <Target className="h-4 w-4" />,
          trend: "up"
        },
        {
          title: "Receita Total",
          value: `R$ ${totalRevenue.toLocaleString('pt-BR')}`,
          change: 15.3,
          icon: <DollarSign className="h-4 w-4" />,
          trend: "up"
        },
        {
          title: "Taxa de Ganho",
          value: `${winRate}%`,
          change: -2.4,
          icon: <Activity className="h-4 w-4" />,
          trend: "down"
        }
      ]);

      // Calculate conversion funnel
      const funnelData = [
        { stage: "Leads", count: totalLeads, percentage: 100 },
        { stage: "Contatos", count: totalContacts, percentage: totalLeads > 0 ? (totalContacts / totalLeads) * 100 : 0 },
        { stage: "Negociações", count: totalDeals, percentage: totalLeads > 0 ? (totalDeals / totalLeads) * 100 : 0 },
        { stage: "Ganhos", count: wonDeals, percentage: totalLeads > 0 ? (wonDeals / totalLeads) * 100 : 0 }
      ];
      setConversionData(funnelData);

      // Calculate deals by stage
      const stages = [
        { name: "Prospecção", value: "prospecting", color: "#3b82f6" },
        { name: "Qualificado", value: "qualified", color: "#8b5cf6" },
        { name: "Proposta", value: "proposal", color: "#f59e0b" },
        { name: "Negociação", value: "negotiation", color: "#10b981" },
        { name: "Ganho", value: "won", color: "#22c55e" },
        { name: "Perdido", value: "lost", color: "#ef4444" }
      ];

      const stageData = stages.map(stage => ({
        name: stage.name,
        value: deals?.filter(d => d.stage === stage.value).length || 0,
        color: stage.color
      }));
      setDealsByStage(stageData);

      // Calculate revenue over time (last 6 months)
      const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
      const revenueByMonth = months.map((month, index) => ({
        month,
        receita: Math.floor(Math.random() * 50000) + 10000, // Mock data for now
        meta: 40000
      }));
      setRevenueData(revenueByMonth);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Relatórios e Dashboards</h1>
        <p className="text-muted-foreground">
          Acompanhe métricas de performance e análise de conversão
        </p>
      </div>

      {/* KPIs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {kpi.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">{kpi.value}</div>
              <div className="flex items-center text-xs">
                {kpi.trend === "up" ? (
                  <>
                    <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-500">+{kpi.change}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-500">{kpi.change}%</span>
                  </>
                )}
                <span className="text-muted-foreground ml-1">vs. mês anterior</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="conversion" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conversion">Funil de Conversão</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline de Vendas</TabsTrigger>
          <TabsTrigger value="revenue">Receita</TabsTrigger>
        </TabsList>

        <TabsContent value="conversion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Funil de Conversão</CardTitle>
              <CardDescription>
                Visualize a jornada do lead até o fechamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={conversionData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="stage" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="count" fill="hsl(var(--primary))" name="Quantidade" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Conversão por Etapa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {conversionData.map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{item.stage}</span>
                        <span className="text-sm text-muted-foreground">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métricas de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">Tempo Médio de Conversão</span>
                    <span className="text-lg font-bold">14 dias</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">Ticket Médio</span>
                    <span className="text-lg font-bold">R$ 12.500</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">Negócios Ativos</span>
                    <span className="text-lg font-bold">{dealsByStage.reduce((sum, d) => sum + d.value, 0)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">Valor em Pipeline</span>
                    <span className="text-lg font-bold">R$ 245.000</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Etapa</CardTitle>
                <CardDescription>
                  Quantidade de negócios em cada etapa do pipeline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dealsByStage}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dealsByStage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Negócios por Etapa</CardTitle>
                <CardDescription>
                  Análise detalhada do pipeline de vendas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dealsByStage} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" className="text-xs" width={100} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Receita vs Meta</CardTitle>
              <CardDescription>
                Acompanhamento de receita realizada vs meta mensal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => `R$ ${value.toLocaleString('pt-BR')}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="receita" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Receita"
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="meta" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Meta"
                    dot={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Receita do Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ 45.230</div>
                <div className="flex items-center text-xs mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-500">+18.5%</span>
                  <span className="text-muted-foreground ml-1">vs. mês anterior</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Receita Prevista
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ 125.400</div>
                <div className="flex items-center text-xs mt-1">
                  <span className="text-muted-foreground">Baseado em pipeline</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Atingimento da Meta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">113%</div>
                <div className="flex items-center text-xs mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-500">Acima da meta</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
