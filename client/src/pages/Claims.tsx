import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskBadge, StatusPill, SectionHeader, EmptyState } from "@/components/EonComponents";
import { ClipboardList, Plus, Search, Filter } from "lucide-react";
import { CLAIM_TYPE_LABELS } from "../../../shared/types";
import type { ClaimType } from "../../../shared/types";

export default function Claims() {
  const [search, setSearch] = useState("");
  const { data: claims, isLoading } = trpc.claims.list.useQuery({ limit: 50 });

  const filtered = claims?.filter((c) =>
    !search ||
    c.claimNumber.toLowerCase().includes(search.toLowerCase()) ||
    (c.insuredName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.policyNumber ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Sinistros"
        subtitle="Gestão do ciclo de vida completo de sinistros"
        icon={ClipboardList}
        actions={
          <Link href="/claims/new">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Sinistro
            </Button>
          </Link>
        }
      />

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, segurado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-sm"
          />
        </div>
        <Button variant="outline" size="sm" className="border-border text-muted-foreground">
          <Filter className="w-4 h-4 mr-1.5" />
          Filtros
        </Button>
      </div>

      {/* Claims Table */}
      <Card className="border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-accent/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Número</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Segurado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Risco</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(7).fill(0).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered && filtered.length > 0 ? (
                filtered.map((claim) => (
                  <tr
                    key={claim.id}
                    className="hover:bg-accent/20 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/claims/${claim.id}`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-primary">{claim.claimNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-foreground">{claim.insuredName ?? "—"}</span>
                      {claim.policyNumber && (
                        <p className="text-xs text-muted-foreground">{claim.policyNumber}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {CLAIM_TYPE_LABELS[claim.claimType as ClaimType]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={claim.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {claim.fraudRisk ? (
                        <RiskBadge level={claim.fraudRisk as "green" | "yellow" | "red"} size="sm" />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-foreground">
                        {claim.claimedAmount
                          ? `R$ ${Number(claim.claimedAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {new Date(claim.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-16">
                    <EmptyState
                      icon={ClipboardList}
                      title="Nenhum sinistro encontrado"
                      description="Registre o primeiro sinistro para começar a usar o sistema."
                      action={
                        <Link href="/claims/new">
                          <Button size="sm" className="bg-primary text-primary-foreground">
                            <Plus className="w-4 h-4 mr-1.5" />
                            Registrar Sinistro
                          </Button>
                        </Link>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
