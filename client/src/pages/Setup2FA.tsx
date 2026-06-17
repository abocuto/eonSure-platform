/**
 * Setup2FA.tsx — Configuração do 2FA TOTP
 *
 * Suporta dois modos:
 * 1. Via pendingToken (sessionStorage) — fluxo normal pós-login
 * 2. Via sessão autenticada — para usuários já logados sem 2FA configurado
 */

import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shield, Loader2, ArrowLeft, CheckCircle2, Copy, Smartphone } from "lucide-react";
import { toast } from "sonner";

export default function Setup2FA() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [etapa, setEtapa] = useState<"qr" | "confirmar">("qr");
  const [codigo, setCodigo] = useState(["", "", "", "", "", ""]);
  const [erro, setErro] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const pendingToken = sessionStorage.getItem("eon_pending_token");
  // Modo autenticado: usuário já tem sessão mas ainda não configurou 2FA
  const modoAutenticado = !pendingToken && !!user;

  useEffect(() => {
    // Só redirecionar se auth carregou e não há nem pendingToken nem sessão
    if (!authLoading && !pendingToken && !user) {
      setLocation("/login");
    }
  }, [authLoading, pendingToken, user, setLocation]);

  // Modo 1: via pendingToken
  const { data: qrDataToken, isLoading: qrLoadingToken } = trpc.authProprio.obterQrCode.useQuery(
    { pendingToken: pendingToken ?? "" },
    { enabled: !!pendingToken, retry: false, staleTime: Infinity }
  );

  // Modo 2: via sessão autenticada
  const { data: qrDataAuth, isLoading: qrLoadingAuth } = trpc.authProprio.obterQrCodeAutenticado.useQuery(
    undefined,
    { enabled: modoAutenticado, retry: false, staleTime: Infinity }
  );

  const qrData = pendingToken ? qrDataToken : qrDataAuth;
  const qrLoading = pendingToken ? qrLoadingToken : qrLoadingAuth;

  // Mutação modo 1: via pendingToken
  const confirmarMutation = trpc.authProprio.confirmarTotp.useMutation({
    onSuccess: (data) => {
      sessionStorage.removeItem("eon_pending_token");
      localStorage.setItem("eon_auth_token", data.sessaoId);
      toast.success("2FA configurado com sucesso! Bem-vindo à EonSure.");
      if (data.role === "mega_admin" || data.role === "mega-admin") {
        setLocation("/mega-admin");
      } else {
        setLocation("/dashboard");
      }
    },
    onError: (error) => {
      setErro(error.message);
      setCodigo(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    },
  });

  // Mutação modo 2: via sessão autenticada
  const confirmarAuthMutation = trpc.authProprio.confirmarTotpAutenticado.useMutation({
    onSuccess: () => {
      toast.success("2FA configurado com sucesso!");
      if (user?.role === "mega_admin" || user?.role === "mega-admin") {
        setLocation("/mega-admin");
      } else {
        setLocation("/dashboard");
      }
    },
    onError: (error) => {
      setErro(error.message);
      setCodigo(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    },
  });

  const handleInput = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const novoCodigo = [...codigo];
    novoCodigo[index] = digit;
    setCodigo(novoCodigo);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (novoCodigo.every((d) => d !== "") && novoCodigo.join("").length === 6) {
      handleConfirmar(novoCodigo.join(""));
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
      setCodigo(pasted.split(""));
      handleConfirmar(pasted);
    }
  };

  const handleConfirmar = (codigoStr?: string) => {
    const codigoFinal = codigoStr ?? codigo.join("");
    if (codigoFinal.length !== 6) return;
    setErro(null);
    if (pendingToken) {
      confirmarMutation.mutate({ pendingToken, codigo: codigoFinal });
    } else {
      confirmarAuthMutation.mutate({ codigo: codigoFinal });
    }
  };

  const isPending = confirmarMutation.isPending || confirmarAuthMutation.isPending;

  const copiarOtpUrl = () => {
    if (qrData?.otpAuthUrl) {
      navigator.clipboard.writeText(qrData.otpAuthUrl);
      toast.success("URL copiada para a área de transferência");
    }
  };

  // Mostrar loading enquanto auth verifica
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0D1F3C] to-[#0A1628] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00D4FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0D1F3C] to-[#0A1628] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00D4FF]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00D4FF]/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#0099CC] flex items-center justify-center shadow-lg shadow-[#00D4FF]/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">EonSure</span>
          </div>
        </div>

        {/* Indicador de etapas */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`flex items-center gap-2 text-sm ${etapa === "qr" ? "text-[#00D4FF]" : "text-[#4A6080]"}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${etapa === "qr" ? "bg-[#00D4FF] text-white" : "bg-[#1E3A5F] text-[#4A6080]"}`}>
              {etapa === "confirmar" ? <CheckCircle2 className="w-4 h-4" /> : "1"}
            </div>
            Escanear QR Code
          </div>
          <div className="w-8 h-px bg-[#1E3A5F]" />
          <div className={`flex items-center gap-2 text-sm ${etapa === "confirmar" ? "text-[#00D4FF]" : "text-[#4A6080]"}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${etapa === "confirmar" ? "bg-[#00D4FF] text-white" : "bg-[#1E3A5F] text-[#4A6080]"}`}>
              2
            </div>
            Confirmar código
          </div>
        </div>

        <Card className="bg-[#0D1F3C]/80 border-[#1E3A5F] backdrop-blur-sm shadow-2xl">
          {etapa === "qr" ? (
            <>
              <CardHeader className="pb-4 text-center">
                <Badge className="mx-auto mb-2 bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/20 w-fit">
                  Configuração obrigatória
                </Badge>
                <CardTitle className="text-white text-xl">Configure o autenticador</CardTitle>
                <CardDescription className="text-[#8BA3C7]">
                  Escaneie o QR Code com Google Authenticator, Authy ou Microsoft Authenticator
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* QR Code */}
                <div className="flex justify-center">
                  {qrLoading ? (
                    <div className="w-48 h-48 bg-[#0A1628] rounded-xl flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-[#00D4FF] animate-spin" />
                    </div>
                  ) : qrData?.qrCode ? (
                    <div className="p-3 bg-white rounded-xl shadow-lg">
                      <img src={qrData.qrCode} alt="QR Code 2FA" className="w-44 h-44" />
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-[#0A1628] rounded-xl flex items-center justify-center text-[#4A6080] text-sm text-center p-4">
                      Erro ao gerar QR Code. Tente novamente.
                    </div>
                  )}
                </div>

                {/* Instruções */}
                <div className="bg-[#0A1628] rounded-lg p-4 space-y-2">
                  <p className="text-xs text-[#8BA3C7] font-medium">Como configurar:</p>
                  <ol className="text-xs text-[#4A6080] space-y-1 list-decimal list-inside">
                    <li>Instale o Google Authenticator ou Authy no seu celular</li>
                    <li>Toque em "+" para adicionar uma conta</li>
                    <li>Escolha "Escanear QR Code"</li>
                    <li>Aponte a câmera para o código acima</li>
                  </ol>
                </div>

                {/* Segredo manual */}
                {qrData?.segredo && (
                  <div className="bg-[#0A1628] rounded-lg p-3 border border-[#1E3A5F]">
                    <p className="text-xs text-[#8BA3C7] font-medium mb-2 text-center">Ou insira o código manualmente:</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-[#00D4FF] text-sm font-mono tracking-widest">
                        {(qrData.segredo.match(/.{1,4}/g) ?? []).join(' ')}
                      </code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(qrData.segredo!); toast.success("Segredo copiado!"); }}
                        className="text-[#4A6080] hover:text-[#8BA3C7] transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-[#4A6080] text-center mt-1">Tipo: TOTP • SHA1 • 6 dígitos • 30s</p>
                  </div>
                )}

                <Button
                  onClick={() => setEtapa("confirmar")}
                  disabled={!qrData?.qrCode}
                  className="w-full h-11 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] hover:from-[#00B8E0] hover:to-[#0088BB] text-white font-semibold"
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Já escaneei — Continuar
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="pb-4 text-center">
                <CardTitle className="text-white text-xl">Confirmar configuração</CardTitle>
                <CardDescription className="text-[#8BA3C7]">
                  Insira o código de 6 dígitos gerado pelo app autenticador
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {erro && (
                  <Alert className="bg-red-500/10 border-red-500/30 text-red-400">
                    <AlertDescription>{erro}</AlertDescription>
                  </Alert>
                )}

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
                  onClick={() => handleConfirmar()}
                  disabled={isPending || codigo.some((d) => !d)}
                  className="w-full h-11 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] hover:from-[#00B8E0] hover:to-[#0088BB] text-white font-semibold"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirmar e entrar
                    </>
                  )}
                </Button>

                <button
                  onClick={() => setEtapa("qr")}
                  className="flex items-center gap-2 text-sm text-[#4A6080] hover:text-[#8BA3C7] transition-colors mx-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao QR Code
                </button>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-[#4A6080] mt-6">
          O 2FA é obrigatório para todos os usuários da plataforma EonSure.
        </p>
      </div>
    </div>
  );
}
