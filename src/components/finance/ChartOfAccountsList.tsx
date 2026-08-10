import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
}

const accountTypeLabels = {
  asset: "Ativo",
  liability: "Passivo",
  equity: "Patrimônio Líquido",
  revenue: "Receita",
  expense: "Despesa"
};

export function ChartOfAccountsList() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("finance_chart_of_accounts")
        .select("*")
        .order("code");

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Error loading accounts:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o plano de contas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Carregando plano de contas...</div>;
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma conta cadastrada no plano de contas
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="font-mono">{account.code}</TableCell>
              <TableCell>{account.name}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {accountTypeLabels[account.type as keyof typeof accountTypeLabels] || account.type}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={account.active ? "default" : "secondary"}>
                  {account.active ? "Ativa" : "Inativa"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
