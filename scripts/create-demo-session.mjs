/**
 * Script para criar uma sessão de demonstração da plataforma EonSure.
 * Gera um JWT de sessão válido e insere um usuário admin no banco de dados.
 *
 * Uso: node scripts/create-demo-session.mjs
 */
import { SignJWT } from "jose";
import { createPool } from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const JWT_SECRET = process.env.JWT_SECRET || "eonSure-local-dev-secret-2026";
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não configurada no .env");
  process.exit(1);
}

const DEMO_USER = {
  openId: "demo-admin-eonSure-2026",
  name: "Admin EonSure",
  email: "admin@eonsure.ai",
  role: "admin",
  persona: "c-level",
  tenantId: 1,
};

async function main() {
  // 1. Gerar JWT de sessão
  const secretKey = new TextEncoder().encode(JWT_SECRET);
  const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
  const expirationSeconds = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);

  const token = await new SignJWT({
    openId: DEMO_USER.openId,
    appId: "eonSure-local-dev",
    name: DEMO_USER.name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);

  console.log("\n✅ JWT de sessão gerado com sucesso!");
  console.log("\n📋 Cookie de sessão (app_session_id):");
  console.log(token);

  // 2. Inserir usuário no banco
  try {
    const pool = createPool(DATABASE_URL);
    const conn = await pool.getConnection();

    // Verificar se o usuário já existe
    const [rows] = await conn.execute(
      "SELECT id FROM users WHERE openId = ?",
      [DEMO_USER.openId]
    );

    if (rows.length === 0) {
      await conn.execute(
        `INSERT INTO users (openId, name, email, role, persona, tenantId, createdAt, updatedAt, lastSignedIn)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
        [
          DEMO_USER.openId,
          DEMO_USER.name,
          DEMO_USER.email,
          DEMO_USER.role,
          DEMO_USER.persona,
          DEMO_USER.tenantId,
        ]
      );
      console.log("\n✅ Usuário demo inserido no banco de dados!");
    } else {
      console.log("\nℹ️  Usuário demo já existe no banco de dados.");
    }

    conn.release();
    await pool.end();
  } catch (err) {
    console.warn("\n⚠️  Não foi possível inserir no banco:", err.message);
    console.log("   O cookie ainda pode ser usado se o banco já tiver o usuário.");
  }

  console.log("\n🚀 Para usar na plataforma:");
  console.log("   1. Abra o DevTools do browser (F12)");
  console.log("   2. Vá em Application → Cookies");
  console.log(`   3. Adicione o cookie: app_session_id = <token acima>`);
  console.log("   4. Recarregue a página\n");
}

main().catch(console.error);
