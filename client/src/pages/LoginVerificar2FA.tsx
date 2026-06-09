/**
 * LoginVerificar2FA.tsx — Verificação TOTP (etapa 2 do login)
 *
 * Requer pendingToken no sessionStorage (definido pela página de login).
 * Após verificação bem-sucedida, salva sessaoId no localStorage e redireciona.
 */

import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Loader2, ArrowLeft, Smartphone } from "lucide-react";
import { toast } from "sonner";

export default function LoginVerificar2FA() {
  const [, setLocation] = useLocation();
  const [codigo, setCodigo] = useState(["", "", "", "", "", ""]);
  const [erro, setErro] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const pendingToken = sessionStorage.getItem("eon_pending_token");

  useEffect(() => {
    if (!pendingToken) {
      setLocation("/login");
    }
    // Focar no primeiro input
    inputRefs.current[0]?.focus();
  }, [pendingToken, setLocation]);

  const verificarMutation = trpc.authProprio.verificarTotp.useMutation({
    onSuccess: (data) => {
      sessionStorage.removeItem("eon_pending_token");
      localStorage.setItem("eon_auth_token", data.sessaoId);
      toast.success("Autenticação concluída!");

      // Redirecionar por role
      if (data.role === "mega_admin" || data.role === "mega-admin") {
        setLocation("/mega-admin");
      } else {
        setLocation("/dashboard");
      }
    },
    onError: (error) => {
      setErro(error.message);
      // Limpar campos em caso de erro
      setCodigo(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    },
  });

  const handleInput = (index: number, value: string) => {
    // Aceitar apenas dígitos
    const digit = value.replace(/\D/g, "").slice(-1);
    const novoCodigo = [...codigo];
    novoCodigo[index] = digit;
    setCodigo(novoCodigo);

    // Avançar para o próximo campo
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submeter quando todos os 6 dígitos estiverem preenchidos
    if (novoCodigo.every((d) => d !== "") && novoCodigo.join("").length === 6) {
      handleVerificar(novoCodigo.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !codigo[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const novoCodigo = pasted.split("");
      setCodigo(novoCodigo);
      handleVerificar(pasted);
    }
  };

  const handleVerificar = (codigoStr?: string) => {
    const codigoFinal = codigoStr ?? codigo.join("");
    if (codigoFinal.length !== 6 || !pendingToken) return;
    setErro(null);
    verificarMutation.mutate({ pendingToken, codigo: codigoFinal });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0D1F3C] to-[#0A1628] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00D4FF]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00D4FF]/3 rounded-full blur-3xl" />
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
          <CardHeader className="pb-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#00D4FF]/10 flex items-center justify-center mb-3">
              <Smartphone className="w-6 h-6 text-[#00D4FF]" />
            </div>
            <CardTitle className="text-white text-xl">Verificação em 2 etapas</CardTitle>
            <CardDescription className="text-[#8BA3C7]">
              Abra o app autenticador e insira o código de 6 dígitos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {erro && (
              <Alert className="bg-red-500/10 border-red-500/30 text-red-400">
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}

            {/* Inputs de 6 dígitos */}
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {codigo.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInput(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-12 h-14 text-center text-xl font-bold rounded-lg border-2 bg-[#0A1628] text-white transition-all duration-150 outline-none
                    ${digit ? "border-[#00D4FF] shadow-sm shadow-[#00D4FF]/20" : "border-[#1E3A5F]"}
                    focus:border-[#00D4FF] focus:shadow-sm focus:shadow-[#00D4FF]/20`}
                />
              ))}
            </div>

            <Button
              onClick={() => handleVerificar()}
              disabled={verificarMutation.isPending || codigo.some((d) => !d)}
              className="w-full h-11 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] hover:from-[#00B8E0] hover:to-[#0088BB] text-white font-semibold shadow-lg shadow-[#00D4FF]/20 transition-all duration-200 active:scale-[0.98]"
            >
              {verificarMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Verificar código"
              )}
            </Button>

            <button
              onClick={() => setLocation("/login")}
              className="flex items-center gap-2 text-sm text-[#4A6080] hover:text-[#8BA3C7] transition-colors mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[#4A6080] mt-6">
          O código expira a cada 30 segundos. Use Google Authenticator, Authy ou similar.
        </p>
      </div>
    </div>
  );
}
