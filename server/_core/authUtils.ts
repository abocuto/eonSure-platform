/**
 * authUtils.ts — Utilitários de autenticação própria EonSure
 *
 * Responsabilidades:
 * - Hash e verificação de senhas com bcrypt (custo 12)
 * - Criptografia/descriptografia de segredos TOTP com AES-256
 * - Geração e validação de tokens de convite
 * - Validação de força de senha
 */

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ENV } from "./env";

const BCRYPT_ROUNDS = 12;

// ─── Senhas ───────────────────────────────────────────────────────────────────

/**
 * Gera o hash bcrypt de uma senha.
 */
export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, BCRYPT_ROUNDS);
}

/**
 * Verifica se uma senha corresponde ao hash armazenado.
 */
export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

/**
 * Valida os requisitos de força de senha:
 * - Mínimo 10 caracteres
 * - Pelo menos 1 letra maiúscula
 * - Pelo menos 1 número
 * - Pelo menos 1 caractere especial
 */
export function validarForcaSenha(senha: string): { valida: boolean; erros: string[] } {
  const erros: string[] = [];
  if (senha.length < 10) erros.push("Mínimo de 10 caracteres");
  if (!/[A-Z]/.test(senha)) erros.push("Pelo menos 1 letra maiúscula");
  if (!/[0-9]/.test(senha)) erros.push("Pelo menos 1 número");
  if (!/[^A-Za-z0-9]/.test(senha)) erros.push("Pelo menos 1 caractere especial");
  return { valida: erros.length === 0, erros };
}

// ─── Criptografia TOTP ────────────────────────────────────────────────────────

/**
 * Chave de criptografia derivada do JWT_SECRET (32 bytes para AES-256).
 * Decisão arquitetural: usa JWT_SECRET como base para não exigir nova ENV
 * em ambientes existentes. Em produção, TOTP_ENCRYPTION_KEY deve ser definida.
 */
function getChaveCripto(): Buffer {
  const chave = process.env.TOTP_ENCRYPTION_KEY ?? ENV.cookieSecret;
  return crypto.createHash("sha256").update(chave).digest();
}

/**
 * Criptografa o segredo TOTP com AES-256-CBC antes de salvar no banco.
 */
export function criptografarTotpSecret(segredo: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", getChaveCripto(), iv);
  const encrypted = Buffer.concat([cipher.update(segredo, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Descriptografa o segredo TOTP armazenado no banco.
 */
export function descriptografarTotpSecret(encriptado: string): string {
  const [ivHex, encHex] = encriptado.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", getChaveCripto(), iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

// ─── Tokens de Convite ────────────────────────────────────────────────────────

/**
 * Gera um token de convite seguro (64 bytes hex = 128 chars).
 */
export function gerarTokenConvite(): string {
  return crypto.randomBytes(64).toString("hex");
}

/**
 * Gera um ID de sessão único.
 */
export function gerarIdSessao(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ─── Pending Token (aguarda TOTP) ─────────────────────────────────────────────

/**
 * Gera um token temporário de "aguardando TOTP" — válido por 5 minutos.
 * Formato: base64(userId:timestamp:hmac)
 */
export function gerarPendingToken(userId: number): string {
  const payload = `${userId}:${Date.now()}`;
  const hmac = crypto
    .createHmac("sha256", getChaveCripto())
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}:${hmac}`).toString("base64url");
}

/**
 * Valida e extrai o userId de um pending token.
 * Retorna null se inválido ou expirado (5 minutos).
 */
export function validarPendingToken(token: string): number | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;
    const [userIdStr, timestampStr, hmac] = parts;
    const payload = `${userIdStr}:${timestampStr}`;
    const expectedHmac = crypto
      .createHmac("sha256", getChaveCripto())
      .update(payload)
      .digest("hex");
    if (hmac !== expectedHmac) return null;
    // Expira em 5 minutos
    const age = Date.now() - parseInt(timestampStr, 10);
    if (age > 5 * 60 * 1000) return null;
    return parseInt(userIdStr, 10);
  } catch {
    return null;
  }
}
