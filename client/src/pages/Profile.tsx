import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Mail, Shield, Building2, Save, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { PERSONA_LABELS } from "../../../shared/types";
import type { Persona } from "../../../shared/types";
import EonLayout from "@/components/EonLayout";

const PERSONA_OPTIONS: { value: Persona; label: string }[] = [
  { value: "c-level", label: "C-Level / Executivo" },
  { value: "gerente-sinistros", label: "Gerente de Sinistros" },
  { value: "analista-fraude", label: "Analista de Fraude" },
  { value: "cio", label: "Diretor de Tecnologia (CIO)" },
  { value: "perito", label: "Perito / Avaliador" },
];

function ProfileContent() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [name, setName] = useState(user?.name ?? "");
  const [persona, setPersona] = useState<Persona>((user?.persona as Persona) ?? "perito");
  const [saving, setSaving] = useState(false);

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("Perfil atualizado com sucesso!");
      setSaving(false);
    },
    onError: (err) => {
      toast.error("Erro ao atualizar perfil: " + err.message);
      setSaving(false);
    },
  });

  const handleSave = () => {
    setSaving(true);
    updateProfile.mutate({ name, persona });
  };

  const initials = (user?.name ?? "U").slice(0, 2).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas informações de cadastro</p>
        </div>
      </div>

      {/* Avatar Card */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex items-center gap-5">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">{user?.name ?? "Usuário"}</p>
              <p className="text-sm text-muted-foreground">{user?.email ?? ""}</p>
              <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                {PERSONA_LABELS[(user?.persona as Persona) ?? "perito"]}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>Atualize seu nome e persona de acesso na plataforma.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-foreground">
              Nome completo
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              className="bg-muted/40 border-border"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              E-mail
            </Label>
            <Input
              value={user?.email ?? ""}
              disabled
              className="bg-muted/20 border-border text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
          </div>

          <Separator className="bg-border" />

          {/* Persona */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Persona de acesso
            </Label>
            <Select value={persona} onValueChange={(v) => setPersona(v as Persona)}>
              <SelectTrigger className="bg-muted/40 border-border">
                <SelectValue placeholder="Selecione sua persona" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {PERSONA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-foreground">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A persona define quais módulos e funcionalidades ficam visíveis no menu lateral.
            </p>
          </div>

          {/* Tenant info (read-only) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              Tenant / Organização
            </Label>
            <Input
              value={user?.tenantId ? `Tenant #${user.tenantId}` : "Conta individual"}
              disabled
              className="bg-muted/20 border-border text-muted-foreground cursor-not-allowed"
            />
          </div>

          {/* Save */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Informações da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Método de login</span>
            <Badge variant="secondary" className="capitalize">{user?.loginMethod ?? "email"}</Badge>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Função no sistema</span>
            <Badge variant={user?.role === "admin" ? "default" : "secondary"} className="capitalize">
              {user?.role === "admin" ? "Administrador" : "Usuário"}
            </Badge>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Membro desde</span>
            <span className="text-foreground text-xs">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Último acesso</span>
            <span className="text-foreground text-xs">
              {user?.lastSignedIn ? new Date(user.lastSignedIn).toLocaleString("pt-BR") : "—"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Profile() {
  return (
    <EonLayout>
      <ProfileContent />
    </EonLayout>
  );
}
