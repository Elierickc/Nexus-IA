import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, LucideIcon, Sparkles } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  ctaLabel: string;
  onCta: () => void;
  variant?: "default" | "compact";
}

export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  ctaLabel,
  onCta,
  variant = "default",
}: EmptyStateProps) {
  return (
    <Card
      className={`glass-card border-primary/20 flex flex-col items-center justify-center text-center ${
        variant === "compact" ? "p-6" : "p-10"
      }`}
    >
      <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-5">{description}</p>
      <Button onClick={onCta} className="bg-primary hover:bg-primary/90 group">
        {ctaLabel}
        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </Button>
    </Card>
  );
}
