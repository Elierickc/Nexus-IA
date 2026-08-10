import { DollarSign, User, Building2, Calendar, Percent } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Deal {
  id: string;
  title: string;
  value: number;
  probability: number;
  close_date: string | null;
  currency: string;
  contact?: { first_name: string; last_name: string };
  account?: { name: string };
}

interface DealCardProps {
  deal: Deal;
  onEdit: () => void;
  isDragging?: boolean;
}

export function DealCard({ deal, onEdit, isDragging }: DealCardProps) {
  return (
    <Card
      className={`cursor-pointer hover:shadow-lg transition-all ${
        isDragging ? "rotate-2 shadow-2xl" : ""
      }`}
      onClick={onEdit}
    >
      <CardContent className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-foreground mb-1 line-clamp-2">{deal.title}</h4>
          <div className="flex items-center gap-1 text-lg font-bold text-primary">
            <DollarSign className="h-4 w-4" />
            {deal.value.toLocaleString("pt-BR", {
              style: "currency",
              currency: deal.currency || "BRL",
            })}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {deal.contact && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">
                {deal.contact.first_name} {deal.contact.last_name}
              </span>
            </div>
          )}

          {deal.account && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span className="truncate">{deal.account.name}</span>
            </div>
          )}

          {deal.close_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {format(new Date(deal.close_date), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Percent className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="secondary" className="text-xs">
              {deal.probability}% chance
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
