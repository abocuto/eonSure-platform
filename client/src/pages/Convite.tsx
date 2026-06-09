/**
 * Convite.tsx — Página de aceite de convite e registro de conta
 *
 * Rota: /convite/:token
 * Fluxo: validar token → formulário de nome + senha → setup TOTP
 */

import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shield, Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  tenant_admin: "Administrador",
  tenant_member: "Membro",
  field_agent: "Agente de Campo",
};

function RequisitossenhaItem({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <li className={`flex items-center gap-2 text-xs transition-colors ${ok ? "text-green-400" : "text-[#4A6080]"}`}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {texto}
    </li>
  );
}

export default function Convite() {
  const [, setLocation] = useLocation();
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const { data: conviteData, isLoading: conviteLoading } = trpc.authProprio.verificarConvite.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const registrarMutation = trpc.authProprio.registar.useMutation({
    onSuccess: (data) => {
      sessionStorage.setItem("eon_pending_token", data.pendingToken);
      toast.success("Conta criada! Configure o autenticador para continuar.");
      setLocation("/setup-2fa");
    },
    onError: (error) => {
      setErro(error.message);
    },
  });

  const requisitos = {
    tamanho: senha.length >= 10,
    maiuscula: /[A-Z]/.test(senha),
    numero: /[0-9]/.test(senha),
    especial: /[^A-Za-z0-9]/.test(senha),
    confirmacao: senha === confirmarSenha && senha.length > 0,
  };

  const senhaValida = Object.values(requisitos).every(Boolean);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!senhaValida) {
      setErro("A senha não atende aos requisitos de segurança.");
      return;
    }

    registrarMutation.mutate({ token, nome, senha });
  };

  if (conviteLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0D1F3C] to-[#0A1628] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00D4FF] animate-spin" />
      </div>
    );
  }

  if (!conviteData?.valido) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0D1F3C] to-[#0A1628] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Convite inválido</h2>
          <p className="text-[#8BA3C7] mb-6">
            Este link de convite expirou ou já foi utilizado. Solicite um novo convite ao administrador.
          </p>
          <Button
            onClick={() => setLocation("/login")}
            className="bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white"
          >
            Ir para o login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0D1F3C] to-[#0A1628] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00D4FF]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#0099CC] flex items-center justify-center shadow-lg shadow-[#00D4FF]/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">EonSure</span>
          </div>
        </div>

        <Card className="bg-[#0D1F3C]/80 border-[#1E3A5F] backdrop-blur-sm shadow-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                Convite válido
              </Badge>
              {conviteData.role && (
                <Badge className="bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/20">
                  {ROLE_LABELS[conviteData.role] ?? conviteData.role}
                </Badge>
              )}
            </div>
            <CardTitle className="text-white text-xl">Criar sua conta</CardTitle>
            <CardDescription className="text-[#8BA3C7]">
              Você foi convidado para a plataforma EonSure.{" "}
              <span className="text-[#00D4FF]">{conviteData.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {erro && (
                <Alert className="bg-red-500/10 border-red-500/30 text-red-400">
                  <AlertDescription>{erro}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="nome" className="text-[#8BA3C7] text-sm">Nome completo</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  minLength={3}
                  className="bg-[#0A1628] border-[#1E3A5F] text-white placeholder:text-[#4A6080] focus:border-[#00D4FF] h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha" className="text-[#8BA3C7] text-sm">Criar senha</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 10 caracteres"
                    required
                    className="bg-[#0A1628] border-[#1E3A5F] text-white placeholder:text-[#4A6080] focus:border-[#00D4FF] h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A6080] hover:text-[#8BA3C7]"
                  >
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Requisitos de senha */}
                {senha.length > 0 && (
                  <ul className="space-y-1 mt-2 pl-1">
                    <RequisitossenhaItem ok={requisitos.tamanho} texto="Mínimo de 10 caracteres" />
                    <RequisitossenhaItem ok={requisitos.maiuscula} texto="Pelo menos 1 letra maiúscula" />
                    <RequisitossenhaItem ok={requisitos.numero} texto="Pelo menos 1 número" />
                    <RequisitossenhaItem ok={requisitos.especial} texto="Pelo menos 1 caractere especial" />
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmar" className="text-[#8BA3C7] text-sm">Confirmar senha</Label>
                <Input
                  id="confirmar"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a senha"
                  required
                  className={`bg-[#0A1628] border-[#1E3A5F] text-white placeholder:text-[#4A6080] focus:border-[#00D4FF] h-11
                    ${confirmarSenha.length > 0 && !requisitos.confirmacao ? "border-red-500/50" : ""}
                    ${confirmarSenha.length > 0 && requisitos.confirmacao ? "border-green-500/50" : ""}`}
                />
              </div>

              <Button
                type="submit"
                disabled={registrarMutation.isPending || !senhaValida || nome.length < 3}
                className="w-full h-11 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] hover:from-[#00B8E0] hover:to-[#0088BB] text-white font-semibold"
              >
                {registrarMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  "Criar conta e configurar 2FA"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
