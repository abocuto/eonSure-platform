/**
 * debug-totp-fix.mjs — Diagnóstico e correção do segredo TOTP do mega_admin
 */
import mysql from "mysql2/promise";
import crypto from "crypto";
import { generateSync } from "otplib";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL não definida");

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-32-chars-minimum!";
const KEY = crypto.createHash("sha256").update(JWT_SECRET).digest();

function descriptografar(encrypted) {
  if (!encrypted || !encrypted.includes(":")) return encrypted; // texto puro
  const [ivHex, encHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
  return decipher.update(enc, undefined, "utf8") + decipher.final("utf8");
}

function criptografar(secret) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);
  const encrypted = cipher.update(secret, "utf8", "hex") + cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

const conn = await mysql.createConnection(DATABASE_URL);

// Buscar mega_admin
const [rows] = await conn.execute(
  "SELECT id, email, role, totpSecret, totpVerificado FROM users WHERE email = 'megaadmin@eonsure.ai' LIMIT 1"
);

if (rows.length === 0) {
  console.log("Mega admin não encontrado!");
  await conn.end();
  process.exit(1);
}

const user = rows[0];
console.log("=== ESTADO ATUAL ===");
console.log("ID:", user.id);
console.log("Email:", user.email);
console.log("Role:", user.role);
console.log("totpSecret (raw):", user.totpSecret);
console.log("totpVerificado:", user.totpVerificado);

if (user.totpSecret) {
  const segredo = descriptografar(user.totpSecret);
  console.log("\n=== SEGREDO DESCRIPTOGRAFADO ===");
  console.log("Segredo:", segredo);
  console.log("Length:", segredo.length);

  // Gerar token atual
  const tokenAtual = generateSync({ secret: segredo, algorithm: "SHA1", digits: 6, period: 30 });
  console.log("Token TOTP atual:", tokenAtual);
  console.log("Tempo restante (s):", 30 - (Math.floor(Date.now() / 1000) % 30));
}

// Resetar para o segredo original do seed e marcar como não verificado
const SEGREDO_ORIGINAL = "N5LZF3DNNC4IRH6XOBPCAYDIVOMWIRRG";
const segredoCriptografado = criptografar(SEGREDO_ORIGINAL);

console.log("\n=== CORRIGINDO PARA SEGREDO ORIGINAL DO SEED ===");
console.log("Segredo original:", SEGREDO_ORIGINAL);
console.log("Segredo criptografado:", segredoCriptografado);

await conn.execute(
  "UPDATE users SET totpSecret = ?, totpVerificado = 0 WHERE email = 'megaadmin@eonsure.ai'",
  [segredoCriptografado]
);

// Verificar token com segredo original
const tokenVerificacao = generateSync({ secret: SEGREDO_ORIGINAL, algorithm: "SHA1", digits: 6, period: 30 });
console.log("\nToken TOTP com segredo original:", tokenVerificacao);
console.log("Tempo restante (s):", 30 - (Math.floor(Date.now() / 1000) % 30));
console.log("\n✅ Segredo restaurado para o original do seed. Configure o app autenticador com:");
console.log("   Segredo manual: N5LZF3DNNC4IRH6XOBPCAYDIVOMWIRRG");
console.log("   Ou escaneie o QR Code novamente após fazer login.");

await conn.end();
