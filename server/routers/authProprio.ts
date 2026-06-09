/**
 * authProprio.ts — Router de autenticação própria EonSure
 *
 * Fluxos implementados:
 * 1. Login com e-mail + senha → pending token (aguarda TOTP)
 * 2. Verificação TOTP → sessão real
 * 3. Aceitar convite → registro + setup TOTP
 * 4. Confirmar TOTP (primeiro acesso)
 * 5. Obter QR Code para setup
 * 6. Logout próprio
 * 7. Verificar validade de convite
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { generateSync, verifySync, generateSecret as totpGenerateSecret } from "otplib";
import QRCode from "qrcode";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "../db";
import { users, sessoes, convites } from "../../drizzle/schema";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  hashSenha,
  verificarSenha,
  criptografarTotpSecret,
  descriptografarTotpSecret,
  gerarIdSessao,
  gerarPendingToken,
  validarPendingToken,
} from "../_core/authUtils";

// Configuração TOTP padrão
const TOTP_OPTS = { algorithm: "SHA1" as const, digits: 6, period: 30 };
// Janela de tolerância: aceita código do período anterior e seguinte
const TOTP_WINDOW = 1;

const DURACAO_SESSAO_HORAS = parseInt(process.env.SESSION_EXPIRY_HOURS ?? "8");
const DURACAO_SESSAO_FIELD_AGENT_HORAS = 12;
const MAX_TENTATIVAS = parseInt(process.env.MAX_LOGIN_ATTEMPTS ?? "5");
const BLOQUEIO_MINUTOS = parseInt(process.env.LOCK_DURATION_MINUTES ?? "15");

// Schema de validação de senha
const senhaSchema = z
  .string()
  .min(10, "Mínimo de 10 caracteres")
  .regex(/[A-Z]/, "Pelo menos 1 letra maiúscula")
  .regex(/[0-9]/, "Pelo menos 1 número")
  .regex(/[^A-Za-z0-9]/, "Pelo menos 1 caractere especial");

/** Verifica código TOTP com tolerância de 1 janela (±30s) */
function verificarCodigo(codigo: string, segredo: string): boolean {
  // verifySync do otplib v13 usa 'window' para tolerância de janelas adjacentes
  // Não usar 'epoch' pois o otplib v13 o ignora quando passado junto com outros parâmetros
  const result = verifySync({
    token: codigo,
    secret: segredo,
    algorithm: TOTP_OPTS.algorithm,
    digits: TOTP_OPTS.digits,
    period: TOTP_OPTS.period,
    window: TOTP_WINDOW,
  } as any) as any;
  if (result && typeof result === "object" && result.valid) return true;
  if (result === true) return true;
  return false;
}

