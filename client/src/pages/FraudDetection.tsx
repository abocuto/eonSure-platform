import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RiskBadge, SectionHeader, EmptyState } from "@/components/EonComponents";
import { toast } from "sonner";
import {
  ShieldAlert, AlertTriangle, CheckCircle2, XCircle,
  Eye, Filter, TrendingUp, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type RiskFilter = "all" | "green" | "yellow" | "red";

const INVESTIGATION_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_review: "Em Revisão",
  cleared: "Liberado",
  confirmed_fraud: "Fraude Confirmada",
};

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: "oklch(0.18 0.04 240)",
  border: "1px solid oklch(0.28 0.05 240)",
  borderRadius: "8px",
  color: "oklch(0.93 0.01 240)",
  fontSize: "12px",
};

export default function FraudDetection() {
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [investigationNotes, setInvestigationNotes] = useState("");
  const [investigationStatus, setInvestigationStatus] = useState<string>("in_review");
  const [dialogOpen, setDialogOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: scores, isLoading } = trpc.fraud.getScoresByTenant.useQuery({
    riskLevel: riskFilter === "all" ? undefined : riskFilter,
  });

  const updateInvestigation = trpc.fraud.updateInvestigation.useMutation({
    onSuccess: () => {
      toast.success("Status de investigação atualizado!");
      utils.fraud.getScoresByTenant.invalidate();
      setDialogOpen(false);
      setInvestigationNotes("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleUpdateInvestigation = () => {
    if (!selectedScore) return;
    if (!investigationNotes) { toast.error("Adicione uma nota de investigação"); return; }
    updateInvestigation.mutate({
      scoreId: selectedScore,
      status: investigationStatus as "pending" | "in_review" | "cleared" | "confirmed_fraud",
      notes: investigationNotes,
    });
  };

  // Distribution chart data
  const green = scores?.filter((s) => s.riskLevel === "green").length ?? 0;
  const yellow = scores?.filter((s) => s.riskLevel === "yellow").length ?? 0;
  const red = scores?.filter((s) => s.riskLevel === "red").length ?? 0;
  const total = green + yellow + red;

  const chartData = [
    { name: "Baixo Risco", value: green, fill: "oklch(0.65 0.18 145)" },
    { name: "Risco Médio", value: yellow, fill: "oklch(0.75 0.18 75)" },
    { name: "Alto Risco", value: red, fill: "oklch(0.60 0.22 25)" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Detecção de Fraude"
        subtitle="Painel de investigação com score preditivo de risco"
        icon={ShieldAlert}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Baixo Risco",
            count: green,
            icon: CheckCircle2,
            color: "text-green-400",
            bg: "bg-green-500/10",
            border: "border-green-500/20",
            risk: "green" as const,
          },
          {
            label: "Risco Médio",
            count: yellow,
            icon: AlertTriangle,
            color: "text-yellow-400",
            bg: "bg-yellow-500/10",
            border: "border-yellow-500/20",
            risk: "yellow" as const,
          },
          {
            label: "Alto Risco",
            count: red,
            icon: XCircle,
            color: "text-red-400",
            bg: "bg-red-500/10",
            border: "border-red-500/20",
            risk: "red" as const,
          },
        ].map((item) => {
          const Icon = item.icon;
          const pct = total > 0 ? ((item.count / total) * 100).toFixed(0) : "0";
          return (
            <Card
              key={item.label}
              className={cn(
                "p-5 border cursor-pointer transition-all",
                item.border,
                item.bg,
                riskFilter === item.risk && "ring-2 ring-primary"
              )}
              onClick={() => setRiskFilter(riskFilter === item.risk ? "all" : item.risk)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", item.bg)}>
                  <Icon className={cn("w-5 h-5", item.color)} />
                </div>
                <span className={cn("text-2xl font-black", item.color)}>{item.count}</span>
              </div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{pct}% do total</p>
            </Card>
          );
        })}
      </div>

      {/* Chart + Filter Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 border border-border bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição de Risco</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.05 240)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "oklch(0.60 0.04 240)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "oklch(0.60 0.04 240)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <rect key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 border border-border bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Filtros</h3>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Nível de Risco</p>
              <div className="flex flex-wrap gap-2">
                {(["all", "green", "yellow", "red"] as RiskFilter[]).map((f) => (
                  <Button
                    key={f}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "text-xs h-7 border-border",
                      riskFilter === f && "border-primary text-primary bg-primary/5"
                    )}
                    onClick={() => setRiskFilter(f)}
                  >
                    {f === "all" ? "Todos" : f === "green" ? "Verde" : f === "yellow" ? "Amarelo" : "Vermelho"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <span>Modelo v1.0 · Acurácia 82%</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Scores List */}
      <Card className="border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Painel de Investigação
            {riskFilter !== "all" && (
              <Badge variant="outline" className="ml-2 text-xs border-border text-muted-foreground">
                Filtrado: {riskFilter === "green" ? "Verde" : riskFilter === "yellow" ? "Amarelo" : "Vermelho"}
              </Badge>
            )}
          </h3>
          <span className="text-xs text-muted-foreground">{scores?.length ?? 0} registros</span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-border">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-48 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : scores && scores.length > 0 ? (
          <div className="divide-y divide-border">
            {scores.map((score) => {
              const factors = score.factors as Array<{ name: string; contribution: number }> | null;
              return (
                <div key={score.id} className="px-5 py-4 flex items-center gap-4 hover:bg-accent/20 transition-colors">
                  {/* Score Circle */}
                  <div className={cn(
                    "w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-sm font-bold",
                    score.riskLevel === "green" && "border-green-500 bg-green-500/10 text-green-400",
                    score.riskLevel === "yellow" && "border-yellow-500 bg-yellow-500/10 text-yellow-400",
                    score.riskLevel === "red" && "border-red-500 bg-red-500/10 text-red-400"
                  )}>
                    {Number(score.score).toFixed(0)}%
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">Sinistro #{score.claimId}</span>
                      <RiskBadge level={score.riskLevel} size="sm" />
                      <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                        {INVESTIGATION_STATUS_LABELS[score.investigationStatus ?? "pending"]}
                      </Badge>
                    </div>
                    {factors && factors.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        Principais fatores: {factors.slice(0, 2).map((f) => f.name).join(", ")}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {new Date(score.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-border text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setSelectedScore(score.id);
                        setDialogOpen(true);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Investigar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title="Nenhum score encontrado"
            description="Aplique a análise de risco em sinistros para visualizar os scores aqui."
          />
        )}
      </Card>

      {/* Investigation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-yellow-400" />
              Atualizar Investigação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Status da Investigação</p>
              <Select value={investigationStatus} onValueChange={setInvestigationStatus}>
                <SelectTrigger className="bg-input border-border text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_review">Em Revisão</SelectItem>
                  <SelectItem value="cleared">Liberado</SelectItem>
                  <SelectItem value="confirmed_fraud">Fraude Confirmada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Notas de Investigação *</p>
              <Textarea
                value={investigationNotes}
                onChange={(e) => setInvestigationNotes(e.target.value)}
                placeholder="Descreva os achados da investigação..."
                className="bg-input border-border text-sm min-h-[100px] resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-border text-muted-foreground">
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateInvestigation}
                disabled={updateInvestigation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {updateInvestigation.isPending ? "Salvando..." : "Salvar Investigação"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
