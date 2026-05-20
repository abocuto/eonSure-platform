import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Palette, Globe, Mail, Phone, Image, Type, Building2,
  Save, RefreshCw, Eye, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import EonLayout from "@/components/EonLayout";

const PRESET_COLORS = [
  { label: "EonSure Ciano", primary: "oklch(0.72 0.18 195)", accent: "oklch(0.65 0.15 210)" },
  { label: "Azul Royal",    primary: "oklch(0.55 0.22 260)", accent: "oklch(0.48 0.18 270)" },
  { label: "Verde Esmeralda", primary: "oklch(0.60 0.18 160)", accent: "oklch(0.52 0.15 150)" },
  { label: "Violeta",       primary: "oklch(0.58 0.22 290)", accent: "oklch(0.50 0.18 300)" },
  { label: "Laranja",       primary: "oklch(0.68 0.20 50)",  accent: "oklch(0.60 0.18 40)" },
  { label: "Vermelho",      primary: "oklch(0.58 0.24 25)",  accent: "oklch(0.50 0.20 20)" },
];

function ColorSwatch({ color, label, selected, onClick }: {
  color: string; label: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "w-8 h-8 rounded-full border-2 transition-all duration-150 hover:scale-110",
        selected ? "border-primary ring-2 ring-primary/40 scale-110" : "border-border"
      )}
      style={{ background: color }}
    />
  );
}

