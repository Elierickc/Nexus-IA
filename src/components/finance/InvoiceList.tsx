import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total: number;
  status: string;
  client_id: string | null;
}

interface InvoiceListProps {
  onRefresh?: () => void;
}

const statusColors = {
  draft: "secondary",
  pending: "outline",
  paid: "default",
  overdue: "destructive",
  cancelled: "destructive"
} as const;

const statusLabels = {
  draft: "Rascunho",
  pending: "Pendente",
  paid: "Pago",
  overdue: "Vencido",
  cancelled: "Cancelado"
};

export function InvoiceList({ onRefresh }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("finance_invoices")
        .select("*")
        .order("issue_date", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error loading invoices:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as faturas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta fatura?")) return;

    try {
      const { error } = await supabase
        .from("finance_invoices")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Fatura excluída com sucesso"
      });

      loadInvoices();
      onRefresh?.();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a fatura",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="text-center py-4">Carregando faturas...</div>;
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma fatura cadastrada
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Emissão</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
              <TableCell>
                {format(new Date(invoice.issue_date), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell>
                {format(new Date(invoice.due_date), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell>
                <Badge variant={statusColors[invoice.status as keyof typeof statusColors] || "secondary"}>
                  {statusLabels[invoice.status as keyof typeof statusLabels] || invoice.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                R$ {Number(invoice.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(invoice.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
