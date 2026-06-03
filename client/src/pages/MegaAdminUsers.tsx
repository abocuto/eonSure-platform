import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users, Search, Lock, ArrowLeft, ShieldCheck, Activity, BarChart3,
  Copy, ExternalLink, Eye, LogOut, Building2, User, Crown, Shield,
} from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useAuth as useAuthHook } from "@/_core/hooks/useAuth";

// ─── Guard ────────────────────────────────────────────────────────────────────
function MegaAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
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
  return <>{children}</>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  "mega-admin": { label: "Mega-Admin", color: "bg-red-500/20 text-red-300 border-red-500/30", icon: Crown },
  "admin": { label: "Admin", color: "bg-amber-500/20 text-amber-300 border-amber-500/30", icon: Shield },
  "user": { label: "Usuário", color: "bg-white/5 text-slate-400 border-white/10", icon: User },
};

const LOGIN_METHOD_LABELS: Record<string, string> = {
  "demo": "Demo",
  "mega-admin": "Mega-Admin",
  "manus": "Manus OAuth",
  "google": "Google",
  "github": "GitHub",
};

// ─── Demo Credentials Card ────────────────────────────────────────────────────
const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

const DEMO_CREDENTIALS = [
  {
    persona: "c-level",
    name: "Ana Rodrigues",
    email: "ana@eonsure.ai",
    role: "admin",
    loginUrl: `${BASE_URL}/api/demo-login?persona=c-level`,
    description: "Acesso ao Dashboard Executivo, KPIs financeiros, análises preditivas e todos os módulos.",
  },
  {
    persona: "gerente-sinistros",
    name: "Carlos Mendes",
    email: "carlos@eonsure.ai",
    role: "user",
    loginUrl: `${BASE_URL}/api/demo-login?persona=gerente-sinistros`,
    description: "Gestão do ciclo de vida de sinistros, Motor de Regras e CSAT.",
  },
  {
    persona: "analista-fraude",
    name: "Beatriz Lima",
    email: "beatriz@eonsure.ai",
    role: "user",
    loginUrl: `${BASE_URL}/api/demo-login?persona=analista-fraude`,
    description: "Painel de detecção de fraude, scores de risco e investigações.",
  },
  {
    persona: "cio",
    name: "Rafael Costa",
    email: "rafael@eonsure.ai",
    role: "user",
    loginUrl: `${BASE_URL}/api/demo-login?persona=cio`,
    description: "Gestão de assinaturas, ativação de pilares tecnológicos e white-label.",
  },
  {
    persona: "perito",
    name: "Mariana Silva",
    email: "mariana@eonsure.ai",
    role: "user",
    loginUrl: `${BASE_URL}/api/demo-login?persona=perito`,
    description: "Análise técnica de sinistros, laudos e histórico de eventos.",
  },
  {
    persona: "mega-admin",
    name: "Super Admin EonSure",
    email: "megaadmin@eonsure.ai",
    role: "mega-admin",
    loginUrl: `${BASE_URL}/api/mega-admin-login?secret=EonSure@MegaAdmin2024!`,
    description: "Acesso irrestrito ao painel do proprietário. Gerencia todos os tenants.",
  },
];

