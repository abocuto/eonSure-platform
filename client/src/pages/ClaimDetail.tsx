import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { RiskBadge, StatusPill, SectionHeader } from "@/components/EonComponents";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, ClipboardList, ShieldAlert, BarChart3, GitBranch,
  CheckCircle2, XCircle, ArrowRight, Clock, User, Zap,
  AlertTriangle, FileText, Loader2, Sparkles,
} from "lucide-react";
import { CLAIM_TYPE_LABELS, CLAIM_STATUS_LABELS, CLAIM_STATUS_ORDER } from "../../../shared/types";
import type { ClaimType, ClaimStatus } from "../../../shared/types";
import { cn } from "@/lib/utils";

const STATUS_NEXT: Partial<Record<ClaimStatus, ClaimStatus>> = {
  ingestion: "triage",
  triage: "risk_analysis",
  risk_analysis: "resolution",
  resolution: "closed",
};

interface ClaimDetailProps {
  id: number;
}

export default function ClaimDetail({ id }: ClaimDetailProps) {
  const [notes, setNotes] = useState("");
  const [aiProcessing, setAiProcessing] = useState(false);
  const utils = trpc.useUtils();

  // Polling interval: 3s when AI is processing, 0 (disabled) otherwise
  const pollInterval = aiProcessing ? 3000 : 0;

  const { data: claim, isLoading } = trpc.claims.getById.useQuery(
    { id },
    { refetchInterval: pollInterval }
  );
  const { data: events } = trpc.claims.getEvents.useQuery(
    { claimId: id },
    { refetchInterval: pollInterval }
  );
  const { data: ruleLogs } = trpc.rules.getLogs.useQuery(
    { claimId: id },
    { refetchInterval: pollInterval }
  );
  const { data: fraudScores } = trpc.fraud.getScoresByClaim.useQuery(
    { claimId: id },
    { refetchInterval: pollInterval }
  );
  const { data: prediction } = trpc.analytics.getPredictiveAnalysis.useQuery(
    { claimId: id },
    { refetchInterval: pollInterval }
  );

  // Stop polling once fraud score and events are populated
  useEffect(() => {
    if (aiProcessing && fraudScores && fraudScores.length > 0) {
      setAiProcessing(false);
    }
  }, [aiProcessing, fraudScores]);

  const advanceStatus = trpc.claims.advanceStatus.useMutation({
    onSuccess: (_, vars) => {
      toast.success("Status atualizado com sucesso!");
      utils.claims.getById.invalidate({ id });
      utils.claims.getEvents.invalidate({ claimId: id });
      setNotes("");
      // If advancing to risk_analysis, start polling for auto-prediction
      if (vars.status === "risk_analysis") {
        setAiProcessing(true);
        toast.info("Análise preditiva sendo gerada automaticamente...", { duration: 4000 });
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const analyzeRisk = trpc.fraud.analyzeRisk.useMutation({
    onSuccess: (data) => {
      toast.success(`Score de risco calculado: ${data.score.toFixed(0)}% (${data.riskLevel.toUpperCase()})`);
      utils.claims.getById.invalidate({ id });
      utils.fraud.getScoresByClaim.invalidate({ claimId: id });
    },
    onError: (err) => toast.error(err.message),
  });

  const applyRules = trpc.rules.applyToClaimSimulate.useMutation({
    onSuccess: (results) => {
      const triggered = results.filter((r) => r.conditionsMet).length;
      toast.success(`Motor de Regras executado: ${triggered} regra(s) ativada(s)`);
      utils.rules.getLogs.invalidate({ claimId: id });
    },
    onError: (err) => toast.error(err.message),
  });

  const generatePrediction = trpc.analytics.generatePrediction.useMutation({
    onSuccess: () => {
      toast.success("Análise preditiva gerada com sucesso!");
      utils.analytics.getPredictiveAnalysis.invalidate({ claimId: id });
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Sinistro não encontrado.</p>
        <Link href="/claims">
          <Button variant="outline" className="mt-4">Voltar para Sinistros</Button>
        </Link>
      </div>
    );
  }

  const nextStatus = STATUS_NEXT[claim.status as ClaimStatus];
  const latestFraud = fraudScores?.[0];

  return (
    <div className="space-y-6">
      <SectionHeader
        title={claim.claimNumber}
        subtitle={`${claim.insuredName ?? "—"} · ${CLAIM_TYPE_LABELS[claim.claimType as ClaimType]}`}
        icon={ClipboardList}
        actions={
          <Link href="/claims">
            <Button variant="outline" size="sm" className="border-border text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Voltar
            </Button>
          </Link>
        }
      />

      {/* AI Processing Banner */}
      {aiProcessing && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-primary/30 bg-primary/5 text-sm text-primary animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>
            <strong>Pipeline de IA em execução</strong> — Motor de Regras e Score de Fraude sendo processados automaticamente...
          </span>
        </div>
      )}

      {/* Lifecycle Progress */}
      <Card className="p-5 border border-border bg-card">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Ciclo de Vida do Sinistro
        </h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {CLAIM_STATUS_ORDER.map((status, i) => {
            const currentIdx = CLAIM_STATUS_ORDER.indexOf(claim.status as ClaimStatus);
            const isDone = i < currentIdx;
            const isCurrent = i === currentIdx;
            const isFuture = i > currentIdx;
            return (
              <div key={status} className="flex items-center gap-1 flex-shrink-0">
                <div className={cn(
                  "flex flex-col items-center gap-1.5",
                  isFuture && "opacity-40"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                    isDone && "bg-green-500/20 border-green-500 text-green-400",
                    isCurrent && "bg-primary/20 border-primary text-primary",
                    isFuture && "bg-muted border-muted-foreground/20 text-muted-foreground"
                  )}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={cn(
                    "text-xs font-medium whitespace-nowrap",
                    isCurrent ? "text-primary" : isDone ? "text-green-400" : "text-muted-foreground"
                  )}>
                    {CLAIM_STATUS_LABELS[status]}
                  </span>
                </div>
                {i < CLAIM_STATUS_ORDER.length - 1 && (
                  <div className={cn(
                    "w-8 h-px flex-shrink-0 mb-4",
                    i < currentIdx ? "bg-green-500/50" : "bg-border"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Claim Info */}
        <Card className="p-5 border border-border bg-card space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Informações do Sinistro
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusPill status={claim.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Risco de Fraude</span>
              {aiProcessing && !claim.fraudRisk ? (
                <span className="flex items-center gap-1 text-xs text-primary">
                  <Loader2 className="w-3 h-3 animate-spin" /> Calculando...
                </span>
              ) : claim.fraudRisk ? (
                <RiskBadge level={claim.fraudRisk as "green" | "yellow" | "red"} />
              ) : (
                <span className="text-muted-foreground text-xs">Não analisado</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo</span>
              <span className="text-foreground">{CLAIM_TYPE_LABELS[claim.claimType as ClaimType]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor Reclamado</span>
              <span className="text-foreground font-medium">
                {claim.claimedAmount
                  ? `R$ ${Number(claim.claimedAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                  : "—"}
              </span>
            </div>
            {claim.approvedAmount && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Aprovado</span>
                <span className="text-green-400 font-medium">
                  R$ {Number(claim.approvedAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {claim.suggestedAmount && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sugestão IA</span>
                <span className="text-primary font-medium">
                  R$ {Number(claim.suggestedAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Registrado em</span>
              <span className="text-foreground text-xs">
                {new Date(claim.createdAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>

          {/* AI Actions — Manual override still available */}
          <div className="pt-3 border-t border-border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              Ações de IA (Manual)
            </p>
            <p className="text-xs text-muted-foreground/60">
              O pipeline automático executa na criação. Use abaixo para re-executar manualmente.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-border text-muted-foreground hover:text-foreground justify-start"
              onClick={() => applyRules.mutate({ claimId: id })}
              disabled={applyRules.isPending}
            >
              {applyRules.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              ) : (
                <GitBranch className="w-3.5 h-3.5 mr-2 text-primary" />
              )}
              {applyRules.isPending ? "Aplicando..." : "Re-aplicar Motor de Regras"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-border text-muted-foreground hover:text-foreground justify-start"
              onClick={() => analyzeRisk.mutate({ claimId: id })}
              disabled={analyzeRisk.isPending}
            >
              {analyzeRisk.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 mr-2 text-yellow-400" />
              )}
              {analyzeRisk.isPending ? "Analisando..." : "Re-analisar Risco de Fraude"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-border text-muted-foreground hover:text-foreground justify-start"
              onClick={() => generatePrediction.mutate({ claimId: id })}
              disabled={generatePrediction.isPending}
            >
              {generatePrediction.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="w-3.5 h-3.5 mr-2 text-purple-400" />
              )}
              {generatePrediction.isPending ? "Gerando..." : "Re-gerar Análise Preditiva"}
            </Button>
          </div>
        </Card>

        {/* Fraud Score */}
        <Card className="p-5 border border-border bg-card space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-yellow-400" />
            Score de Risco de Fraude
          </h3>
          {aiProcessing && !latestFraud ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-primary font-medium">Calculando score de risco...</p>
              <p className="text-xs text-muted-foreground">O modelo de IA está analisando os dados do sinistro</p>
            </div>
          ) : latestFraud ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-black text-foreground">{Number(latestFraud.score).toFixed(0)}%</p>
                  <RiskBadge level={latestFraud.riskLevel} size="lg" />
                </div>
                <div className={cn(
                  "w-16 h-16 rounded-full border-4 flex items-center justify-center",
                  latestFraud.riskLevel === "green" && "border-green-500 bg-green-500/10",
                  latestFraud.riskLevel === "yellow" && "border-yellow-500 bg-yellow-500/10",
                  latestFraud.riskLevel === "red" && "border-red-500 bg-red-500/10"
                )}>
                  {latestFraud.riskLevel === "green" ? (
                    <CheckCircle2 className="w-7 h-7 text-green-400" />
                  ) : latestFraud.riskLevel === "yellow" ? (
                    <AlertTriangle className="w-7 h-7 text-yellow-400" />
                  ) : (
                    <XCircle className="w-7 h-7 text-red-400" />
                  )}
                </div>
              </div>

              {/* Risk Factors */}
              {Array.isArray(latestFraud.factors) && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fatores de Risco</p>
                  {(latestFraud.factors as Array<{ name: string; weight: number; contribution: number }>).map((factor, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{factor.name}</span>
                        <span className="text-foreground">{(factor.contribution * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${factor.contribution * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                Investigação: {latestFraud.investigationStatus === "pending" ? "Pendente" :
                  latestFraud.investigationStatus === "in_review" ? "Em Revisão" :
                  latestFraud.investigationStatus === "cleared" ? "Liberado" : "Fraude Confirmada"}
              </Badge>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShieldAlert className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Score não calculado</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Use "Re-analisar Risco de Fraude" para calcular</p>
            </div>
          )}
        </Card>

        {/* Predictive Analysis */}
        <Card className="p-5 border border-border bg-card space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            Análise Preditiva
          </h3>
          {prediction ? (
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Sugestão de Indenização</p>
                <p className="text-xl font-bold text-primary">
                  R$ {Number(prediction.suggestedAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo Final Previsto</span>
                <span className="text-foreground font-medium">
                  R$ {Number(prediction.predictedFinalCost).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prob. de Litígio</span>
                <span className={cn(
                  "font-medium",
                  Number(prediction.litigationProbability) > 0.3 ? "text-red-400" : "text-green-400"
                )}>
                  {(Number(prediction.litigationProbability) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TMR Previsto</span>
                <span className="text-foreground">{prediction.predictedResolutionDays} dias</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confiança do Modelo</span>
                <span className="text-foreground">{(Number(prediction.confidenceScore) * 100).toFixed(0)}%</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Análise não gerada</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Gerada automaticamente ao avançar para Análise de Risco</p>
            </div>
          )}
        </Card>
      </div>

      {/* Advance Status */}
      {nextStatus && claim.status !== "closed" && claim.status !== "rejected" && (
        <Card className="p-5 border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Avançar para próxima etapa</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {CLAIM_STATUS_LABELS[claim.status as ClaimStatus]} → {CLAIM_STATUS_LABELS[nextStatus]}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => advanceStatus.mutate({ id, status: "rejected", notes: notes || "Sinistro rejeitado" })}
                disabled={advanceStatus.isPending}
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Rejeitar
              </Button>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => advanceStatus.mutate({ id, status: nextStatus, notes })}
                disabled={advanceStatus.isPending}
              >
                {advanceStatus.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : null}
                Avançar
                {!advanceStatus.isPending && <ArrowRight className="w-4 h-4 ml-1.5" />}
              </Button>
            </div>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Adicione uma observação sobre esta transição (opcional)..."
            className="mt-3 bg-background border-border text-sm min-h-[60px] resize-none"
          />
        </Card>
      )}

      {/* Rule Logs */}
      {ruleLogs && ruleLogs.length > 0 && (
        <Card className="border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Log de Explicabilidade — Motor de Regras</h3>
          </div>
          <div className="divide-y divide-border">
            {ruleLogs.map((log) => (
              <div key={log.id} className="px-5 py-3">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    log.conditionsMet ? "bg-green-500/20" : "bg-muted"
                  )}>
                    {log.conditionsMet ? (
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    ) : (
                      <XCircle className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-foreground">{log.ruleName}</span>
                      {log.conditionsMet && log.actionTaken && (
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">
                          {log.actionTaken}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{log.explanation}</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Timeline */}
      {events && events.length > 0 && (
        <Card className="border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Timeline do Sinistro</h3>
          </div>
          <div className="p-5 space-y-4">
            {events.map((event, i) => (
              <div key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                    event.isAutomated ? "bg-primary/20" : "bg-accent"
                  )}>
                    {event.isAutomated ? (
                      <Zap className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                  {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-foreground">{event.description}</span>
                    {event.isAutomated && (
                      <Badge variant="outline" className="text-xs border-primary/20 text-primary/70 bg-primary/5">
                        Automático
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {event.performedByName ?? "Sistema"} · {new Date(event.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
