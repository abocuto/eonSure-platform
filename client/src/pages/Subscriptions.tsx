import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/EonComponents";
import { toast } from "sonner";
import {
  Settings, Database, GitBranch, ShieldAlert, BarChart3,
  CheckCircle2, Lock, Zap, Crown, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PILLAR_LABELS, PILLAR_DESCRIPTIONS, PILLAR_ICONS } from "../../../shared/types";
import type { Pillar } from "../../../shared/types";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "R$ 2.990",
    period: "/mês",
    description: "Para seguradoras que estão começando a digitalizar operações",
    pillars: ["pillarEonicData"],
    features: ["Até 500 sinistros/mês", "1 tenant", "Suporte por e-mail"],
    icon: Building2,
  },
  {
    id: "professional",
    name: "Professional",
    price: "R$ 7.990",
    period: "/mês",
    description: "Para operações que precisam de automação e controle de fraude",
    pillars: ["pillarEonicData", "pillarRulesEngine", "pillarFraudML"],
    features: ["Até 5.000 sinistros/mês", "Multi-tenant", "Suporte prioritário"],
    icon: Zap,
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Sob consulta",
    period: "",
    description: "Para grandes seguradoras com necessidades avançadas de IA preditiva",
    pillars: ["pillarEonicData", "pillarRulesEngine", "pillarFraudML", "pillarPredictive"],
    features: ["Sinistros ilimitados", "White-label", "SLA dedicado", "Treinamento personalizado"],
    icon: Crown,
  },
];

const PILLAR_ICON_MAP: Record<Pillar, React.ComponentType<{ className?: string }>> = {
  pillarEonicData: Database,
  pillarRulesEngine: GitBranch,
  pillarFraudML: ShieldAlert,
  pillarPredictive: BarChart3,
};

export default function Subscriptions() {
  const { user } = useAuth();
  const isCio = user?.persona === "cio" || user?.role === "admin";

  const utils = trpc.useUtils();
  const { data: subscription, isLoading } = trpc.subscriptions.getMine.useQuery();

  const updateSubscription = trpc.subscriptions.update.useMutation({
    onSuccess: () => {
      toast.success("Assinatura atualizada com sucesso!");
      utils.subscriptions.getMine.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleTogglePillar = (pillar: Pillar, value: boolean) => {
    if (!isCio) { toast.error("Apenas o CIO pode gerenciar os pilares"); return; }
    updateSubscription.mutate({ [pillar]: value });
  };

  const handleChangePlan = (plan: string) => {
    if (!isCio) { toast.error("Apenas o CIO pode alterar o plano"); return; }
    updateSubscription.mutate({ plan: plan as "starter" | "professional" | "enterprise" });
  };

  const currentPlan = subscription?.plan ?? "starter";

  const pillars: Pillar[] = ["pillarEonicData", "pillarRulesEngine", "pillarFraudML", "pillarPredictive"];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Assinaturas & Pilares"
        subtitle="Gestão modular dos pilares tecnológicos por tenant"
        icon={Settings}
      />

      {!isCio && (
        <Card className="p-4 border border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="text-sm text-yellow-300">
              Apenas o <strong>CIO / Diretor de Tecnologia</strong> pode gerenciar assinaturas e ativar pilares.
              Você está em modo de visualização.
            </p>
          </div>
        </Card>
      )}

      {/* Current Plan */}
      <Card className="p-5 border border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plano Atual</p>
              <p className="text-lg font-bold text-foreground capitalize">{currentPlan}</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              subscription?.status === "active" ? "border-green-500/30 text-green-400 bg-green-500/5" :
              subscription?.status === "trial" ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/5" :
              "border-border text-muted-foreground"
            )}
          >
            {subscription?.status === "active" ? "Ativo" :
             subscription?.status === "trial" ? "Trial" :
             subscription?.status === "suspended" ? "Suspenso" : "—"}
          </Badge>
        </div>
      </Card>

      {/* Pillar Activation */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Ativação Modular dos Pilares</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : (
            pillars.map((pillar) => {
              const Icon = PILLAR_ICON_MAP[pillar];
              const isActive = subscription?.[pillar] ?? false;
              return (
                <Card
                  key={pillar}
                  className={cn(
                    "p-4 border transition-all",
                    isActive ? "border-primary/30 bg-primary/5" : "border-border bg-card opacity-70"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                        isActive ? "bg-primary/20" : "bg-accent"
                      )}>
                        <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">
                          {PILLAR_LABELS[pillar]}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {PILLAR_DESCRIPTIONS[pillar]}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isActive}
                      onCheckedChange={(v) => handleTogglePillar(pillar, v)}
                      disabled={!isCio || updateSubscription.isPending}
                      className="flex-shrink-0"
                    />
                  </div>
                  {isActive && (
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-primary/10">
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-green-400">Pilar ativo</span>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Plan Selection */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Planos Disponíveis</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = currentPlan === plan.id;
            return (
              <Card
                key={plan.id}
                className={cn(
                  "p-5 border transition-all relative",
                  isCurrent ? "border-primary bg-primary/5" : "border-border bg-card",
                  plan.popular && !isCurrent && "border-primary/30"
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs">
                    Popular
                  </Badge>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    isCurrent ? "bg-primary/20" : "bg-accent"
                  )}>
                    <Icon className={cn("w-4 h-4", isCurrent ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <span className="text-sm font-bold text-foreground">{plan.name}</span>
                </div>

                <div className="mb-3">
                  <span className="text-xl font-black text-foreground">{plan.price}</span>
                  <span className="text-xs text-muted-foreground">{plan.period}</span>
                </div>

                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{plan.description}</p>

                <div className="space-y-1.5 mb-4">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pilares Incluídos</p>
                  {plan.pillars.map((p) => {
                    const PIcon = PILLAR_ICON_MAP[p as Pillar];
                    return (
                      <div key={p} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <PIcon className="w-3 h-3 text-primary" />
                        {PILLAR_LABELS[p as Pillar]}
                      </div>
                    );
                  })}
                </div>

                {isCurrent ? (
                  <Badge className="w-full justify-center bg-primary/10 text-primary border-primary/30 text-xs">
                    Plano Atual
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-border text-muted-foreground hover:text-foreground"
                    onClick={() => handleChangePlan(plan.id)}
                    disabled={!isCio || updateSubscription.isPending}
                  >
                    {isCio ? "Selecionar Plano" : <><Lock className="w-3 h-3 mr-1.5" />Restrito ao CIO</>}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
