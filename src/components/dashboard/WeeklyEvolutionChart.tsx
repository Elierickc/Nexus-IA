import { Card } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface WeekPoint {
  week: string;
  leads: number;
  won: number;
  revenue: number;
}

export function WeeklyEvolutionChart({ data }: { data: WeekPoint[] }) {
  return (
    <Card className="glass-card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Evolução semanal</h3>
        <p className="text-sm text-muted-foreground">Leads gerados e vendas fechadas nas últimas 8 semanas</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gWon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(142 76% 56%)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="hsl(142 76% 56%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
              }}
            />
            <Area type="monotone" dataKey="leads" name="Leads" stroke="hsl(var(--primary))" fill="url(#gLeads)" strokeWidth={2} />
            <Area type="monotone" dataKey="won" name="Vendas" stroke="hsl(142 76% 56%)" fill="url(#gWon)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
