import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect, useCallback } from "react";
import {
  Zap, Shield, BarChart3, GitBranch, Database, ShieldAlert,
  TrendingUp, CheckCircle2, ArrowRight, ChevronRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Database,
    title: "Estrutura de Dados Eônica",
    description: "Harmonização e gestão de dados de sinistros ao longo de vastos períodos e múltiplas fontes.",
  },
  {
    icon: GitBranch,
    title: "Motor de Regras No-Code",
    description: "Lógica de negócios transparente com triagem automatizada e log de explicabilidade completo.",
  },
  {
    icon: ShieldAlert,
    title: "ML Contra Fraude",
    description: "Detecção preditiva de fraudes com score Verde, Amarelo e Vermelho em tempo real.",
  },
  {
    icon: BarChart3,
    title: "Análise Preditiva",
    description: "Sugestões de indenização com precisão cirúrgica e previsão de custo final do sinistro.",
  },
];

const STATS = [
  { value: "40%", label: "Redução no TMR" },
  { value: "99.9%", label: "Disponibilidade" },
  { value: "< 2s", label: "Score de Risco" },
  { value: "82%", label: "Acurácia Preditiva" },
];

export default function Home() {
  const { isAuthenticated, loading, refresh } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  // Demo login: fetch token via JSON API, store in localStorage for Authorization header
  const handleDemoLogin = useCallback(async (persona: string) => {
    try {
      const res = await fetch(`/api/demo-login?persona=${persona}`, {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("eon_auth_token", data.token);
        await refresh();
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Demo login failed", err);
    }
  }, [navigate, refresh]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">EonSure</span>
          <span className="hidden sm:inline text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
            InsurTech
          </span>
        </div>
        <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <a href={getLoginUrl()}>
            Acessar Plataforma
            <ChevronRight className="w-4 h-4 ml-1" />
          </a>
        </Button>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-0 w-[300px] h-[300px] bg-primary/3 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-primary eon-live" />
            Plataforma de IA para Seguradoras
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground leading-tight mb-6">
            Predict. Protect.{" "}
            <span className="text-primary">Prevail.</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
            A plataforma SaaS B2B que transforma a gestão de sinistros em um processo preditivo, transparente e altamente eficiente.
          </p>

          <p className="text-base text-muted-foreground/70 max-w-xl mx-auto mb-10">
            <strong className="text-foreground">EonSure</strong> — A Certeza da Próxima Era.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 eon-glow-sm">
              <a href={getLoginUrl()}>
                Começar Agora
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            </Button>
            <Button variant="outline" size="lg" className="border-border text-foreground hover:bg-accent px-8" onClick={() => handleDemoLogin("c-level")}>
              Demo — Entrar como C-Level
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 px-6 border-y border-border bg-card/30">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl sm:text-3xl font-black text-primary">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Os 4 Pilares Tecnológicos
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Uma arquitetura modular que ativa cada pilar conforme a necessidade da sua seguradora.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="eon-card p-6 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Personas Section */}
      <section className="py-20 px-6 bg-card/20 border-y border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Feito para Cada Persona
            </h2>
            <p className="text-muted-foreground">
              Controle de acesso e dashboards personalizados para cada perfil da sua equipe.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: "C-Level", icon: TrendingUp, desc: "KPIs Executivos" },
              { label: "Gerente de Sinistros", icon: Shield, desc: "Operações" },
              { label: "Analista de Fraude", icon: ShieldAlert, desc: "Investigação" },
              { label: "CIO", icon: Database, desc: "Tecnologia" },
              { label: "Perito", icon: CheckCircle2, desc: "Avaliação" },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.label} className="flex flex-col items-center text-center p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-tight mb-1">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Pronto para transformar sua operação?
          </h2>
          <p className="text-muted-foreground mb-8">
            Acesse a plataforma EonSure e comece a gerenciar sinistros com inteligência artificial.
          </p>
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-10 eon-glow">
            <a href={getLoginUrl()}>
              Acessar a Plataforma
              <ArrowRight className="w-5 h-5 ml-2" />
            </a>
          </Button>
        </div>
      </section>

      {/* Demo Access Section */}
      <section className="py-16 px-6 bg-card/30 border-y border-border">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Acesso Demo — Ambiente de Demonstração
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
            Explore a plataforma por persona
          </h2>
          <p className="text-muted-foreground text-sm mb-8">
            Cada persona possui acesso a módulos específicos. Escolha uma para explorar a experiência completa.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { persona: "c-level", label: "C-Level", desc: "Visão estratégica", icon: "👔" },
              { persona: "gerente-sinistros", label: "Gerente", desc: "Gestão operacional", icon: "📋" },
              { persona: "analista-fraude", label: "Analista Fraude", desc: "Detecção de fraudes", icon: "🔍" },
              { persona: "cio", label: "CIO", desc: "Tecnologia e dados", icon: "⚙️" },
              { persona: "perito", label: "Perito", desc: "Avaliação de sinistros", icon: "🔬" },
            ].map(({ persona, label, desc, icon }) => (
              <button
                key={persona}
                onClick={() => handleDemoLogin(persona)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer w-full"
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{label}</span>
                <span className="text-xs text-muted-foreground text-center">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">EonSure</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 EonSure. Plataforma InsurTech de Gestão de Sinistros com IA.
          </p>
        </div>
      </footer>
    </div>
  );
}
