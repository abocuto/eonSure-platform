import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { KpiCard, RiskBadge, StatusPill, SectionHeader } from "@/components/EonComponents";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  TrendingUp, Clock, ShieldCheck, ClipboardList, AlertTriangle,
  CheckCircle2, BarChart3, ArrowRight, RefreshCw, Zap,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { PERSONA_LABELS } from "../../../shared/types";
import type { Persona } from "../../../shared/types";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const RISK_COLORS = {
  green: "oklch(0.65 0.18 145)",
  yellow: "oklch(0.75 0.18 75)",
  red: "oklch(0.60 0.22 25)",
};

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: "oklch(0.18 0.04 240)",
  border: "1px solid oklch(0.28 0.05 240)",
  borderRadius: "8px",
  color: "oklch(0.93 0.01 240)",
  fontSize: "12px",
};

// Formats "2025-11" → "Nov"
function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

const CAN_READ_ANALYTICS: Persona[] = ["c-level", "gerente-sinistros", "cio"];

export default function Dashboard() {
  const { user } = useAuth();
  const persona = (user?.persona ?? "perito") as Persona;
  const canReadAnalytics = CAN_READ_ANALYTICS.includes(persona);

  const {
    data: kpis,
    isLoading: kpisLoading,
    refetch,
  } = trpc.analytics.getKpis.useQuery(undefined, {
    refetchInterval: canReadAnalytics ? 30_000 : false,
    enabled: canReadAnalytics,
  });

  const {
    data: trendRaw,
    isLoading: trendLoading,
  } = trpc.analytics.getKpisTrend.useQuery(
    { months: 6 },
    {
      refetchInterval: canReadAnalytics ? 30_000 : false,
      enabled: canReadAnalytics,
    }
  );

  const { data: claims, isLoading: claimsLoading } = trpc.claims.list.useQuery({ limit: 5 });

  // Transform trend data for Recharts
  const trendData = useMemo(() => {
    if (!trendRaw || trendRaw.length === 0) return [];
    return trendRaw.map((r) => ({
      month: formatMonthLabel(r.month),
      sinistros: r.totalClaims,
      resolvidos: r.closedClaims,
      fraudes: r.fraudRed,
    }));
  }, [trendRaw]);

  const fraudPieData = kpis
    ? [
        { name: "Baixo Risco", value: kpis.fraudStats.green, color: RISK_COLORS.green },
        { name: "Risco Médio", value: kpis.fraudStats.yellow, color: RISK_COLORS.yellow },
        { name: "Alto Risco", value: kpis.fraudStats.red, color: RISK_COLORS.red },
      ]
    : [];

  const totalFraud = fraudPieData.reduce((a, b) => a + b.value, 0);

  const financialEfficiency = kpis
    ? kpis.financialStats.totalClaimed > 0
      ? ((1 - kpis.financialStats.totalApproved / kpis.financialStats.totalClaimed) * 100).toFixed(1)
      : "0.0"
    : "0.0";

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`Bem-vindo, ${user?.name?.split(" ")[0] ?? "Usuário"}`}
        subtitle={`${PERSONA_LABELS[persona]} · Dashboard Executivo`}
        icon={LayoutDashboard}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetch(); }}
            className="border-border text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Atualizar
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {canReadAnalytics && kpisLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="p-5 border border-border">
              <Skeleton className="w-10 h-10 rounded-lg mb-3" />
              <Skeleton className="h-7 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </Card>
          ))
        ) : (
          <>
            {canReadAnalytics && (
              <>
                <KpiCard
                  title="Eficiência Financeira"
                  value={`${financialEfficiency}%`}
                  icon={TrendingUp}
                  trend={4.2}
                  trendLabel="vs. mês anterior"
                  description="Redução de custo total de sinistros"
                  highlight
                />
                <KpiCard
                  title="TMR — Tempo Médio de Resolução"
                  value={kpis?.avgResolutionDays ?? "—"}
                  unit="dias"
                  icon={Clock}
                  trend={-8.5}
                  trendLabel="vs. mês anterior"
                  description="Média de dias para encerramento"
                />
                <KpiCard
                  title="Acurácia Preditiva"
                  value="82%"
                  icon={ShieldCheck}
                  trend={2.1}
                  trendLabel="vs. mês anterior"
                  description="Precisão do modelo de risco"
                />
              </>
            )}
            <KpiCard
              title="Sinistros Ativos"
              value={kpis?.openClaims ?? claims?.length ?? 0}
              icon={ClipboardList}
              trendLabel={kpis ? `${kpis.totalClaims} total` : `${claims?.length ?? 0} carregados`}
              description="Sinistros em processamento"
            />
          </>
        )}
      </div>

      {/* Charts Row — only for personas with analytics:read */}
      {canReadAnalytics && <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Trend Chart — Real Data */}
        <Card className="xl:col-span-2 p-5 border border-border bg-card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Volume de Sinistros</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Últimos 6 meses · dados reais</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                Registrados
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Resolvidos
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                Alto Risco
              </span>
            </div>
          </div>

          {trendLoading ? (
            <Skeleton className="w-full h-[200px] rounded-lg" />
          ) : trendData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">Nenhum dado de tendência disponível ainda.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Registre sinistros para visualizar a evolução.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorSinistros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.18 195)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.72 0.18 195)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorResolvidos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.18 145)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.65 0.18 145)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.05 240)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "oklch(0.60 0.04 240)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "oklch(0.60 0.04 240)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="sinistros" stroke="oklch(0.72 0.18 195)" strokeWidth={2} fill="url(#colorSinistros)" name="Registrados" />
                <Area type="monotone" dataKey="resolvidos" stroke="oklch(0.65 0.18 145)" strokeWidth={2} fill="url(#colorResolvidos)" name="Resolvidos" />
                <Area type="monotone" dataKey="fraudes" stroke="oklch(0.60 0.22 25)" strokeWidth={1.5} fill="none" strokeDasharray="4 2" name="Alto Risco" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Fraud Distribution */}
        <Card className="p-5 border border-border bg-card">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-foreground">Distribuição de Risco</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Score de fraude atual</p>
          </div>
          {kpisLoading ? (
            <div className="flex items-center justify-center h-40">
              <Skeleton className="w-32 h-32 rounded-full" />
            </div>
          ) : totalFraud > 0 ? (
            <>
              <div className="flex items-center justify-center">
                <PieChart width={160} height={160}>
                  <Pie
                    data={fraudPieData}
                    cx={75}
                    cy={75}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {fraudPieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
              <div className="space-y-2 mt-2">
                {fraudPieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <ShieldCheck className="w-10 h-10 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">Nenhum sinistro analisado ainda</p>
            </div>
          )}
                </Card>
      </div>}
      {/* Recent Claims */}
      <Card className="border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Sinistros Recentes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Últimos registros no sistema</p>
          </div>
          <Link href="/claims">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 text-xs">
              Ver todos
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="divide-y divide-border">
          {claimsLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32 flex-1" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))
          ) : claims && claims.length > 0 ? (
            claims.map((claim) => (
              <Link
                key={claim.id}
                href={`/claims/${claim.id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-accent/30 transition-colors cursor-pointer"
              >
                <span className="text-xs font-mono text-muted-foreground w-32 flex-shrink-0 truncate">
                  {claim.claimNumber}
                </span>
                <span className="text-sm text-foreground flex-1 truncate">
                  {claim.insuredName ?? "—"}
                </span>
                <StatusPill status={claim.status} size="sm" />
                {claim.fraudRisk && (
                  <RiskBadge level={claim.fraudRisk as "green" | "yellow" | "red"} size="sm" />
                )}
                <span className="text-xs text-muted-foreground hidden sm:block flex-shrink-0">
                  {new Date(claim.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </Link>
            ))
          ) : (
            <div className="px-5 py-10 text-center">
              <ClipboardList className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum sinistro registrado ainda.</p>
              <Link href="/claims/new">
                <Button size="sm" className="mt-3 bg-primary text-primary-foreground">
                  Registrar Sinistro
                </Button>
              </Link>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Novo Sinistro", href: "/claims/new", icon: ClipboardList, color: "text-primary" },
          { label: "Verificar Fraudes", href: "/fraud", icon: AlertTriangle, color: "text-yellow-400" },
          { label: "Análise Preditiva", href: "/analytics", icon: BarChart3, color: "text-purple-400" },
          { label: "Motor de Regras", href: "/rules", icon: Zap, color: "text-cyan-400" },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-accent/30 transition-all text-center group"
            >
              <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Icon className={cn("w-4 h-4", action.color)} />
              </div>
              <span className="text-xs font-medium text-foreground">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Import needed for SectionHeader
function LayoutDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
