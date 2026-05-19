import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, ClipboardList, ShieldAlert, GitBranch,
  BarChart3, MessageSquare, Settings, LogOut, Menu, X,
  TrendingUp, Server, Search, ChevronRight, Bell, Zap,
} from "lucide-react";
import { PERSONA_LABELS } from "../../../shared/types";
import type { Persona } from "../../../shared/types";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, personas: ["c-level", "gerente-sinistros", "analista-fraude", "cio", "perito"] },
  { href: "/claims", label: "Sinistros", icon: ClipboardList, personas: ["gerente-sinistros", "perito", "c-level", "cio"] },
  { href: "/fraud", label: "Detecção de Fraude", icon: ShieldAlert, personas: ["analista-fraude", "gerente-sinistros", "c-level"] },
  { href: "/rules", label: "Motor de Regras", icon: GitBranch, personas: ["gerente-sinistros", "cio", "c-level"] },
  { href: "/analytics", label: "Análise Preditiva", icon: BarChart3, personas: ["c-level", "gerente-sinistros", "cio"] },
  { href: "/csat", label: "CSAT", icon: MessageSquare, personas: ["c-level", "gerente-sinistros", "cio"] },
  { href: "/subscriptions", label: "Assinaturas", icon: Settings, personas: ["cio", "c-level"] },
];

const PERSONA_ICON_MAP: Record<Persona, React.ComponentType<{ className?: string }>> = {
  "c-level": TrendingUp,
  "gerente-sinistros": ClipboardList,
  "analista-fraude": ShieldAlert,
  "cio": Server,
  "perito": Search,
};

interface EonLayoutProps {
  children: React.ReactNode;
}

export default function EonLayout({ children }: EonLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Carregando EonSure...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-sm px-4">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">EonSure</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground">Acesso Restrito</h2>
          <p className="text-muted-foreground">Faça login para acessar a plataforma de gestão de sinistros.</p>
          <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            <a href={getLoginUrl()}>Entrar na Plataforma</a>
          </Button>
        </div>
      </div>
    );
  }

  const persona = (user?.persona ?? "perito") as Persona;
  const PersonaIcon = PERSONA_ICON_MAP[persona];
  const visibleNav = NAV_ITEMS.filter((item) => item.personas.includes(persona));

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      className={cn(
        "flex flex-col h-full",
        mobile ? "w-64" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <span className="text-lg font-bold text-sidebar-foreground">EonSure</span>
          <p className="text-xs text-muted-foreground leading-none">InsurTech Platform</p>
        </div>
      </div>

      {/* Persona Badge */}
      <div className="px-4 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent">
          <PersonaIcon className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {PERSONA_LABELS[persona]}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.name ?? "Usuário"}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
          Navegação
        </p>
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
              onClick={() => mobile && setSidebarOpen(false)}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Live indicator */}
      <div className="px-4 py-2 border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/50">
          <div className="w-2 h-2 rounded-full bg-green-500 eon-live" />
          <span className="text-xs text-muted-foreground">Sistema Online</span>
        </div>
      </div>

      {/* User / Logout */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <Link
          href="/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer group"
        >
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
              {(user?.name ?? "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate group-hover:text-primary transition-colors">{user?.name ?? "Usuário"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
          </div>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2 justify-start px-3"
          onClick={logout}
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair da conta
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border w-64 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex flex-col bg-sidebar border-r border-sidebar-border z-10">
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden w-8 h-8"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-4 h-4" />
            </Button>
            <div className="hidden lg:flex items-center gap-2">
              <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5 eon-live" />
                Tempo Real
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground">
              <Bell className="w-4 h-4" />
            </Button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50 border border-border">
              <PersonaIcon className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">{PERSONA_LABELS[persona]}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
