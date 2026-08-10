import { Card } from "@/components/ui/card";
import { LucideIcon, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultCardProps {
  label: string;
  value: string | number;
  previous?: number;
  current?: number;
  icon: LucideIcon;
  accent?: string;
  prefix?: string;
}

export function ResultCard({ label, value, previous = 0, current = 0, icon: Icon, accent = "text-primary", prefix }: ResultCardProps) {
  let pct: number | null = null;
  if (previous > 0) pct = Math.round(((current - previous) / previous) * 100);
  else if (current > 0) pct = 100;

  const trend = pct === null ? "flat" : pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up" ? "text-emerald-400" : trend === "down" ? "text-rose-400" : "text-muted-foreground";

  return (
    <Card className="glass-card p-5 hover:border-primary/40 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-lg bg-primary/15 border border-primary/20", accent)}>
          <Icon className="w-5 h-5" />
        </div>
        {pct !== null && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
            <TrendIcon className="w-3 h-3" />
            {pct > 0 ? "+" : ""}
            {pct}%
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold">
        {prefix}
        {value}
      </p>
    </Card>
  );
}