export const authProprioRouter = router({
  /**
   * Etapa 1 do login: valida e-mail + senha, retorna pendingToken para TOTP.
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("E-mail inválido"),
        senha: z.string().min(1, "Senha obrigatória"),
      })
    )
    .mutation(async ({ input }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      const db = dbConn;
      const [usuario] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!usuario || !usuario.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "E-mail ou senha incorretos",
        });
      }

      // Verificar bloqueio por tentativas excessivas
      if (usuario.bloqueadoAte && new Date() < new Date(usuario.bloqueadoAte)) {
        const minutosRestantes = Math.ceil(
          (new Date(usuario.bloqueadoAte).getTime() - Date.now()) / 60000
        );
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Conta bloqueada. Tente novamente em ${minutosRestantes} minuto(s).`,
        });
      }

      if (!usuario.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Conta desativada. Entre em contato com o administrador.",
        });
      }

      const senhaCorreta = await verificarSenha(input.senha, usuario.passwordHash);

      if (!senhaCorreta) {
        const tentativas = (usuario.tentativasLoginFalhadas ?? 0) + 1;
        const bloqueadoAte =
          tentativas >= MAX_TENTATIVAS
            ? new Date(Date.now() + BLOQUEIO_MINUTOS * 60 * 1000)
            : null;

        await db
          .update(users)
          .set({
            tentativasLoginFalhadas: tentativas,
            ...(bloqueadoAte ? { bloqueadoAte } : {}),
          })
          .where(eq(users.id, usuario.id));

        if (tentativas >= MAX_TENTATIVAS) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Conta bloqueada por ${BLOQUEIO_MINUTOS} minutos após ${MAX_TENTATIVAS} tentativas incorretas.`,
          });
        }

        const restantes = MAX_TENTATIVAS - tentativas;
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `E-mail ou senha incorretos. ${restantes} tentativa(s) restante(s).`,
        });
      }

      // Resetar tentativas após login correto
      await db
        .update(users)
        .set({ tentativasLoginFalhadas: 0 })
        .where(eq(users.id, usuario.id));

      // Para trial_user sem TOTP: criar sessão diretamente
      if (usuario.role === "trial_user" && !usuario.totpVerificado) {
        const sessaoId = gerarIdSessao();
        const expiresAt = new Date(Date.now() + DURACAO_SESSAO_HORAS * 3600 * 1000);
        await db.insert(sessoes).values({ id: sessaoId, userId: usuario.id, expiresAt });
        await db
          .update(users)
          .set({ ultimoLoginEm: new Date(), lastSignedIn: new Date() })
          .where(eq(users.id, usuario.id));
        return { tipo: "sessao_criada" as const, sessaoId, userId: usuario.id, role: usuario.role };
      }

      // Sem TOTP configurado → redirecionar para setup
      if (!usuario.totpVerificado || !usuario.totpSecret) {
        const pendingToken = gerarPendingToken(usuario.id);
        return { tipo: "setup_totp_necessario" as const, pendingToken };
      }

      // TOTP configurado → retornar pending token para verificação
      const pendingToken = gerarPendingToken(usuario.id);
      return { tipo: "totp_necessario" as const, pendingToken };
    }),

  /**
   * Etapa 2 do login: valida código TOTP e cria sessão real.
   */
  verificarTotp: publicProcedure
    .input(
      z.object({
        pendingToken: z.string(),
        codigo: z.string().length(6, "Código deve ter 6 dígitos"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = validarPendingToken(input.pendingToken);
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Token expirado ou inválido. Faça login novamente.",
        });
      }

      const dbConn2 = await getDb();
      if (!dbConn2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      const db = dbConn2;
      const [usuario] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!usuario || !usuario.totpSecret) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
      }

      const segredo = usuario.totpSecret.includes(":")
        ? descriptografarTotpSecret(usuario.totpSecret)
        : usuario.totpSecret; // texto puro (seed antigo)
      const valido = verificarCodigo(input.codigo, segredo);

      if (!valido) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Código inválido. Verifique o app autenticador e tente novamente.",
        });
      }

      const sessaoId = gerarIdSessao();
      const duracaoHoras =
        usuario.role === "field_agent"
          ? DURACAO_SESSAO_FIELD_AGENT_HORAS
          : DURACAO_SESSAO_HORAS;
      const expiresAt = new Date(Date.now() + duracaoHoras * 3600 * 1000);
      const ipOrigem =
        (ctx.req as any)?.headers?.["x-forwarded-for"]?.toString() ?? "desconhecido";
      const userAgent = (ctx.req as any)?.headers?.["user-agent"] ?? "";

      await db.insert(sessoes).values({ id: sessaoId, userId: usuario.id, ipOrigem, userAgent, expiresAt });
      await db
        .update(users)
        .set({ ultimoLoginEm: new Date(), lastSignedIn: new Date() })
        .where(eq(users.id, usuario.id));

      return { sessaoId, userId: usuario.id, role: usuario.role };
    }),

  /**
   * Obtém QR Code TOTP para setup no primeiro acesso.
   */
  obterQrCode: publicProcedure
    .input(z.object({ pendingToken: z.string() }))
    .query(async ({ input }) => {
      const userId = validarPendingToken(input.pendingToken);
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Token expirado. Faça login novamente." });
      }

      const dbConn3 = await getDb();
      if (!dbConn3) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      const db = dbConn3;
      const [usuario] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!usuario) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });

      let segredo: string;
      if (usuario.totpSecret && !usuario.totpVerificado) {
        // Detectar se o segredo está em texto puro (sem ':') ou já criptografado
        if (usuario.totpSecret.includes(":")) {
          segredo = descriptografarTotpSecret(usuario.totpSecret);
        } else {
          // Segredo em texto puro (ex: gerado pelo seed) — criptografar e salvar
          segredo = usuario.totpSecret;
          await db
            .update(users)
            .set({ totpSecret: criptografarTotpSecret(segredo) })
            .where(eq(users.id, usuario.id));
        }
      } else {
        segredo = totpGenerateSecret();
        await db
          .update(users)
          .set({ totpSecret: criptografarTotpSecret(segredo) })
          .where(eq(users.id, usuario.id));
      }

      const email = usuario.email ?? `usuario-${usuario.id}@eonsure.ai`;
      // Gerar URI TOTP manualmente (RFC 6238)
      const otpAuthUrl = `otpauth://totp/EonSure:${encodeURIComponent(email)}?secret=${segredo}&issuer=EonSure&algorithm=SHA1&digits=6&period=30`;
      const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

      return { qrCode: qrCodeDataUrl, otpAuthUrl };
    }),

  /**
   * Confirma que o QR Code foi configurado corretamente (primeiro acesso).
   */
  confirmarTotp: publicProcedure
    .input(
      z.object({
        pendingToken: z.string(),
        codigo: z.string().length(6, "Código deve ter 6 dígitos"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = validarPendingToken(input.pendingToken);
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Token expirado. Faça login novamente." });
      }

      const dbConn4 = await getDb();
      if (!dbConn4) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      const db = dbConn4;
      const [usuario] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!usuario || !usuario.totpSecret) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
      }

      const segredo = usuario.totpSecret.includes(":")
        ? descriptografarTotpSecret(usuario.totpSecret)
        : usuario.totpSecret; // texto puro (seed antigo)
      const valido = verificarCodigo(input.codigo, segredo);

      if (!valido) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Código inválido. Escaneie o QR Code novamente e tente.",
        });
      }

      await db
        .update(users)
        .set({ totpVerificado: true, totpAtivoEm: new Date() })
        .where(eq(users.id, usuario.id));

      const sessaoId = gerarIdSessao();
      const expiresAt = new Date(Date.now() + DURACAO_SESSAO_HORAS * 3600 * 1000);
      const ipOrigem = (ctx.req as any)?.headers?.["x-forwarded-for"]?.toString() ?? "desconhecido";
      const userAgent = (ctx.req as any)?.headers?.["user-agent"] ?? "";

      await db.insert(sessoes).values({ id: sessaoId, userId: usuario.id, ipOrigem, userAgent, expiresAt });
      await db
        .update(users)
        .set({ ultimoLoginEm: new Date(), lastSignedIn: new Date() })
        .where(eq(users.id, usuario.id));

      return { sessaoId, userId: usuario.id, role: usuario.role };
    }),

  /**
   * Aceitar convite: valida token, cria conta, gera segredo TOTP.
   */
  registar: publicProcedure
    .input(
      z.object({
        token: z.string(),
        nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
        senha: senhaSchema,
      })
    )
    .mutation(async ({ input }) => {
      const dbConn5 = await getDb();
      if (!dbConn5) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
      const db = dbConn5;
      const agora = new Date();

      const [convite] = await db
        .select()
        .from(convites)
        .where(and(eq(convites.token, input.token), gt(convites.expiraEm, agora)))
        .limit(1);

      if (!convite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Convite inválido ou expirado." });
      }
      if (convite.usadoEm) {
        throw new TRPCError({ code: "CONFLICT", message: "Este convite já foi utilizado." });
      }

      const [existente] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, convite.email))
        .limit(1);

      if (existente) {
        throw new TRPCError({ code: "CONFLICT", message: "Este e-mail já possui uma conta." });
      }

      const passwordHash = await hashSenha(input.senha);
      const totpSegredo = totpGenerateSecret();
      const totpSecretEncriptado = criptografarTotpSecret(totpSegredo);
      const openId = `tenant-${convite.tenantId}-${Date.now()}`;

      await db.insert(users).values({
        openId,
        name: input.nome,
        email: convite.email,
        loginMethod: "proprio",
        role: convite.role,
        tenantId: convite.tenantId,
        passwordHash,
        totpSecret: totpSecretEncriptado,
        totpVerificado: false,
        convidadoPor: convite.convidadoPorId,
        convidadoEm: new Date(),
        isActive: true,
      });

      await db.update(convites).set({ usadoEm: new Date() }).where(eq(convites.id, convite.id));

      const [novoUsuario] = await db
        .select()
        .from(users)
        .where(eq(users.email, convite.email))
        .limit(1);

      const pendingToken = gerarPendingToken(novoUsuario.id);
      return { pendingToken, email: convite.email, nome: input.nome };
    }),

  /**
   * Logout: invalida a sessão atual.
   */
  logoutProprio: protectedProcedure.mutation(async ({ ctx }) => {
    const authHeader = ctx.req.headers["authorization"];
    if (authHeader?.startsWith("Bearer ")) {
      const sessaoId = authHeader.slice(7);
      const dbConn6 = await getDb();
      if (dbConn6) await dbConn6.delete(sessoes).where(eq(sessoes.id, sessaoId));
    }
    return { ok: true };
  }),

  /**
   * Verifica se um token de convite é válido (sem consumir).
   */
  verificarConvite: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const dbConn7 = await getDb();
      if (!dbConn7) return { valido: false, email: null, role: null };
      const db = dbConn7;
      const [convite] = await db
        .select()
        .from(convites)
        .where(and(eq(convites.token, input.token), gt(convites.expiraEm, new Date())))
        .limit(1);

      if (!convite || convite.usadoEm) {
        return { valido: false, email: null, role: null };
      }
      return { valido: true, email: convite.email, role: convite.role };
    }),
});
