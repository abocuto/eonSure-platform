import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Building2, Users, FileText, Settings, ShieldCheck,
  AlertTriangle, CheckCircle2, XCircle, Edit2, Save, UserX, Lock, Unlock,
  Star, BarChart3, Activity, LogOut, Eye,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

const PERSONA_LABELS: Record<string, string> = {
  "c-level": "C-Level",
  "gerente-sinistros": "Gerente de Sinistros",
  "analista-fraude": "Analista de Fraude",
  "cio": "CIO",
  "perito": "Perito",
};

const PERSONA_COLORS: Record<string, string> = {
  "c-level": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "gerente-sinistros": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "analista-fraude": "bg-red-500/20 text-red-300 border-red-500/30",
  "cio": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "perito": "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

// ─── TenantDetailTabs ────────────────────────────────────────────────────────
type TenantUser = { id: number; name: string | null; email: string | null; role: string | null; persona: string | null };

function TenantDetailTabs({
  tenantId,
  tenantUsers,
  onRemoveUser,
}: {
  tenantId: number;
  tenantUsers: TenantUser[];
  onRemoveUser: (id: number, name: string) => void;
}) {
  const { data: csatData, isLoading: csatLoading } = trpc.megaAdmin.getTenantCsat.useQuery({ tenantId });

  return (
    <Tabs defaultValue="users">
      <TabsList className="bg-white/5 border border-white/10 mb-4">
        <TabsTrigger value="users" className="gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400">
          <Users className="w-3.5 h-3.5" /> Usuários ({tenantUsers.length})
        </TabsTrigger>
        <TabsTrigger value="csat" className="gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400">
          <Star className="w-3.5 h-3.5" /> CSAT / NPS
        </TabsTrigger>
      </TabsList>

      {/* Tab: Usuários */}
      <TabsContent value="users">
        <Card className="bg-[#0d1526] border-white/10">
          <CardContent className="p-0">
            {tenantUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Nenhum usuário neste tenant.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {tenantUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-4 px-6 py-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-blue-400">{(u.name ?? "?").charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{u.name ?? "—"}</p>
                      <p className="text-xs text-slate-500">{u.email ?? "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${PERSONA_COLORS[u.persona ?? ""] ?? "bg-white/5 text-slate-400 border-white/10"} text-xs`}>
                        {PERSONA_LABELS[u.persona ?? ""] ?? u.persona ?? "—"}
                      </Badge>
                      <Badge className={u.role === "admin" ? "bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs" : "bg-white/5 text-slate-500 border-white/10 text-xs"}>
                        {u.role}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2"
                      onClick={() => onRemoveUser(u.id, u.name ?? "usuário")}
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab: CSAT / NPS */}
      <TabsContent value="csat">
        <div className="space-y-4">
          {/* Médias */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-[#0d1526] border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-slate-400">CSAT Médio</span>
                </div>
                {csatLoading ? (
                  <div className="h-8 w-16 bg-white/5 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-amber-400">
                    {csatData?.avgScore != null ? `${csatData.avgScore.toFixed(1)}/10` : "—"}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="bg-[#0d1526] border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-slate-400">NPS Médio</span>
                </div>
                {csatLoading ? (
                  <div className="h-8 w-16 bg-white/5 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-cyan-400">
                    {csatData?.avgNps != null ? `${csatData.avgNps.toFixed(1)}/10` : "—"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Por Persona */}
          {csatData?.byPersona && csatData.byPersona.length > 0 && (
            <Card className="bg-[#0d1526] border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm">Satisfação por Persona</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {csatData.byPersona.map((p) => (
                  <div key={p.persona ?? ""} className="flex items-center gap-3">
                    <Badge className={`${PERSONA_COLORS[p.persona ?? ""] ?? "bg-white/5 text-slate-400 border-white/10"} text-xs w-40 justify-center`}>
                      {PERSONA_LABELS[p.persona ?? ""] ?? p.persona ?? "—"}
                    </Badge>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${((parseFloat(String(p.avgScore ?? 0)) / 10) * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <span className="text-xs text-amber-300 w-10 text-right">
                      {p.avgScore ? parseFloat(String(p.avgScore)).toFixed(1) : "—"}
                    </span>
                    <span className="text-xs text-slate-500 w-16 text-right">{p.count} resp.</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Histórico de respostas */}
          <Card className="bg-[#0d1526] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" /> Últimas Respostas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {csatLoading ? (
                <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />)}</div>
              ) : !csatData?.responses?.length ? (
                <div className="p-8 text-center text-slate-500 text-sm">Nenhuma resposta CSAT registrada.</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {csatData.responses.map((r) => (
                    <div key={r.id} className="flex items-start gap-4 px-6 py-3">
                      <div className="flex-shrink-0 text-center">
                        <span className={`text-lg font-bold ${
                          (r.score ?? 0) >= 8 ? "text-emerald-400" : (r.score ?? 0) >= 6 ? "text-amber-400" : "text-red-400"
                        }`}>{r.score ?? "—"}</span>
                        <p className="text-xs text-slate-500">CSAT</p>
                      </div>
                      {r.npsScore != null && (
                        <div className="flex-shrink-0 text-center">
                          <span className={`text-lg font-bold ${
                            (r.npsScore ?? 0) >= 8 ? "text-emerald-400" : (r.npsScore ?? 0) >= 6 ? "text-amber-400" : "text-red-400"
                          }`}>{r.npsScore}</span>
                          <p className="text-xs text-slate-500">NPS</p>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {r.feedback && <p className="text-sm text-slate-300 truncate">{r.feedback}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          {r.persona && (
                            <Badge className={`${PERSONA_COLORS[r.persona] ?? "bg-white/5 text-slate-400 border-white/10"} text-xs`}>
                              {PERSONA_LABELS[r.persona] ?? r.persona}
                            </Badge>
                          )}
                          <span className="text-xs text-slate-500">
                            {new Date(r.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export default function MegaAdminTenant() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ id: string }>();
  const tenantId = parseInt(params.id ?? "0", 10);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.megaAdmin.getTenantDetail.useQuery({ tenantId }, { enabled: !!tenantId });

  // Edit tenant state
  const [editTenant, setEditTenant] = useState(false);
  const [tenantForm, setTenantForm] = useState({ name: "", supportEmail: "", supportPhone: "" });

  // Edit subscription state
  const [editSub, setEditSub] = useState(false);
  const [subForm, setSubForm] = useState({
    plan: "starter" as "starter" | "professional" | "enterprise",
    status: "active" as "active" | "suspended" | "cancelled" | "trial",
    maxClaims: 100,
    maxUsers: 10,
    billingCycle: "monthly" as "monthly" | "annual",
    pillarEonicData: false,
    pillarRulesEngine: false,
    pillarFraudML: false,
    pillarPredictive: false,
  });

  // Confirm suspend dialog
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [confirmRemoveUser, setConfirmRemoveUser] = useState<{ id: number; name: string } | null>(null);

  const updateTenant = trpc.megaAdmin.updateTenant.useMutation({
    onSuccess: () => { toast.success("Tenant atualizado."); utils.megaAdmin.getTenantDetail.invalidate({ tenantId }); setEditTenant(false); },
    onError: (e) => toast.error(e.message),
  });

  const updateSub = trpc.megaAdmin.updateSubscription.useMutation({
    onSuccess: () => { toast.success("Assinatura atualizada."); utils.megaAdmin.getTenantDetail.invalidate({ tenantId }); setEditSub(false); },
    onError: (e) => toast.error(e.message),
  });

  const removeUser = trpc.megaAdmin.removeUserFromTenant.useMutation({
    onSuccess: () => { toast.success("Usuário removido do tenant."); utils.megaAdmin.getTenantDetail.invalidate({ tenantId }); setConfirmRemoveUser(null); },
    onError: (e) => toast.error(e.message),
  });

  const suspendTenant = () => {
    updateSub.mutate({ tenantId, status: "suspended" });
    setConfirmSuspend(false);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] p-8 space-y-4">
        <Skeleton className="h-8 w-48 bg-white/10" />
        <Skeleton className="h-48 bg-white/10 rounded-xl" />
        <Skeleton className="h-48 bg-white/10 rounded-xl" />
      </div>
    );
  }

  if (!user || user.role !== "mega-admin") {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Lock className="w-16 h-16 text-red-400 mx-auto" />
          <p className="text-white font-bold">Acesso Restrito</p>
          <Link href="/mega-admin"><Button className="bg-cyan-500 text-white">Voltar</Button></Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <p className="text-slate-400">Tenant não encontrado.</p>
      </div>
    );
  }

  const { tenant, subscription, users: tenantUsers, stats } = data;
  const isActive = tenant.isActive;

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0d1526]/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/mega-admin">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          </Link>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-white/10 flex items-center justify-center">
              <span className="text-sm font-bold text-cyan-400">{tenant.name.charAt(0)}</span>
            </div>
            <div>
              <span className="font-semibold text-white text-sm">{tenant.name}</span>
              <span className="ml-2 text-xs text-slate-500">{tenant.slug}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isActive ? (
              <Button
                variant="outline"
                size="sm"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-2"
                onClick={() => setConfirmSuspend(true)}
              >
                <XCircle className="w-4 h-4" /> Suspender Tenant
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 gap-2"
                onClick={() => updateTenant.mutate({ tenantId, isActive: true })}
              >
                <Unlock className="w-4 h-4" /> Reativar Tenant
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Usuários", value: tenantUsers.length, icon: Users, color: "text-blue-400" },
            { label: "Sinistros", value: stats.totalClaims, icon: FileText, color: "text-purple-400" },
            { label: "Sinistros Abertos", value: stats.openClaims, icon: AlertTriangle, color: "text-amber-400" },
            { label: "Regras Ativas", value: "—", icon: Settings, color: "text-cyan-400" },
          ].map((s) => (
            <Card key={s.label} className="bg-[#0d1526] border-white/10">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-8 h-8 ${s.color} opacity-70`} />
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-400">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Tenant Info */}
          <Card className="bg-[#0d1526] border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" /> Dados do Cliente
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white h-7 px-2"
                  onClick={() => { setTenantForm({ name: tenant.name, supportEmail: tenant.supportEmail ?? "", supportPhone: tenant.supportPhone ?? "" }); setEditTenant(true); }}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Nome</span>
                <span className="text-white font-medium">{tenant.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Slug</span>
                <span className="text-slate-300 font-mono text-xs">{tenant.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                {isActive ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1 text-xs">
                    <CheckCircle2 className="w-3 h-3" /> Ativo
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1 text-xs">
                    <XCircle className="w-3 h-3" /> Inativo
                  </Badge>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">E-mail suporte</span>
                <span className="text-slate-300">{tenant.supportEmail ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Telefone suporte</span>
                <span className="text-slate-300">{tenant.supportPhone ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Criado em</span>
                <span className="text-slate-300">{new Date(tenant.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card className="bg-[#0d1526] border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400" /> Assinatura
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white h-7 px-2"
                  onClick={() => {
                    setSubForm({
                      plan: (subscription?.plan ?? "starter") as "starter" | "professional" | "enterprise",
                      status: (subscription?.status ?? "active") as "active" | "suspended" | "cancelled" | "trial",
                      maxClaims: subscription?.maxClaims ?? 100,
                      maxUsers: subscription?.maxUsers ?? 10,
                      billingCycle: (subscription?.billingCycle ?? "monthly") as "monthly" | "annual",
                      pillarEonicData: subscription?.pillarEonicData ?? false,
                      pillarRulesEngine: subscription?.pillarRulesEngine ?? false,
                      pillarFraudML: subscription?.pillarFraudML ?? false,
                      pillarPredictive: subscription?.pillarPredictive ?? false,
                    });
                    setEditSub(true);
                  }}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { label: "Plano", value: subscription?.plan ?? "—" },
                { label: "Status", value: subscription?.status ?? "—" },
                { label: "Ciclo", value: subscription?.billingCycle ?? "—" },
                { label: "Máx. Sinistros", value: subscription?.maxClaims ?? "—" },
                { label: "Máx. Usuários", value: subscription?.maxUsers ?? "—" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="text-white font-medium capitalize">{String(item.value)}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-white/5">
                <p className="text-xs text-slate-500 mb-2">Pilares Ativos</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: "pillarEonicData", label: "Eônica" },
                    { key: "pillarRulesEngine", label: "Regras" },
                    { key: "pillarFraudML", label: "Fraude ML" },
                    { key: "pillarPredictive", label: "Preditivo" },
                  ].map((p) => {
                    const active = subscription?.[p.key as keyof typeof subscription] as boolean;
                    return (
                      <Badge key={p.key} className={active
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs"
                        : "bg-white/5 text-slate-500 border-white/10 text-xs"}>
                        {active ? "✓" : "✗"} {p.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Usuários / CSAT-NPS */}
        <TenantDetailTabs tenantId={tenantId} tenantUsers={tenantUsers} onRemoveUser={(id, name) => setConfirmRemoveUser({ id, name })} />

        {/* Audit notice */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-2 text-xs text-blue-300">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Todas as alterações feitas nesta página são registradas no Audit Log com estado anterior e posterior.</span>
        </div>
      </main>

      {/* Edit Tenant Dialog */}
      <Dialog open={editTenant} onOpenChange={setEditTenant}>
        <DialogContent className="bg-[#0d1526] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Editar Dados do Cliente</DialogTitle>
            <DialogDescription className="text-slate-400">Altere as informações cadastrais do tenant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label className="text-slate-300">Nome</Label>
              <Input value={tenantForm.name} onChange={(e) => setTenantForm(f => ({ ...f, name: e.target.value }))}
                className="mt-1 bg-white/5 border-white/10 text-white" /></div>
            <div><Label className="text-slate-300">E-mail de Suporte</Label>
              <Input value={tenantForm.supportEmail} onChange={(e) => setTenantForm(f => ({ ...f, supportEmail: e.target.value }))}
                className="mt-1 bg-white/5 border-white/10 text-white" /></div>
            <div><Label className="text-slate-300">Telefone de Suporte</Label>
              <Input value={tenantForm.supportPhone} onChange={(e) => setTenantForm(f => ({ ...f, supportPhone: e.target.value }))}
                className="mt-1 bg-white/5 border-white/10 text-white" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTenant(false)} className="text-slate-400">Cancelar</Button>
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
              onClick={() => updateTenant.mutate({ tenantId, ...tenantForm })}
              disabled={updateTenant.isPending}>
              <Save className="w-4 h-4" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      <Dialog open={editSub} onOpenChange={setEditSub}>
        <DialogContent className="bg-[#0d1526] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Assinatura</DialogTitle>
            <DialogDescription className="text-slate-400">Gerencie o plano, limites e pilares do tenant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Plano</Label>
                <Select value={subForm.plan} onValueChange={(v) => setSubForm(f => ({ ...f, plan: v as typeof f.plan }))}>
                  <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d1526] border-white/10">
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Status</Label>
                <Select value={subForm.status} onValueChange={(v) => setSubForm(f => ({ ...f, status: v as typeof f.status }))}>
                  <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d1526] border-white/10">
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-slate-300">Máx. Sinistros</Label>
                <Input type="number" value={subForm.maxClaims} onChange={(e) => setSubForm(f => ({ ...f, maxClaims: parseInt(e.target.value) }))}
                  className="mt-1 bg-white/5 border-white/10 text-white" /></div>
              <div><Label className="text-slate-300">Máx. Usuários</Label>
                <Input type="number" value={subForm.maxUsers} onChange={(e) => setSubForm(f => ({ ...f, maxUsers: parseInt(e.target.value) }))}
                  className="mt-1 bg-white/5 border-white/10 text-white" /></div>
            </div>
            <div>
              <Label className="text-slate-300 block mb-2">Pilares Tecnológicos</Label>
              <div className="space-y-2">
                {[
                  { key: "pillarEonicData", label: "Estrutura de Dados Eônica" },
                  { key: "pillarRulesEngine", label: "Motor de Regras" },
                  { key: "pillarFraudML", label: "Detecção de Fraude ML" },
                  { key: "pillarPredictive", label: "Análise Preditiva" },
                ].map((p) => (
                  <div key={p.key} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-300">{p.label}</span>
                    <Switch
                      checked={subForm[p.key as keyof typeof subForm] as boolean}
                      onCheckedChange={(v) => setSubForm(f => ({ ...f, [p.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditSub(false)} className="text-slate-400">Cancelar</Button>
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
              onClick={() => updateSub.mutate({ tenantId, ...subForm })}
              disabled={updateSub.isPending}>
              <Save className="w-4 h-4" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Suspend Dialog */}
      <Dialog open={confirmSuspend} onOpenChange={setConfirmSuspend}>
        <DialogContent className="bg-[#0d1526] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" /> Suspender Tenant
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Esta ação suspenderá o acesso de todos os usuários de <strong className="text-white">{tenant.name}</strong> à plataforma.
              A ação será registrada no Audit Log. Confirme para continuar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmSuspend(false)} className="text-slate-400">Cancelar</Button>
            <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={suspendTenant} disabled={updateSub.isPending}>
              Confirmar Suspensão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Remove User Dialog */}
      <Dialog open={!!confirmRemoveUser} onOpenChange={() => setConfirmRemoveUser(null)}>
        <DialogContent className="bg-[#0d1526] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <UserX className="w-5 h-5" /> Remover Usuário do Tenant
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              O usuário <strong className="text-white">{confirmRemoveUser?.name}</strong> será desvinculado deste tenant.
              Ele não perderá a conta, mas perderá acesso aos dados. Esta ação é registrada no Audit Log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmRemoveUser(null)} className="text-slate-400">Cancelar</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => confirmRemoveUser && removeUser.mutate({ userId: confirmRemoveUser.id, tenantName: tenant.name })}
              disabled={removeUser.isPending}>
              Confirmar Remoção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
