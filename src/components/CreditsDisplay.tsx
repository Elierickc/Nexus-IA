import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function CreditsDisplay() {
  const { plan } = useAuth();
  const navigate = useNavigate();

  const getPlanLabel = () => {
    if (plan === "pro") return "Pro";
    if (plan === "enterprise") return "Enterprise";
    return "Sem Assinatura";
  };

  const getPlanIcon = () => {
    if (plan === "pro") return Zap;
    if (plan === "enterprise") return Crown;
    return null;
  };

  const getPlanColor = () => {
    if (plan === "pro") return "default";
    if (plan === "enterprise") return "destructive";
    return "secondary";
  };

  if (!plan) return null;

  const Icon = getPlanIcon();
  const hasSubscription = plan === "pro" || plan === "enterprise";

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getPlanColor()} className="flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {getPlanLabel()}
      </Badge>
      {!hasSubscription && (
        <Button
          size="sm"
          variant="default"
          onClick={() => navigate("/pricing")}
        >
          Assinar
        </Button>
      )}
    </div>
  );
}
