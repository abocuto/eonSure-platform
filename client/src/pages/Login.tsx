/**
 * Login.tsx — Página de login próprio EonSure
 *
 * Fluxo:
 * 1. Usuário insere e-mail + senha
 * 2. Se TOTP configurado → redireciona para /login/verificar-2fa
 * 3. Se TOTP não configurado → redireciona para /setup-2fa
 * 4. Se trial_user sem TOTP → sessão criada diretamente
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const loginMutation = trpc.authProprio.login.useMutation({
    onSuccess: (data) => {
      if (data.tipo === "sessao_criada") {
        // trial_user sem TOTP — salvar sessão e redirecionar
        localStorage.setItem("eon_auth_token", data.sessaoId);
        toast.success("Login realizado com sucesso!");
        setLocation("/dashboard");
      } else if (data.tipo === "setup_totp_necessario") {
        // Primeiro acesso — configurar TOTP
        sessionStorage.setItem("eon_pending_token", data.pendingToken);
        setLocation("/setup-2fa");
      } else if (data.tipo === "totp_necessario") {
        // TOTP já configurado — verificar código
        sessionStorage.setItem("eon_pending_token", data.pendingToken);
        setLocation("/login/verificar-2fa");
      }
    },
    onError: (error) => {
      setErro(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    loginMutation.mutate({ email, senha });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0D1F3C] to-[#0A1628] flex items-center justify-center p-4">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00D4FF]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00D4FF]/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo EonSure */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#0099CC] flex items-center justify-center shadow-lg shadow-[#00D4FF]/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">EonSure</span>
          </div>
          <p className="text-[#8BA3C7] text-sm">InsurTech Platform — Acesso Seguro</p>
        </div>

        <Card className="bg-[#0D1F3C]/80 border-[#1E3A5F] backdrop-blur-sm shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl">Entrar na plataforma</CardTitle>
            <CardDescription className="text-[#8BA3C7]">
              Use suas credenciais corporativas para acessar
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
                <Label htmlFor="email" className="text-[#8BA3C7] text-sm">
                  E-mail corporativo
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@empresa.com.br"
                  required
                  autoComplete="email"
                  className="bg-[#0A1628] border-[#1E3A5F] text-white placeholder:text-[#4A6080] focus:border-[#00D4FF] focus:ring-[#00D4FF]/20 h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha" className="text-[#8BA3C7] text-sm">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••••"
                    required
                    autoComplete="current-password"
                    className="bg-[#0A1628] border-[#1E3A5F] text-white placeholder:text-[#4A6080] focus:border-[#00D4FF] focus:ring-[#00D4FF]/20 h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A6080] hover:text-[#8BA3C7] transition-colors"
                  >
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full h-11 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] hover:from-[#00B8E0] hover:to-[#0088BB] text-white font-semibold shadow-lg shadow-[#00D4FF]/20 transition-all duration-200 active:scale-[0.98]"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            {/* Separador para acesso demo */}
            <div className="mt-6 pt-6 border-t border-[#1E3A5F]">
              <p className="text-center text-xs text-[#4A6080] mb-3">Acesso de demonstração</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "C-Level", persona: "c-level" },
                  { label: "Gerente", persona: "gerente-sinistros" },
                  { label: "Analista", persona: "analista-fraude" },
                  { label: "CIO", persona: "cio" },
                  { label: "Perito", persona: "perito" },
                  { label: "Mega-Admin", persona: null },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      const url = item.persona
                        ? `/api/demo-login?persona=${item.persona}`
                        : `/api/mega-admin-login?secret=EonSure@MegaAdmin2024!`;
                      window.location.href = url;
                    }}
                    className="text-xs py-1.5 px-3 rounded-lg bg-[#0A1628] border border-[#1E3A5F] text-[#8BA3C7] hover:border-[#00D4FF]/50 hover:text-[#00D4FF] transition-all duration-150"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[#4A6080] mt-6">
          EonSure © {new Date().getFullYear()} — Plataforma InsurTech com IA
        </p>
      </div>
    </div>
  );
}
