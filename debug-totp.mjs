import { createRequire } from "module";
const require = createRequire(import.meta.url);
const crypto = require("crypto");
const { verifySync, generateSync } = require("otplib");

const JWT_SECRET = process.env.JWT_SECRET ?? "";
const COOKIE_SECRET = process.env.COOKIE_SECRET ?? "";

console.log("JWT_SECRET length:", JWT_SECRET.length);
console.log("COOKIE_SECRET length:", COOKIE_SECRET.length);

// Tentar com JWT_SECRET
function testarChave(label, chaveStr) {
  try {
    const chave = crypto.createHash("sha256").update(chaveStr).digest();
    const encriptado = "38030a26cd126f86760e6be41d083451:ee53adf89218eb22e149361c2f1f8bf5414935182ec090b21b7243a37ac7c88f82401f6d5f8cfdd75583dcbbd37e9a72";
    const [ivHex, encHex] = encriptado.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const enc = Buffer.from(encHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", chave, iv);
    const segredo = Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
    console.log(`[${label}] Segredo descriptografado: ${segredo}`);

    const token = generateSync({ secret: segredo, algorithm: "SHA1", digits: 6, period: 30 });
    console.log(`[${label}] Token atual: ${token}`);

    const result = verifySync({ token, secret: segredo, algorithm: "SHA1", digits: 6, period: 30, window: 1 });
    console.log(`[${label}] Verificação:`, result);
  } catch (e) {
    console.log(`[${label}] ERRO: ${e.message}`);
  }
}

testarChave("JWT_SECRET", JWT_SECRET);
if (COOKIE_SECRET) testarChave("COOKIE_SECRET", COOKIE_SECRET);

// Verificar o ENV.cookieSecret via env.ts
const envKeys = Object.keys(process.env).filter(k => k.includes("SECRET") || k.includes("JWT") || k.includes("COOKIE"));
console.log("\nVariáveis de ambiente relevantes:", envKeys);