function WhiteLabelContent() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: tenant, isLoading } = trpc.tenants.getMine.useQuery();
  const updateBranding = trpc.tenants.updateBranding.useMutation({
    onSuccess: () => {
      toast.success("Configurações de branding salvas com sucesso!");
      utils.tenants.getMine.invalidate();
    },
    onError: (err) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });

  const [form, setForm] = useState({
    brandName: "",
    logoUrl: "",
    primaryColor: "",
    accentColor: "",
    faviconUrl: "",
    supportEmail: "",
    supportPhone: "",
  });

  useEffect(() => {
    if (tenant) {
      setForm({
        brandName: tenant.brandName ?? "",
        logoUrl: tenant.logoUrl ?? "",
        primaryColor: tenant.primaryColor ?? "",
        accentColor: tenant.accentColor ?? "",
        faviconUrl: tenant.faviconUrl ?? "",
        supportEmail: tenant.supportEmail ?? "",
        supportPhone: tenant.supportPhone ?? "",
      });
    }
  }, [tenant]);

  const canEdit = user?.role === "admin" || user?.persona === "cio";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBranding.mutate({
      brandName: form.brandName || null,
      logoUrl: form.logoUrl || null,
      primaryColor: form.primaryColor || null,
      accentColor: form.accentColor || null,
      faviconUrl: form.faviconUrl || null,
      supportEmail: form.supportEmail || null,
      supportPhone: form.supportPhone || null,
    });
  };

  const handleReset = () => {
    if (tenant) {
      setForm({
        brandName: tenant.brandName ?? "",
        logoUrl: tenant.logoUrl ?? "",
        primaryColor: tenant.primaryColor ?? "",
        accentColor: tenant.accentColor ?? "",
        faviconUrl: tenant.faviconUrl ?? "",
        supportEmail: tenant.supportEmail ?? "",
        supportPhone: tenant.supportPhone ?? "",
      });
      toast.info("Alterações descartadas.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Palette className="w-6 h-6 text-primary" />
          Configurações White-Label
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Personalize a identidade visual da plataforma para o tenant{" "}
          <span className="font-medium text-foreground">{tenant?.name}</span>.
        </p>
      </div>

      {!canEdit && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="flex items-center gap-3 pt-4">
            <Lock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <p className="text-sm text-yellow-500">
              Apenas usuários com perfil <strong>CIO</strong> ou <strong>Admin</strong> podem editar as configurações de branding.
            </p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identidade da Marca */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Identidade da Marca
            </CardTitle>
            <CardDescription className="text-xs">
              Nome e logotipo exibidos na interface da plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brandName" className="text-sm flex items-center gap-2">
                <Type className="w-3.5 h-3.5 text-muted-foreground" />
                Nome da Marca
              </Label>
              <Input
                id="brandName"
                placeholder={tenant?.name ?? "Ex: Seguradora Atlântica"}
                value={form.brandName}
                onChange={(e) => setForm(f => ({ ...f, brandName: e.target.value }))}
                disabled={!canEdit}
                className="bg-input"
              />
              <p className="text-xs text-muted-foreground">
                Substitui "EonSure" no cabeçalho da sidebar. Deixe vazio para usar o nome padrão.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl" className="text-sm flex items-center gap-2">
                <Image className="w-3.5 h-3.5 text-muted-foreground" />
                URL do Logotipo
              </Label>
              <div className="flex gap-2">
                <Input
                  id="logoUrl"
                  placeholder="https://cdn.suaseguradora.com/logo.svg"
                  value={form.logoUrl}
                  onChange={(e) => setForm(f => ({ ...f, logoUrl: e.target.value }))}
                  disabled={!canEdit}
                  className="bg-input flex-1"
                />
                {form.logoUrl && (
                  <div className="w-10 h-10 rounded-lg border border-border bg-card flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img
                      src={form.logoUrl}
                      alt="Logo preview"
                      className="w-8 h-8 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Recomendado: SVG ou PNG com fundo transparente, mínimo 64×64px.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="faviconUrl" className="text-sm flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                URL do Favicon
              </Label>
              <Input
                id="faviconUrl"
                placeholder="https://cdn.suaseguradora.com/favicon.ico"
                value={form.faviconUrl}
                onChange={(e) => setForm(f => ({ ...f, faviconUrl: e.target.value }))}
                disabled={!canEdit}
                className="bg-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Paleta de Cores */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              Paleta de Cores
            </CardTitle>
            <CardDescription className="text-xs">
              Cores primária e de destaque da interface. Use valores OKLCH, HEX ou RGB.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Presets */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Presets Rápidos</Label>
              <div className="flex flex-wrap gap-3">
                {PRESET_COLORS.map((preset) => (
                  <div key={preset.label} className="flex flex-col items-center gap-1">
                    <div className="flex gap-1">
                      <ColorSwatch
                        color={preset.primary}
                        label={`${preset.label} - Primária`}
                        selected={form.primaryColor === preset.primary}
                        onClick={() => canEdit && setForm(f => ({
                          ...f,
                          primaryColor: preset.primary,
                          accentColor: preset.accent,
                        }))}
                      />
                      <ColorSwatch
                        color={preset.accent}
                        label={`${preset.label} - Destaque`}
                        selected={false}
                        onClick={() => {}}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{preset.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor" className="text-sm">Cor Primária</Label>
                <div className="flex gap-2 items-center">
                  <div
                    className="w-8 h-8 rounded-md border border-border flex-shrink-0"
                    style={{ background: form.primaryColor || "var(--primary)" }}
                  />
                  <Input
                    id="primaryColor"
                    placeholder="oklch(0.72 0.18 195)"
                    value={form.primaryColor}
                    onChange={(e) => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                    disabled={!canEdit}
                    className="bg-input font-mono text-xs"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Botões, links e elementos de destaque.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor" className="text-sm">Cor de Destaque</Label>
                <div className="flex gap-2 items-center">
                  <div
                    className="w-8 h-8 rounded-md border border-border flex-shrink-0"
                    style={{ background: form.accentColor || "var(--accent)" }}
                  />
                  <Input
                    id="accentColor"
                    placeholder="oklch(0.65 0.15 210)"
                    value={form.accentColor}
                    onChange={(e) => setForm(f => ({ ...f, accentColor: e.target.value }))}
                    disabled={!canEdit}
                    className="bg-input font-mono text-xs"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Hover, badges e elementos secundários.</p>
              </div>
            </div>

            {/* Live Preview */}
            {(form.primaryColor || form.accentColor) && (
              <div className="rounded-lg border border-border p-4 space-y-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Pré-visualização
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="px-4 py-1.5 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90"
                    style={{ background: form.primaryColor || "var(--primary)" }}
                  >
                    Botão Primário
                  </button>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-medium border"
                    style={{
                      background: `${form.accentColor || "var(--accent)"}22`,
                      color: form.accentColor || "var(--accent)",
                      borderColor: `${form.accentColor || "var(--accent)"}44`,
                    }}
                  >
                    Badge Destaque
                  </span>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: form.primaryColor || "var(--primary)" }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contato de Suporte */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Contato de Suporte
            </CardTitle>
            <CardDescription className="text-xs">
              Informações de suporte exibidas na plataforma para os usuários do tenant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supportEmail" className="text-sm flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  E-mail de Suporte
                </Label>
                <Input
                  id="supportEmail"
                  type="email"
                  placeholder="suporte@suaseguradora.com.br"
                  value={form.supportEmail}
                  onChange={(e) => setForm(f => ({ ...f, supportEmail: e.target.value }))}
                  disabled={!canEdit}
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportPhone" className="text-sm flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  Telefone de Suporte
                </Label>
                <Input
                  id="supportPhone"
                  placeholder="+55 11 9 9999-9999"
                  value={form.supportPhone}
                  onChange={(e) => setForm(f => ({ ...f, supportPhone: e.target.value }))}
                  disabled={!canEdit}
                  className="bg-input"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {canEdit && (
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={updateBranding.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              {updateBranding.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {updateBranding.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={updateBranding.isPending}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Descartar Alterações
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

export default function WhiteLabel() {
  return (
    <EonLayout>
      <WhiteLabelContent />
    </EonLayout>
  );
}
