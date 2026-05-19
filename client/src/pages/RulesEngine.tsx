import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SectionHeader, EmptyState } from "@/components/EonComponents";
import { toast } from "sonner";
import {
  GitBranch, Plus, Trash2, Edit2, CheckCircle2, XCircle,
  ChevronRight, Zap, Clock, ToggleLeft, ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FIELDS = [
  { value: "claimType", label: "Tipo de Sinistro" },
  { value: "claimedAmount", label: "Valor Reclamado" },
  { value: "fraudRisk", label: "Risco de Fraude" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Prioridade" },
];

const OPERATORS = [
  { value: "equals", label: "igual a" },
  { value: "not_equals", label: "diferente de" },
  { value: "greater_than", label: "maior que" },
  { value: "less_than", label: "menor que" },
  { value: "contains", label: "contém" },
];

const ACTIONS = [
  { value: "auto_approve", label: "Aprovar Automaticamente", color: "text-green-400" },
  { value: "auto_reject", label: "Rejeitar Automaticamente", color: "text-red-400" },
  { value: "escalate", label: "Escalar para Gerente", color: "text-yellow-400" },
  { value: "flag_fraud", label: "Sinalizar como Fraude", color: "text-red-400" },
  { value: "assign_to_perito", label: "Atribuir a Perito", color: "text-blue-400" },
  { value: "request_documents", label: "Solicitar Documentos", color: "text-purple-400" },
  { value: "notify", label: "Enviar Notificação", color: "text-cyan-400" },
];

type Condition = {
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "in";
  value: string;
};

const DEFAULT_CONDITION: Condition = { field: "claimType", operator: "equals", value: "" };

export default function RulesEngine() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    priority: 0,
    conditions: [{ ...DEFAULT_CONDITION }] as Condition[],
    action: "escalate" as const,
  });

  const utils = trpc.useUtils();
  const { data: rules, isLoading } = trpc.rules.list.useQuery();
  const { data: logs } = trpc.rules.getLogs.useQuery({ limit: 20 });

  const createRule = trpc.rules.create.useMutation({
    onSuccess: () => {
      toast.success("Regra criada com sucesso!");
      utils.rules.list.invalidate();
      setDialogOpen(false);
      setNewRule({ name: "", description: "", priority: 0, conditions: [{ ...DEFAULT_CONDITION }], action: "escalate" });
    },
    onError: (err) => toast.error(err.message),
  });

  const updateRule = trpc.rules.update.useMutation({
    onSuccess: () => {
      toast.success("Regra atualizada!");
      utils.rules.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteRule = trpc.rules.delete.useMutation({
    onSuccess: () => {
      toast.success("Regra removida!");
      utils.rules.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const addCondition = () => {
    setNewRule((r) => ({ ...r, conditions: [...r.conditions, { ...DEFAULT_CONDITION }] }));
  };

  const removeCondition = (i: number) => {
    setNewRule((r) => ({ ...r, conditions: r.conditions.filter((_, idx) => idx !== i) }));
  };

  const updateCondition = (i: number, field: keyof Condition, value: string) => {
    setNewRule((r) => ({
      ...r,
      conditions: r.conditions.map((c, idx) => idx === i ? { ...c, [field]: value } : c),
    }));
  };

  const handleCreate = () => {
    if (!newRule.name) { toast.error("Nome da regra é obrigatório"); return; }
    if (!newRule.conditions.every((c) => c.field && c.operator && c.value)) {
      toast.error("Preencha todas as condições"); return;
    }
    createRule.mutate(newRule);
  };

  const getActionLabel = (action: string) => ACTIONS.find((a) => a.value === action)?.label ?? action;
  const getActionColor = (action: string) => ACTIONS.find((a) => a.value === action)?.color ?? "text-muted-foreground";

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Motor de Regras"
        subtitle="Automação no-code com log de explicabilidade completo"
        icon={GitBranch}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-1.5" />
                Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-primary" />
                  Criar Nova Regra
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nome da Regra *</Label>
                    <Input
                      value={newRule.name}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      placeholder="Ex: Sinistro de Alto Valor"
                      className="bg-input border-border text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Prioridade</Label>
                    <Input
                      type="number"
                      value={newRule.priority}
                      onChange={(e) => setNewRule({ ...newRule, priority: Number(e.target.value) })}
                      className="bg-input border-border text-sm"
                    />
                  </div>
                </div>

                {/* Conditions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Condições (SE)
                    </Label>
                    <Button variant="ghost" size="sm" onClick={addCondition} className="text-primary h-7 text-xs">
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  {newRule.conditions.map((cond, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-accent/30 border border-border">
                      {i > 0 && (
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary flex-shrink-0">E</Badge>
                      )}
                      <Select value={cond.field} onValueChange={(v) => updateCondition(i, "field", v)}>
                        <SelectTrigger className="bg-input border-border text-xs h-8 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELDS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={cond.operator} onValueChange={(v) => updateCondition(i, "operator", v as Condition["operator"])}>
                        <SelectTrigger className="bg-input border-border text-xs h-8 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input
                        value={cond.value}
                        onChange={(e) => updateCondition(i, "value", e.target.value)}
                        placeholder="Valor"
                        className="bg-input border-border text-xs h-8 flex-1"
                      />
                      {newRule.conditions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                          onClick={() => removeCondition(i)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Action */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Ação (ENTÃO)
                  </Label>
                  <Select value={newRule.action} onValueChange={(v) => setNewRule({ ...newRule, action: v as typeof newRule.action })}>
                    <SelectTrigger className="bg-input border-border text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIONS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          <span className={a.color}>{a.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-border text-muted-foreground">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createRule.isPending}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {createRule.isPending ? "Criando..." : "Criar Regra"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Rules List */}
      <div className="grid grid-cols-1 gap-3">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="p-4 border border-border animate-pulse">
              <div className="h-4 bg-muted rounded w-48 mb-2" />
              <div className="h-3 bg-muted rounded w-64" />
            </Card>
          ))
        ) : rules && rules.length > 0 ? (
          rules.map((rule) => {
            const conditions = rule.conditions as Condition[];
            return (
              <Card key={rule.id} className={cn(
                "p-4 border transition-all",
                rule.isActive ? "border-border bg-card" : "border-border/50 bg-card/50 opacity-60"
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        rule.isActive ? "bg-green-400" : "bg-muted-foreground/40"
                      )} />
                      <span className="text-sm font-semibold text-foreground truncate">{rule.name}</span>
                      <Badge variant="outline" className="text-xs border-border text-muted-foreground flex-shrink-0">
                        P{rule.priority}
                      </Badge>
                    </div>

                    {/* Conditions Summary */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className="text-xs text-muted-foreground font-medium">SE</span>
                      {conditions.map((cond, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-xs text-primary font-medium">E</span>}
                          <Badge variant="outline" className="text-xs border-border text-muted-foreground bg-accent/30">
                            {FIELDS.find((f) => f.value === cond.field)?.label ?? cond.field}
                            {" "}{OPERATORS.find((o) => o.value === cond.operator)?.label ?? cond.operator}
                            {" "}<strong className="text-foreground">{cond.value}</strong>
                          </Badge>
                        </span>
                      ))}
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">ENTÃO</span>
                      <Badge variant="outline" className={cn("text-xs border-border bg-accent/30", getActionColor(rule.action))}>
                        {getActionLabel(rule.action)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {rule.triggerCount ?? 0} ativações
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(rule.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={(checked) => updateRule.mutate({ id: rule.id, isActive: checked })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteRule.mutate({ id: rule.id })}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="border border-border bg-card">
            <EmptyState
              icon={GitBranch}
              title="Nenhuma regra configurada"
              description="Crie regras no-code para automatizar a triagem e decisões de sinistros."
              action={
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Criar Primeira Regra
                </Button>
              }
            />
          </Card>
        )}
      </div>

      {/* Explanation Log */}
      {logs && logs.length > 0 && (
        <Card className="border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Log de Explicabilidade</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Histórico de decisões automatizadas</p>
          </div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-3 flex items-start gap-3">
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
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-foreground truncate">{log.ruleName}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      Sinistro #{log.claimId}
                    </span>
                    {log.conditionsMet && log.actionTaken && (
                      <Badge variant="outline" className={cn("text-xs border-border flex-shrink-0", getActionColor(log.actionTaken))}>
                        {getActionLabel(log.actionTaken)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{log.explanation}</p>
                  <p className="text-xs text-muted-foreground/50 mt-0.5">
                    {new Date(log.createdAt).toLocaleString("pt-BR")}
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
