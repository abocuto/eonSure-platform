/**
 * authUtils.ts — Utilitários de autenticação própria EonSure
 *
 * Responsabilidades:
 * - Hash e verificação de senhas com bcrypt (custo 12)
 * - Criptografia/descriptografia de segredos TOTP com AES-256-CBC
 * - Geração de segredos TOTP usando authenticator.generateSecret (Base32 limpo)
 * - Geração e validação de tokens de convite e pending tokens
 */

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateSecret } from "otplib";

const BCRYPT_ROUNDS = 12;

// ─── Chave de criptografia AES-256 ───────────────────────────────────────────
// Usa TOTP_ENCRYPTION_KEY se disponível (deve ter exatamente 32 chars),
// caso contrário deriva 32 bytes do JWT_SECRET via SHA-256.
function getChaveCripto(): Buffer {
  const rawKey = process.env.TOTP_ENCRYPTION_KEY ?? process.env.JWT_SECRET ?? "fallback-key-must-be-replaced-now";
  // Sempre derivar via SHA-256 para garantir exatamente 32 bytes (256 bits)
  return crypto.createHash("sha256").update(rawKey, "utf8").digest();
}

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
 * Valida os requisitos de força de senha.
 */
export function validarForcaSenha(senha: string): { valida: boolean; erros: string[] } {
  const erros: string[] = [];
  if (senha.length < 10) erros.push("Mínimo de 10 caracteres");
  if (!/[A-Z]/.test(senha)) erros.push("Pelo menos 1 letra maiúscula");
  if (!/[0-9]/.test(senha)) erros.push("Pelo menos 1 número");
  if (!/[^A-Za-z0-9]/.test(senha)) erros.push("Pelo menos 1 caractere especial");
  return { valida: erros.length === 0, erros };
}

// ─── Segredo TOTP ─────────────────────────────────────────────────────────────

/**
 * Gera um segredo TOTP Base32 limpo usando o authenticator do otplib.
 * Retorna string Base32 de 32 chars (A-Z, 2-7), sem padding, sem espaços.
 */
export function gerarSegredoTotp(): string {
  // generateSecret(20) retorna Base32 limpo — compatível com
  // Google Authenticator, Authy e qualquer app TOTP padrão RFC 6238
  return generateSecret();
}

// ─── Criptografia TOTP ────────────────────────────────────────────────────────

/**
 * Criptografa o segredo TOTP com AES-256-CBC antes de salvar no banco.
 * Formato de saída: "iv_hex:encrypted_hex"
 */
export function criptografarTotpSecret(segredo: string): string {
  const iv = crypto.randomBytes(16);
  const key = getChaveCripto(); // sempre 32 bytes
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(segredo, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Descriptografa o segredo TOTP armazenado no banco.
 * Aceita formato "iv_hex:encrypted_hex".
 */
export function descriptografarTotpSecret(encriptado: string): string {
  const colonIndex = encriptado.indexOf(":");
  if (colonIndex === -1) {
    // Segredo em texto puro (legado/seed antigo) — retornar como está
    return encriptado;
  }
  const ivHex = encriptado.substring(0, colonIndex);
  const encHex = encriptado.substring(colonIndex + 1);
  const iv = Buffer.from(ivHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const key = getChaveCripto();
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
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
 * Gera um token temporário de "aguardando TOTP" — válido por 15 minutos.
 * Formato: base64url(userId:timestamp:hmac)
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
 * Retorna null se inválido ou expirado (15 minutos).
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
    // Expira em 15 minutos
    const age = Date.now() - parseInt(timestampStr, 10);
    if (age > 15 * 60 * 1000) return null;
    return parseInt(userIdStr, 10);
  } catch {
    return null;
  }
}
