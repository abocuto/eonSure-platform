import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { RiskLevel, ClaimStatus } from "../../../shared/types";
import { RISK_LABELS, CLAIM_STATUS_LABELS } from "../../../shared/types";

// ─── Risk Badge ───────────────────────────────────────────────────────────────
interface RiskBadgeProps {
  level: RiskLevel;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function RiskBadge({ level, showLabel = true, size = "md" }: RiskBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  const dotSize = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        sizeClasses[size],
        level === "green" && "risk-green",
        level === "yellow" && "risk-yellow",
        level === "red" && "risk-red"
      )}
    >
      <span
        className={cn(
          "rounded-full flex-shrink-0",
          dotSize[size],
          level === "green" && "bg-green-400",
          level === "yellow" && "bg-yellow-400",
          level === "red" && "bg-red-400"
        )}
      />
      {showLabel && RISK_LABELS[level]}
    </span>
  );
}

// ─── Status Pill ──────────────────────────────────────────────────────────────
interface StatusPillProps {
  status: ClaimStatus;
  size?: "sm" | "md";
}

const STATUS_COLORS: Record<ClaimStatus, string> = {
  ingestion: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  triage: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  risk_analysis: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  investigation: "bg-red-500/10 text-red-400 border-red-500/30",
  resolution: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  closed: "bg-green-500/10 text-green-400 border-green-500/30",
  rejected: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

export function StatusPill({ status, size = "md" }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium border",
        size === "sm" ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1",
        STATUS_COLORS[status]
      )}
    >
      {CLAIM_STATUS_LABELS[status]}
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;
  trendLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  highlight?: boolean;
}

export function KpiCard({
  title, value, unit, trend, trendLabel, icon: Icon, description, highlight,
}: KpiCardProps) {
  const trendPositive = trend !== undefined && trend > 0;
  const trendNegative = trend !== undefined && trend < 0;

  return (
    <Card
      className={cn(
        "p-5 border transition-all duration-200",
        highlight
          ? "border-primary/40 bg-primary/5 eon-glow-sm"
          : "border-border bg-card hover:border-primary/20"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          highlight ? "bg-primary/20" : "bg-accent"
        )}>
          <Icon className={cn("w-5 h-5", highlight ? "text-primary" : "text-muted-foreground")} />
        </div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            trendPositive && "text-green-400 bg-green-500/10",
            trendNegative && "text-red-400 bg-red-500/10",
            !trendPositive && !trendNegative && "text-muted-foreground bg-muted/50"
          )}>
            {trendPositive ? <TrendingUp className="w-3 h-3" /> : trendNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-foreground">
          {value}
          {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
        </p>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground/70">{description}</p>}
        {trendLabel && (
          <p className="text-xs text-muted-foreground/60">{trendLabel}</p>
        )}
      </div>
    </Card>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}

export function SectionHeader({ title, subtitle, actions, icon: Icon }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}

// ─── Pillar Badge ─────────────────────────────────────────────────────────────
interface PillarBadgeProps {
  active: boolean;
  label: string;
}

export function PillarBadge({ active, label }: PillarBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs",
        active
          ? "border-primary/40 text-primary bg-primary/5"
          : "border-border text-muted-foreground bg-transparent"
      )}
    >
      <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", active ? "bg-primary" : "bg-muted-foreground/40")} />
      {label}
    </Badge>
  );
}
