import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, ShieldCheck, AlertTriangle, Info, XCircle, Search, Lock,
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

const SEVERITY_CONFIG = {
  info: { label: "Info", color: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: Info },
  warning: { label: "Atenção", color: "bg-amber-500/20 text-amber-300 border-amber-500/30", icon: AlertTriangle },
  critical: { label: "Crítico", color: "bg-red-500/20 text-red-300 border-red-500/30", icon: XCircle },
};

export default function MegaAdminAuditLog() {
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const { data, isLoading } = trpc.megaAdmin.getAuditLog.useQuery(
    { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    { enabled: !authLoading && !!user && user.role === "mega-admin" }
  );

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] p-8 space-y-4">
        <Skeleton className="h-8 w-48 bg-white/10" />
        <Skeleton className="h-96 bg-white/10 rounded-xl" />
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

  const logs = (data ?? []).filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      (log.adminName ?? "").toLowerCase().includes(q) ||
      (log.resourceName ?? "").toLowerCase().includes(q) ||
      (log.targetTenantName ?? "").toLowerCase().includes(q)
    );
  });

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
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-white">Audit Log</span>
          </div>
          <div className="ml-auto relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Buscar ação, admin, tenant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 w-64 h-8 text-sm"
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Best practice notice */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-2 text-xs text-blue-300 mb-6">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Boas práticas de auditoria:</strong> Todos os eventos críticos são imutáveis e registrados com estado anterior/posterior.
            Logs de severidade <strong>Crítico</strong> devem ser revisados manualmente. Retenção mínima recomendada: 12 meses.
          </span>
        </div>

        <Card className="bg-[#0d1526] border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Eventos Registrados ({logs.length})
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-slate-400 h-7 px-2" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>←</Button>
                <span className="text-xs text-slate-500">Pág. {page + 1}</span>
                <Button variant="ghost" size="sm" className="text-slate-400 h-7 px-2" onClick={() => setPage(p => p + 1)} disabled={(data?.length ?? 0) < PAGE_SIZE}>→</Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Nenhum evento registrado.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {logs.map((log) => {
                  const sev = SEVERITY_CONFIG[log.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.info;
                  const SevIcon = sev.icon;
                  return (
                    <div key={log.id} className="flex items-start gap-4 px-6 py-3 hover:bg-white/2 transition-colors">
                      <SevIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${sev.color.includes("blue") ? "text-blue-400" : sev.color.includes("amber") ? "text-amber-400" : "text-red-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-mono text-cyan-300">{log.action}</span>
                          <Badge className={`${sev.color} text-xs`}>{sev.label}</Badge>
                          {log.targetTenantName && (
                            <Badge className="bg-white/5 text-slate-400 border-white/10 text-xs">{log.targetTenantName}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                          <span>Admin: <span className="text-slate-400">{log.adminName ?? log.adminEmail ?? `#${log.adminId}`}</span></span>
                          {log.resourceName && <span>Recurso: <span className="text-slate-400">{log.resourceName}</span></span>}
                          {log.notes && <span className="text-slate-500 italic">{log.notes}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-slate-600 flex-shrink-0">
                        {new Date(log.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
