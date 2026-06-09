/**
 * seed-mega-admin.mjs
 *
 * Cria (ou atualiza) o usuário mega_admin na plataforma EonSure.
 *
 * Uso:
 *   node seed-mega-admin.mjs
 *
 * O script gera um segredo TOTP, exibe o QR Code URL para configurar
 * no app autenticador e persiste o hash da senha no banco.
 *
 * Credenciais padrão:
 *   E-mail:  megaadmin@eonsure.ai
 *   Senha:   EonSure@Admin2024!
 *   Role:    mega_admin
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

const bcrypt = require("bcryptjs");
const { generateSecret, generateURI } = require("otplib");
const mysql2 = require("mysql2/promise");

const EMAIL = "megaadmin@eonsure.ai";
const SENHA = "EonSure@Admin2024!";
const NOME = "Super Admin EonSure";
const ROLE = "mega_admin";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌  DATABASE_URL não definida.");
    process.exit(1);
  }

  const conn = await mysql2.createConnection(dbUrl);
  console.log("✅  Conectado ao banco de dados.");

  // Hash da senha
  const passwordHash = await bcrypt.hash(SENHA, 12);

  // Gerar segredo TOTP
  const totpSecret = generateSecret();
  const otpAuthUrl = generateURI({ secret: totpSecret, account: EMAIL, issuer: "EonSure" });

  // Verificar se já existe
  const [rows] = await conn.execute("SELECT id FROM users WHERE email = ?", [EMAIL]);

  if (rows.length > 0) {
    // Atualizar
    await conn.execute(
      `UPDATE users SET name = ?, role = ?, passwordHash = ?, totpSecret = ?, totpVerificado = FALSE, isActive = TRUE WHERE email = ?`,
      [NOME, ROLE, passwordHash, totpSecret, EMAIL]
    );
    console.log(`🔄  Usuário mega_admin atualizado (id=${rows[0].id}).`);
  } else {
    // Inserir
    await conn.execute(
      `INSERT INTO users (openId, name, email, role, passwordHash, totpSecret, totpVerificado, isActive, loginMethod, tenantId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, FALSE, TRUE, 'proprio', NULL, NOW(), NOW())`,
      [`mega-admin-${Date.now()}`, NOME, EMAIL, ROLE, passwordHash, totpSecret]
    );
    console.log("✅  Usuário mega_admin criado.");
  }

  await conn.end();

  console.log("\n" + "=".repeat(60));
  console.log("  CREDENCIAIS DO MEGA-ADMIN");
  console.log("=".repeat(60));
  console.log(`  E-mail : ${EMAIL}`);
  console.log(`  Senha  : ${SENHA}`);
  console.log(`  Role   : ${ROLE}`);
  console.log("\n  CONFIGURAÇÃO DO 2FA (TOTP):");
  console.log(`  Segredo TOTP : ${totpSecret}`);
  console.log(`  OTP Auth URL : ${otpAuthUrl}`);
  console.log("\n  Para configurar o autenticador:");
  console.log("  1. Abra o Google Authenticator ou Authy");
  console.log("  2. Adicione uma conta manualmente com o segredo acima");
  console.log("  3. OU acesse /login na plataforma — o QR Code será exibido no primeiro login");
  console.log("=".repeat(60) + "\n");
}

main().catch((err) => {
  console.error("❌  Erro no seed:", err.message);
  process.exit(1);
});
