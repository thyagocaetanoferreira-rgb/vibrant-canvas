import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

const KpiCard = ({ label, value, change, changeType = "neutral", icon: Icon, iconColor }: KpiCardProps) => {
  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-heading font-bold text-card-foreground mt-1">{value}</p>
          {change && (
            <p className={cn(
              "text-xs mt-2 font-medium",
              changeType === "positive" && "text-success",
              changeType === "negative" && "text-destructive",
              changeType === "neutral" && "text-muted-foreground",
            )}>
              {change}
            </p>
          )}
        </div>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconColor || "bg-primary/10")}>
          <Icon className={cn("w-5 h-5", iconColor ? "text-card" : "text-primary")} />
        </div>
      </div>
    </div>
  );
};

export default KpiCard;