function CredentialCard({ cred }: { cred: typeof DEMO_CREDENTIALS[0] }) {
  const roleConf = ROLE_CONFIG[cred.role] ?? ROLE_CONFIG.user;
  const RoleIcon = roleConf.icon;

  const copyUrl = () => {
    navigator.clipboard.writeText(cred.loginUrl);
    toast.success("URL copiada para a área de transferência!");
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${
            cred.persona === "mega-admin"
              ? "bg-red-500/20 border-red-500/30"
              : "bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border-white/10"
          }`}>
            {cred.persona === "mega-admin" ? (
              <Crown className="w-4 h-4 text-red-400" />
            ) : (
              <span className="text-sm font-bold text-cyan-400">{cred.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{cred.name}</p>
            <p className="text-xs text-slate-500">{cred.email}</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          <Badge className={`${PERSONA_COLORS[cred.persona] ?? "bg-white/5 text-slate-400 border-white/10"} text-xs`}>
            {PERSONA_LABELS[cred.persona] ?? cred.persona}
          </Badge>
          <Badge className={`${roleConf.color} text-xs gap-1`}>
            <RoleIcon className="w-3 h-3" />
            {roleConf.label}
          </Badge>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-3 leading-relaxed">{cred.description}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-black/30 border border-white/10 rounded px-2 py-1.5 text-slate-300 font-mono truncate">
          {cred.loginUrl.replace(BASE_URL, "")}
        </code>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={copyUrl} className="h-7 w-7 p-0 text-slate-400 hover:text-white flex-shrink-0">
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copiar URL</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a href={cred.loginUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-cyan-400 flex-shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            </TooltipTrigger>
            <TooltipContent>Abrir em nova aba</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MegaAdminUsers() {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterPersona, setFilterPersona] = useState("all");
  const [filterTenant, setFilterTenant] = useState("all");

  const { data: allUsers, isLoading } = trpc.megaAdmin.getAllUsers.useQuery({});
  const { data: tenants } = trpc.megaAdmin.getAllTenants.useQuery();

  const filtered = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter((u) => {
      if (filterRole !== "all" && u.role !== filterRole) return false;
      if (filterPersona !== "all" && u.persona !== filterPersona) return false;
      if (filterTenant !== "all") {
        if (filterTenant === "none" && u.tenantId !== null) return false;
        if (filterTenant !== "none" && String(u.tenantId) !== filterTenant) return false;
      }
      if (search) {
        const s = search.toLowerCase();
        if (
          !(u.name ?? "").toLowerCase().includes(s) &&
          !(u.email ?? "").toLowerCase().includes(s) &&
          !(u.tenantName ?? "").toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [allUsers, search, filterRole, filterPersona, filterTenant]);

  return (
    <MegaAdminGuard>
      <div className="min-h-screen bg-[#0a0f1e] text-white">
        {/* Header */}
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
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-1.5 text-xs">
                  <BarChart3 className="w-3.5 h-3.5" /> Dashboard
                </Button>
              </Link>
              <Link href="/mega-admin/users">
                <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 gap-1.5 text-xs">
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
              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => logout()}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-white">Usuários da Plataforma</h1>
            <p className="text-slate-400 text-sm mt-1">
              Todos os usuários cadastrados, seus níveis de acesso e credenciais de demonstração.
            </p>
          </div>

          {/* ─── Credenciais de Demonstração ─────────────────────────────── */}
          <Card className="bg-[#0d1526] border-white/10">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" /> Credenciais de Acesso
              </CardTitle>
              <p className="text-slate-400 text-sm">
                URLs de login direto para cada persona de demonstração. Clique em
                <ExternalLink className="w-3.5 h-3.5 inline mx-1 text-cyan-400" />
                para abrir em nova aba ou em
                <Copy className="w-3.5 h-3.5 inline mx-1 text-cyan-400" />
                para copiar a URL.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DEMO_CREDENTIALS.map((cred) => (
                  <CredentialCard key={cred.persona} cred={cred} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ─── Lista de Usuários ────────────────────────────────────────── */}
          <Card className="bg-[#0d1526] border-white/10">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  Todos os Usuários ({filtered.length})
                </CardTitle>
              </div>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mt-3">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por nome, e-mail ou empresa..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 text-sm h-9"
                  />
                </div>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white text-sm h-9">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d1526] border-white/10">
                    <SelectItem value="all" className="text-white">Todos os roles</SelectItem>
                    <SelectItem value="mega-admin" className="text-white">Mega-Admin</SelectItem>
                    <SelectItem value="admin" className="text-white">Admin</SelectItem>
                    <SelectItem value="user" className="text-white">Usuário</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPersona} onValueChange={setFilterPersona}>
                  <SelectTrigger className="w-44 bg-white/5 border-white/10 text-white text-sm h-9">
                    <SelectValue placeholder="Persona" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d1526] border-white/10">
                    <SelectItem value="all" className="text-white">Todas as personas</SelectItem>
                    <SelectItem value="c-level" className="text-white">C-Level</SelectItem>
                    <SelectItem value="gerente-sinistros" className="text-white">Gerente de Sinistros</SelectItem>
                    <SelectItem value="analista-fraude" className="text-white">Analista de Fraude</SelectItem>
                    <SelectItem value="cio" className="text-white">CIO</SelectItem>
                    <SelectItem value="perito" className="text-white">Perito</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterTenant} onValueChange={setFilterTenant}>
                  <SelectTrigger className="w-44 bg-white/5 border-white/10 text-white text-sm h-9">
                    <SelectValue placeholder="Tenant" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d1526] border-white/10">
                    <SelectItem value="all" className="text-white">Todos os tenants</SelectItem>
                    <SelectItem value="none" className="text-white">Sem tenant</SelectItem>
                    {(tenants ?? []).map((t) => (
                      <SelectItem key={t.id} value={String(t.id)} className="text-white">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Header */}
              <div className="hidden lg:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-2 border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
                <span>Usuário</span>
                <span>Empresa</span>
                <span>Persona</span>
                <span>Role</span>
                <span>Login</span>
                <span>Último acesso</span>
              </div>
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 bg-white/5 rounded-lg" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum usuário encontrado.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filtered.map((u) => {
                    const roleConf = ROLE_CONFIG[u.role ?? "user"] ?? ROLE_CONFIG.user;
                    const RoleIcon = roleConf.icon;
                    const isMegaAdmin = u.role === "mega-admin";
                    const isDemo = u.openId?.startsWith("demo-") || isMegaAdmin;

                    return (
                      <div key={u.id} className="grid grid-cols-1 lg:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4 hover:bg-white/5 transition-colors">
                        {/* User */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center border flex-shrink-0 ${
                            isMegaAdmin
                              ? "bg-red-500/20 border-red-500/30"
                              : "bg-gradient-to-br from-blue-500/20 to-purple-600/20 border-white/10"
                          }`}>
                            {isMegaAdmin ? (
                              <Crown className="w-4 h-4 text-red-400" />
                            ) : (
                              <span className="text-xs font-bold text-blue-400">{(u.name ?? "?").charAt(0)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white truncate">{u.name ?? "—"}</p>
                              {isDemo && (
                                <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-xs">Demo</Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate">{u.email ?? "—"}</p>
                          </div>
                        </div>

                        {/* Tenant */}
                        <div className="flex items-center gap-2">
                          {u.tenantName ? (
                            <Link href={`/mega-admin/tenant/${u.tenantId}`}>
                              <span className="text-sm text-slate-300 hover:text-cyan-400 transition-colors flex items-center gap-1.5 cursor-pointer">
                                <Building2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                <span className="truncate">{u.tenantName}</span>
                              </span>
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-600 italic">Sem tenant</span>
                          )}
                        </div>

                        {/* Persona */}
                        <div>
                          {u.persona ? (
                            <Badge className={`${PERSONA_COLORS[u.persona] ?? "bg-white/5 text-slate-400 border-white/10"} text-xs`}>
                              {PERSONA_LABELS[u.persona] ?? u.persona}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-600">—</span>
                          )}
                        </div>

                        {/* Role */}
                        <div>
                          <Badge className={`${roleConf.color} text-xs gap-1`}>
                            <RoleIcon className="w-3 h-3" />
                            {roleConf.label}
                          </Badge>
                        </div>

                        {/* Login method */}
                        <div>
                          <span className="text-xs text-slate-400">
                            {LOGIN_METHOD_LABELS[u.loginMethod ?? ""] ?? u.loginMethod ?? "—"}
                          </span>
                        </div>

                        {/* Last sign-in */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-400">
                            {u.lastSignedIn
                              ? new Date(u.lastSignedIn).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
                              : "—"}
                          </span>
                          {/* Quick login link for demo users */}
                          {u.demoLoginUrl && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a href={u.demoLoginUrl} target="_blank" rel="noopener noreferrer">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-cyan-400">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </Button>
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>Login rápido como este usuário</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </MegaAdminGuard>
  );
}
