import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Building2, Users, FileText, ShieldCheck, Activity,
  Search, ChevronRight, AlertTriangle, CheckCircle2, XCircle, Clock,
  LogOut, Eye, Lock, Plus, TrendingUp, DollarSign, Star, BarChart3,
  UserCheck, Layers, RefreshCw,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

// ─── Guard ────────────────────────────────────────────────────────────────────
function MegaAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Verificando credenciais...</p>
        </div>
      </div>
    );
  }
  if (!user || user.role !== "mega-admin") {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-6">
          <Lock className="w-16 h-16 text-red-400 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Acesso Restrito</h1>
          <p className="text-slate-400 text-sm">Esta área é exclusiva para o proprietário da plataforma EonSure.</p>
          <Link href="/dashboard">
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-white w-full">Voltar ao Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function TenantStatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1 text-xs">
      <CheckCircle2 className="w-3 h-3" /> Ativo
    </Badge>
  ) : (
    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1 text-xs">
      <XCircle className="w-3 h-3" /> Inativo
    </Badge>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    starter: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    professional: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    enterprise: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  };
  const labels: Record<string, string> = {
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise",
  };
  return (
    <Badge className={`${styles[plan] ?? styles.starter} text-xs`}>
      {labels[plan] ?? plan}
    </Badge>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function ScoreBar({ value, max = 10, color }: { value: number | null; max?: number; color: string }) {
  if (value === null) return <span className="text-slate-500 text-xs">—</span>;
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-white w-6 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

// ─── Novo Tenant Modal (2 etapas) ────────────────────────────────────────────
const EMPTY_TENANT_FORM = {
  name: "", slug: "", plan: "starter" as "starter" | "professional" | "enterprise",
  supportEmail: "", supportPhone: "",
};
const EMPTY_USER_FORM = { name: "", email: "", persona: "c-level" as "c-level" | "cio" };

function NewTenantModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [step, setStep] = useState<1 | 2>(1);
  const [tenantForm, setTenantForm] = useState(EMPTY_TENANT_FORM);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [skipUser, setSkipUser] = useState(false);

  const createTenant = trpc.megaAdmin.createTenant.useMutation({
    onSuccess: (data) => {
      toast.success(`Cliente criado!${data.firstUserId ? " Primeiro usuário cadastrado." : ""}`);
      utils.megaAdmin.getAllTenants.invalidate();
      utils.megaAdmin.getDashboardMetrics.invalidate();
      utils.megaAdmin.getTenantLeaders.invalidate();
      handleClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleClose = () => {
    setStep(1); setTenantForm(EMPTY_TENANT_FORM); setUserForm(EMPTY_USER_FORM); setSkipUser(false); onClose();
  };
  const autoSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const handleSubmit = () => createTenant.mutate({
    ...tenantForm,
    supportEmail: tenantForm.supportEmail || undefined,
    supportPhone: tenantForm.supportPhone || undefined,
    firstUser: skipUser ? undefined : { name: userForm.name, email: userForm.email, persona: userForm.persona },
  });
  const step1Valid = tenantForm.name.length >= 2 && tenantForm.slug.length >= 2;
  const step2Valid = skipUser || (userForm.name.length >= 2 && userForm.email.includes("@"));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-[#0d1526] border-white/10 text-white max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 1 ? "bg-cyan-500 text-white" : "bg-emerald-500/20 text-emerald-400"
              }`}>{step === 1 ? "1" : "✓"}</div>
              <div className="w-8 h-px bg-white/20" />
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 2 ? "bg-cyan-500 text-white" : "bg-white/10 text-slate-500"
              }`}>2</div>
            </div>
            <DialogTitle className="text-white text-base">
              {step === 1 ? "Dados do Cliente" : "Primeiro Usuário"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 text-sm">
            {step === 1
              ? "Configure o tenant e o plano de assinatura."
              : "Adicione o usuário principal que vai gerenciar a conta."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Nome da empresa *</Label>
              <Input
                value={tenantForm.name}
                onChange={(e) => setTenantForm((f) => ({ ...f, name: e.target.value, slug: autoSlug(e.target.value) }))}
                placeholder="Ex: Seguradora Exemplo S.A."
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Slug (URL) *</Label>
              <Input
                value={tenantForm.slug}
                onChange={(e) => setTenantForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="seguradora-exemplo"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 font-mono text-sm"
              />
              <p className="text-xs text-slate-500">Apenas letras minúsculas, números e hífens.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Plano *</Label>
              <Select value={tenantForm.plan} onValueChange={(v) => setTenantForm((f) => ({ ...f, plan: v as typeof f.plan }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0d1526] border-white/10">
                  <SelectItem value="starter" className="text-white">Starter — R$ 990/mês</SelectItem>
                  <SelectItem value="professional" className="text-white">Professional — R$ 2.490/mês</SelectItem>
                  <SelectItem value="enterprise" className="text-white">Enterprise — R$ 5.990/mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">E-mail de suporte</Label>
                <Input value={tenantForm.supportEmail} onChange={(e) => setTenantForm((f) => ({ ...f, supportEmail: e.target.value }))} placeholder="suporte@empresa.com" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Telefone</Label>
                <Input value={tenantForm.supportPhone} onChange={(e) => setTenantForm((f) => ({ ...f, supportPhone: e.target.value }))} placeholder="(11) 9 0000-0000" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 text-sm" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <UserCheck className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-cyan-300 font-medium">Primeiro usuário do tenant</p>
                <p className="text-cyan-400/70 text-xs">O C-Level ou CIO poderá adicionar mais usuários após o acesso.</p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={skipUser} onChange={(e) => setSkipUser(e.target.checked)} className="w-4 h-4 rounded accent-cyan-500" />
              <span className="text-slate-400 text-sm">Criar o usuário depois (pular esta etapa)</span>
            </label>
            {!skipUser && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Nome completo *</Label>
                  <Input value={userForm.name} onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: João Silva" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">E-mail corporativo *</Label>
                  <Input value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} placeholder="joao@seguradora.com" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" type="email" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Nível de acesso *</Label>
                  <Select value={userForm.persona} onValueChange={(v) => setUserForm((f) => ({ ...f, persona: v as typeof f.persona }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0d1526] border-white/10">
                      <SelectItem value="c-level" className="text-white">C-Level — Acesso total + gestão</SelectItem>
                      <SelectItem value="cio" className="text-white">CIO — Tecnologia + configurações</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">O C-Level pode adicionar outros usuários após o primeiro acesso.</p>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={handleClose} className="text-slate-400 hover:text-white">Cancelar</Button>
              <Button onClick={() => setStep(2)} disabled={!step1Valid} className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2">
                Próximo <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep(1)} className="text-slate-400 hover:text-white">Voltar</Button>
              <Button onClick={handleSubmit} disabled={!step2Valid || createTenant.isPending} className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2">
                {createTenant.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Criar Cliente
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MegaAdmin() {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [showNewTenant, setShowNewTenant] = useState(false);

  const { data: metrics, isLoading: metricsLoading } = trpc.megaAdmin.getDashboardMetrics.useQuery();
  const { data: tenants, isLoading: tenantsLoading } = trpc.megaAdmin.getAllTenants.useQuery();

  const filtered = (tenants ?? []).filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  // Enrich tenants with CSAT data from metrics
  const csatMap = new Map(
    (metrics?.csatByTenant ?? []).map((c) => [
      c.tenantId,
      {
        avgScore: c.avgScore ? parseFloat(String(c.avgScore)) : null,
        avgNps: c.avgNps ? parseFloat(String(c.avgNps)) : null,
        count: c.responseCount,
      },
    ])
  );

  return (
    <MegaAdminGuard>
      <div className="min-h-screen bg-[#0a0f1e] text-white">
        {/* ─── Top Bar ─────────────────────────────────────────────────────── */}
        <header className="border-b border-white/10 bg-[#0d1526]/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-bold text-white text-sm">EonSure</span>
                <span className="ml-2 text-xs bg-red-500/20 text-red-300 border border-red-500/30 rounded px-1.5 py-0.5">MEGA-ADMIN</span>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/mega-admin">
                <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 gap-1.5 text-xs">
                  <BarChart3 className="w-3.5 h-3.5" /> Dashboard
                </Button>
              </Link>
              <Link href="/mega-admin/users">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-1.5 text-xs">
                  <Users className="w-3.5 h-3.5" /> Usuários
                </Button>
              </Link>
              <Link href="/mega-admin/audit">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-1.5 text-xs">
                  <Activity className="w-3.5 h-3.5" /> Audit Log
                </Button>
              </Link>
            </nav>
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2 text-xs">
                  <Eye className="w-3.5 h-3.5" /> Ver Plataforma
                </Button>
              </Link>
              <div className="w-px h-6 bg-white/10" />
              <span className="text-sm text-slate-400 hidden sm:block">{user?.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
                onClick={() => logout()}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* ─── Page Title ──────────────────────────────────────────────── */}
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Painel do Proprietário</h1>
              <p className="text-slate-400 text-sm mt-1">
                Visão gerencial completa da plataforma EonSure — clientes, receita, satisfação e operações.
              </p>
            </div>
            <Button
              onClick={() => setShowNewTenant(true)}
              className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2"
            >
              <Plus className="w-4 h-4" /> Novo Cliente
            </Button>
          </div>

          {/* ─── KPI Row 1: Financeiro ───────────────────────────────────── */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Receita</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "MRR Estimado",
                  value: metricsLoading ? null : formatCurrency(metrics?.mrr ?? 0),
                  icon: DollarSign,
                  color: "text-emerald-400",
                  sub: "Receita mensal recorrente",
                },
                {
                  label: "ARR Estimado",
                  value: metricsLoading ? null : formatCurrency(metrics?.arr ?? 0),
                  icon: TrendingUp,
                  color: "text-cyan-400",
                  sub: "Projeção anual",
                },
                {
                  label: "Clientes Ativos",
                  value: metricsLoading ? null : String(metrics?.activeTenants ?? 0),
                  icon: Building2,
                  color: "text-blue-400",
                  sub: `de ${metrics?.totalTenants ?? 0} cadastrados`,
                },
                {
                  label: "Usuários Totais",
                  value: metricsLoading ? null : String(metrics?.totalUsers ?? 0),
                  icon: Users,
                  color: "text-purple-400",
                  sub: "em todos os tenants",
                },
              ].map((m) => (
                <Card key={m.label} className="bg-[#0d1526] border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-slate-400">{m.label}</span>
                      <m.icon className={`w-4 h-4 ${m.color} opacity-70`} />
                    </div>
                    {metricsLoading ? (
                      <Skeleton className="h-7 w-24 bg-white/10" />
                    ) : (
                      <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">{m.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* ─── KPI Row 2: Satisfação e Operações ──────────────────────── */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Satisfação & Operações</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "CSAT Médio",
                  value: metricsLoading ? null : metrics?.avgCsat ? `${metrics.avgCsat.toFixed(1)}/10` : "—",
                  icon: Star,
                  color: "text-amber-400",
                  sub: "Satisfação do cliente",
                },
                {
                  label: "NPS Médio",
                  value: metricsLoading ? null : metrics?.avgNps ? `${metrics.avgNps.toFixed(1)}/10` : "—",
                  icon: UserCheck,
                  color: "text-cyan-400",
                  sub: "Net Promoter Score",
                },
                {
                  label: "Sinistros Totais",
                  value: metricsLoading ? null : String(metrics?.totalClaims ?? 0),
                  icon: FileText,
                  color: "text-blue-400",
                  sub: `${metrics?.openClaims ?? 0} em aberto`,
                },
                {
                  label: "Sinistros Resolvidos",
                  value: metricsLoading ? null : String(metrics?.resolvedClaims ?? 0),
                  icon: CheckCircle2,
                  color: "text-emerald-400",
                  sub: "Status: encerrado",
                },
              ].map((m) => (
                <Card key={m.label} className="bg-[#0d1526] border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-slate-400">{m.label}</span>
                      <m.icon className={`w-4 h-4 ${m.color} opacity-70`} />
                    </div>
                    {metricsLoading ? (
                      <Skeleton className="h-7 w-20 bg-white/10" />
                    ) : (
                      <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">{m.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* ─── Distribuição de Planos ──────────────────────────────────── */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-[#0d1526] border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" /> Distribuição de Planos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {metricsLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 bg-white/5" />)}</div>
                ) : (
                  ["starter", "professional", "enterprise"].map((plan) => {
                    const entry = metrics?.planDistribution?.find((p) => p.plan === plan);
                    const cnt = entry?.count ?? 0;
                    const total = metrics?.activeTenants ?? 1;
                    const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
                    const colors: Record<string, string> = {
                      starter: "bg-slate-400",
                      professional: "bg-blue-400",
                      enterprise: "bg-purple-400",
                    };
                    const labels: Record<string, string> = {
                      starter: "Starter",
                      professional: "Professional",
                      enterprise: "Enterprise",
                    };
                    return (
                      <div key={plan} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300">{labels[plan]}</span>
                          <span className="text-slate-400">{cnt} cliente{cnt !== 1 ? "s" : ""} · {pct}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${colors[plan]}`} style={{ width: `${pct}%`, transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#0d1526] border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" /> Status das Assinaturas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {metricsLoading ? (
                  <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 bg-white/5" />)}</div>
                ) : (
                  (["active", "trial", "suspended", "cancelled"] as const).map((status) => {
                    const entry = metrics?.subStatusDistribution?.find((s) => s.status === status);
                    const cnt = entry?.count ?? 0;
                    const total = (metrics?.subStatusDistribution ?? []).reduce((a, b) => a + (b.count ?? 0), 0) || 1;
                    const pct = Math.round((cnt / total) * 100);
                    const config: Record<string, { color: string; label: string; bar: string }> = {
                      active: { color: "text-emerald-400", label: "Ativo", bar: "bg-emerald-400" },
                      trial: { color: "text-amber-400", label: "Trial", bar: "bg-amber-400" },
                      suspended: { color: "text-red-400", label: "Suspenso", bar: "bg-red-400" },
                      cancelled: { color: "text-slate-500", label: "Cancelado", bar: "bg-slate-500" },
                    };
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className={config[status].color}>{config[status].label}</span>
                          <span className="text-slate-400">{cnt} · {pct}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${config[status].bar}`} style={{ width: `${pct}%`, transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* ─── Tabela de Clientes ──────────────────────────────────────── */}
          <Card className="bg-[#0d1526] border-white/10">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  Clientes ({filtered.length})
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Buscar cliente..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 text-sm h-9"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowNewTenant(true)}
                    className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 gap-1.5 h-9"
                  >
                    <Plus className="w-3.5 h-3.5" /> Novo
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Header row */}
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_40px] gap-4 px-6 py-2 border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
                <span>Cliente</span>
                <span>Plano</span>
                <span>Usuários</span>
                <span>Sinistros</span>
                <span>CSAT</span>
                <span>NPS</span>
                <span />
              </div>
              {tenantsLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 bg-white/5 rounded-lg" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum cliente encontrado.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filtered.map((tenant) => {
                    const csat = csatMap.get(tenant.id);
                    return (
                      <Link key={tenant.id} href={`/mega-admin/tenant/${tenant.id}`}>
                        <div className="grid grid-cols-[2fr_1fr] md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_40px] gap-4 items-center px-6 py-4 hover:bg-white/5 transition-colors cursor-pointer group">
                          {/* Name */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-cyan-400">{tenant.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-white text-sm truncate">{tenant.name}</span>
                                <TenantStatusBadge isActive={tenant.isActive} />
                              </div>
                              <p className="text-xs text-slate-500 font-mono">{tenant.slug}</p>
                            </div>
                          </div>
                          {/* Plan */}
                          <div className="hidden md:block">
                            <PlanBadge plan={tenant.subscriptionPlan ?? "starter"} />
                          </div>
                          {/* Users */}
                          <div className="hidden md:block text-sm text-white font-medium">{tenant.userCount}</div>
                          {/* Claims */}
                          <div className="hidden md:block text-sm text-white font-medium">{tenant.claimCount}</div>
                          {/* CSAT */}
                          <div className="hidden md:block w-24">
                            <ScoreBar value={csat?.avgScore ?? null} color="bg-amber-400" />
                          </div>
                          {/* NPS */}
                          <div className="hidden md:block w-24">
                            <ScoreBar value={csat?.avgNps ?? null} color="bg-cyan-400" />
                          </div>
                          {/* Arrow */}
                          <div className="flex justify-end">
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Aviso de boas práticas ──────────────────────────────────── */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-300">Boas Práticas de Administração</p>
              <p className="text-amber-400/70 mt-1">
                Todas as ações realizadas neste painel são registradas no Audit Log com IP, horário e estado anterior/posterior.
                Ações destrutivas exigem confirmação explícita. Nunca compartilhe as credenciais mega-admin.
              </p>
            </div>
          </div>
        </main>
      </div>

      <NewTenantModal open={showNewTenant} onClose={() => setShowNewTenant(false)} />
    </MegaAdminGuard>
  );
}
