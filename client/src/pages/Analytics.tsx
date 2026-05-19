import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard, SectionHeader, EmptyState } from "@/components/EonComponents";
import { Link } from "wouter";
import {
  BarChart3, TrendingUp, Clock, DollarSign, AlertTriangle,
  CheckCircle2, ArrowRight, Zap,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const RADAR_DATA = [
  { metric: "Eficiência", value: 82 },
  { metric: "Velocidade", value: 74 },
  { metric: "Acurácia", value: 88 },
  { metric: "Fraude", value: 91 },
  { metric: "CSAT", value: 76 },
  { metric: "Custo", value: 69 },
];

const COST_TREND = [
  { month: "Jan", previsto: 120000, real: 115000 },
  { month: "Fev", previsto: 135000, real: 128000 },
  { month: "Mar", previsto: 118000, real: 122000 },
  { month: "Abr", previsto: 145000, real: 138000 },
  { month: "Mai", previsto: 160000, real: 151000 },
  { month: "Jun", previsto: 142000, real: 139000 },
];

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: "oklch(0.18 0.04 240)",
  border: "1px solid oklch(0.28 0.05 240)",
  borderRadius: "8px",
  color: "oklch(0.93 0.01 240)",
  fontSize: "12px",
};

export default function Analytics() {
  const { data: kpis, isLoading } = trpc.analytics.getKpis.useQuery();

  const financialEfficiency = kpis && kpis.financialStats.totalClaimed > 0
    ? ((1 - kpis.financialStats.totalApproved / kpis.financialStats.totalClaimed) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Análise Preditiva"
        subtitle="Sugestões inteligentes de indenização e previsão de custo final"
        icon={BarChart3}
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <KpiCard
              title="Eficiência Financeira"
              value={`${financialEfficiency}%`}
              icon={TrendingUp}
              trend={4.2}
              highlight
            />
            <KpiCard
              title="TMR Médio"
              value={kpis?.avgResolutionDays ?? "—"}
              unit="dias"
              icon={Clock}
              trend={-8.5}
            />
            <KpiCard
              title="Valor Total Aprovado"
              value={kpis ? `R$ ${(kpis.financialStats.totalApproved / 1000).toFixed(0)}k` : "—"}
              icon={DollarSign}
            />
            <KpiCard
              title="Sinistros Encerrados"
              value={kpis?.closedClaims ?? 0}
              icon={CheckCircle2}
              trendLabel={`de ${kpis?.totalClaims ?? 0} total`}
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Radar Chart */}
        <Card className="p-5 border border-border bg-card">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Performance Operacional</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Visão multidimensional dos KPIs</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="oklch(0.28 0.05 240)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "oklch(0.60 0.04 240)", fontSize: 11 }} />
              <Radar
                dataKey="value"
                stroke="oklch(0.72 0.18 195)"
                fill="oklch(0.72 0.18 195)"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* Cost Trend */}
        <Card className="p-5 border border-border bg-card">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Custo Previsto vs. Real</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Precisão do modelo preditivo</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={COST_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.05 240)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "oklch(0.60 0.04 240)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "oklch(0.60 0.04 240)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={CUSTOM_TOOLTIP_STYLE}
                formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`}
              />
              <Legend wrapperStyle={{ fontSize: "11px", color: "oklch(0.60 0.04 240)" }} />
              <Line type="monotone" dataKey="previsto" stroke="oklch(0.72 0.18 195)" strokeWidth={2} dot={false} name="Previsto" strokeDasharray="5 3" />
              <Line type="monotone" dataKey="real" stroke="oklch(0.65 0.18 145)" strokeWidth={2} dot={false} name="Real" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Model Info */}
      <Card className="p-5 border border-border bg-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Modelo Preditivo EonSure v1.0</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Treinado com 127+ casos históricos · Confiança média de 82%
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/5 flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 eon-live" />
            Ativo
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-border">
          {[
            { label: "Sugestão de Indenização", desc: "Valor recomendado com base em casos similares" },
            { label: "Custo Final Previsto", desc: "Estimativa total incluindo custos operacionais" },
            { label: "Probabilidade de Litígio", desc: "Risco de escalada jurídica do sinistro" },
            { label: "TMR Previsto", desc: "Tempo estimado para resolução completa" },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <p className="text-xs font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* CTA to Claims */}
      <Card className="p-5 border border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Gerar Análise para um Sinistro</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acesse um sinistro e use "Gerar Análise Preditiva" para obter sugestões de indenização.
            </p>
          </div>
          <Link href="/claims">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0">
              Ver Sinistros
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
