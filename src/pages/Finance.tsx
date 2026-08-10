import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Wallet,
  Receipt,
  FileText,
  Plus
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpenseList } from "@/components/finance/ExpenseList";
import { InvoiceList } from "@/components/finance/InvoiceList";
import { ChartOfAccountsList } from "@/components/finance/ChartOfAccountsList";
import { CreateExpenseDialog } from "@/components/finance/CreateExpenseDialog";
import { CreateInvoiceDialog } from "@/components/finance/CreateInvoiceDialog";
import { SubscriptionList } from "@/components/finance/SubscriptionList";
import { CreateSubscriptionDialog } from "@/components/finance/CreateSubscriptionDialog";
import { SubscriptionReminders } from "@/components/finance/SubscriptionReminders";

interface FinancialKPI {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  trend: "up" | "down";
}

export default function Finance() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<FinancialKPI[]>([]);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    await loadFinancialData();
  };

  const loadFinancialData = async () => {
    try {
      setLoading(true);

      // Fetch expenses
      const { data: expenses } = await supabase
        .from("finance_expenses")
        .select("amount, expense_date");

      // Fetch invoices
      const { data: invoices } = await supabase
        .from("finance_invoices")
        .select("total, status, issue_date");

      // Fetch payments
      const { data: payments } = await supabase
        .from("finance_payments")
        .select("amount, payment_date");

      // Fetch subscriptions
      const { data: subscriptions } = await supabase
        .from("finance_subscriptions")
        .select("amount, status")
        .eq("status", "active");

      // Calculate totals
      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const totalInvoices = invoices?.reduce((sum, i) => sum + Number(i.total), 0) || 0;
      const paidInvoices = invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.total), 0) || 0;
      const pendingInvoices = invoices?.filter(i => i.status === 'pending').reduce((sum, i) => sum + Number(i.total), 0) || 0;
      const monthlyRecurringRevenue = subscriptions?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;

      setKpis([
        {
          title: "Receita Total",
          value: `R$ ${paidInvoices.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          change: 12.5,
          icon: <DollarSign className="h-4 w-4" />,
          trend: "up"
        },
        {
          title: "Despesas Totais",
          value: `R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          change: -5.2,
          icon: <CreditCard className="h-4 w-4" />,
          trend: "down"
        },
        {
          title: "Saldo",
          value: `R$ ${(paidInvoices - totalExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          change: 18.3,
          icon: <Wallet className="h-4 w-4" />,
          trend: "up"
        },
        {
          title: "A Receber",
          value: `R$ ${pendingInvoices.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          change: 0,
          icon: <Receipt className="h-4 w-4" />,
          trend: "up"
        },
        {
          title: "Receita Recorrente (MRR)",
          value: `R$ ${monthlyRecurringRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          change: 0,
          icon: <FileText className="h-4 w-4" />,
          trend: "up"
        }
      ]);

    } catch (error) {
      console.error("Error loading financial data:", error);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestão Financeira</h1>
          <p className="text-muted-foreground">
            Controle completo de receitas, despesas e fluxo de caixa
          </p>
        </div>
      </div>

      {/* Subscription Reminders */}
      <SubscriptionReminders />

      {/* KPIs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
              {kpi.change !== 0 && (
                <div className="flex items-center text-xs">
                  {kpi.trend === "up" ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-green-500">+{kpi.change}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                      <span className="text-red-500">{kpi.change}%</span>
                    </>
                  )}
                  <span className="text-muted-foreground ml-1">vs. mês anterior</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="invoices">Faturas</TabsTrigger>
          <TabsTrigger value="accounts">Plano de Contas</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Assinaturas Recorrentes</CardTitle>
                  <CardDescription>
                    Gerenciar clientes com pagamentos recorrentes
                  </CardDescription>
                </div>
                <Button onClick={() => setShowSubscriptionDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Assinatura
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <SubscriptionList onRefresh={loadFinancialData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Despesas</CardTitle>
                  <CardDescription>
                    Gerenciar todas as despesas do negócio
                  </CardDescription>
                </div>
                <Button onClick={() => setShowExpenseDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Despesa
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ExpenseList onRefresh={loadFinancialData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Faturas</CardTitle>
                  <CardDescription>
                    Gerenciar faturas emitidas e recebimentos
                  </CardDescription>
                </div>
                <Button onClick={() => setShowInvoiceDialog(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Nova Fatura
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <InvoiceList onRefresh={loadFinancialData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plano de Contas</CardTitle>
              <CardDescription>
                Estrutura de categorização contábil
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartOfAccountsList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateExpenseDialog 
        open={showExpenseDialog}
        onOpenChange={setShowExpenseDialog}
        onSuccess={loadFinancialData}
      />

      <CreateInvoiceDialog 
        open={showInvoiceDialog}
        onOpenChange={setShowInvoiceDialog}
        onSuccess={loadFinancialData}
      />

      <CreateSubscriptionDialog 
        open={showSubscriptionDialog}
        onOpenChange={setShowSubscriptionDialog}
        onSuccess={loadFinancialData}
      />
    </div>
  );
}
