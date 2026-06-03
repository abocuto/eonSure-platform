import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Building2, Users, FileText, ShieldCheck, Activity,
  Search, ChevronRight, AlertTriangle, CheckCircle2, XCircle, Clock,
  Settings, LogOut, Eye, Lock,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { trpc as trpcClient } from "@/lib/trpc";

// ─── Guard: redirect non-mega-admin ──────────────────────────────────────────
function MegaAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

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
          <p className="text-slate-400 text-sm">Esta área é exclusiva para o Mega-Admin da plataforma EonSure.</p>
          <Link href="/dashboard">
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-white w-full">Voltar ao Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function TenantStatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
      <CheckCircle2 className="w-3 h-3" /> Ativo
    </Badge>
  ) : (
    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
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
  return (
    <Badge className={styles[plan] ?? styles.starter}>
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </Badge>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MegaAdmin() {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");

  const { data: metrics, isLoading: metricsLoading } = trpc.megaAdmin.getPlatformMetrics.useQuery();
  const { data: tenants, isLoading: tenantsLoading } = trpc.megaAdmin.getAllTenants.useQuery();

  const filtered = (tenants ?? []).filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
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
            <div className="flex items-center gap-3">
              <Link href="/mega-admin/audit-log">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2">
                  <Activity className="w-4 h-4" /> Audit Log
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-2">
                  <Eye className="w-4 h-4" /> Ver Plataforma
                </Button>
              </Link>
              <div className="w-px h-6 bg-white/10" />
              <span className="text-sm text-slate-400">{user?.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
                onClick={() => logout()}
              >
                <LogOut className="w-4 h-4" /> Sair
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* ─── Page Title ──────────────────────────────────────────────── */}
          <div>
            <h1 className="text-2xl font-bold text-white">Painel de Administração Global</h1>
            <p className="text-slate-400 text-sm mt-1">
              Gerencie todos os clientes, assinaturas e usuários da plataforma EonSure.
            </p>
          </div>

          {/* ─── Platform Metrics ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Tenants Total", value: metrics?.totalTenants, icon: Building2, color: "text-cyan-400" },
              { label: "Tenants Ativos", value: metrics?.activeTenants, icon: CheckCircle2, color: "text-emerald-400" },
              { label: "Usuários Total", value: metrics?.totalUsers, icon: Users, color: "text-blue-400" },
              { label: "Sinistros Total", value: metrics?.totalClaims, icon: FileText, color: "text-purple-400" },
              { label: "Sinistros Abertos", value: metrics?.openClaims, icon: Clock, color: "text-amber-400" },
            ].map((m) => (
              <Card key={m.label} className="bg-[#0d1526] border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <m.icon className={`w-4 h-4 ${m.color}`} />
                    <span className="text-xs text-slate-400">{m.label}</span>
                  </div>
                  {metricsLoading ? (
                    <Skeleton className="h-7 w-16 bg-white/10" />
                  ) : (
                    <p className={`text-2xl font-bold ${m.color}`}>{m.value ?? 0}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ─── Tenants Table ───────────────────────────────────────────── */}
          <Card className="bg-[#0d1526] border-white/10">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-white text-base">Clientes ({filtered.length})</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 text-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
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
                  {filtered.map((tenant) => (
                    <Link key={tenant.id} href={`/mega-admin/tenants/${tenant.id}`}>
                      <div className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors cursor-pointer group">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-cyan-400">
                            {tenant.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-white text-sm truncate">{tenant.name}</span>
                            <TenantStatusBadge isActive={tenant.isActive} />
                            <PlanBadge plan={tenant.subscriptionPlan ?? "starter"} />
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{tenant.slug}</p>
                        </div>
                        {/* Stats */}
                        <div className="hidden md:flex items-center gap-6 text-xs text-slate-400">
                          <div className="text-center">
                            <p className="font-semibold text-white">{tenant.userCount}</p>
                            <p>usuários</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-white">{tenant.claimCount}</p>
                            <p>sinistros</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-white text-xs">
                              {new Date(tenant.createdAt).toLocaleDateString("pt-BR")}
                            </p>
                            <p>criado em</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Best Practices Notice ───────────────────────────────────── */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-300">Boas Práticas de Administração</p>
              <p className="text-amber-400/70 mt-1">
                Todas as ações realizadas neste painel são registradas no Audit Log com IP, horário e estado anterior/posterior.
                Ações destrutivas (suspensão, remoção de usuário) exigem confirmação explícita.
                Nunca compartilhe as credenciais mega-admin. Utilize o princípio do menor privilégio ao promover usuários.
              </p>
            </div>
          </div>
        </main>
      </div>
    </MegaAdminGuard>
  );
}
