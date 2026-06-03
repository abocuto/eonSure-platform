import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

// Demo personas for local development
const DEMO_PERSONAS = [
  { openId: "demo-c-level", name: "Ana Rodrigues (C-Level)", email: "ana@eonsure.ai", role: "admin" as const, persona: "c-level" as const },
  { openId: "demo-gerente", name: "Carlos Mendes (Gerente)", email: "carlos@eonsure.ai", role: "user" as const, persona: "gerente-sinistros" as const },
  { openId: "demo-analista", name: "Beatriz Lima (Analista Fraude)", email: "beatriz@eonsure.ai", role: "user" as const, persona: "analista-fraude" as const },
  { openId: "demo-cio", name: "Rafael Costa (CIO)", email: "rafael@eonsure.ai", role: "user" as const, persona: "cio" as const },
  { openId: "demo-perito", name: "Mariana Silva (Perito)", email: "mariana@eonsure.ai", role: "user" as const, persona: "perito" as const },
];

// Mega-admin credentials (demo access — not for production)
const MEGA_ADMIN_OPENID = "mega-admin-root";
const MEGA_ADMIN_SECRET = "EonSure@MegaAdmin2024!"; // checked against query param
const MEGA_ADMIN_USER = {
  openId: MEGA_ADMIN_OPENID,
  name: "Super Admin EonSure",
  email: "megaadmin@eonsure.ai",
  role: "mega-admin" as const,
  persona: "c-level" as const,
};

export function registerOAuthRoutes(app: Express) {
  // Demo login route — available in all environments for this demo platform
  app.get("/api/demo-login", async (req: Request, res: Response) => {
    const persona = getQueryParam(req, "persona") ?? "c-level";
    const demoUser = DEMO_PERSONAS.find((p) => p.persona === persona) ?? DEMO_PERSONAS[0];
    try {
      await db.upsertUser({
        openId: demoUser.openId,
        name: demoUser.name,
        email: demoUser.email,
        loginMethod: "demo",
        persona: demoUser.persona,
        role: demoUser.role,
        tenantId: 1,
        lastSignedIn: new Date(),
      });
      const sessionToken = await sdk.createSessionToken(demoUser.openId, {
        name: demoUser.name,
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      // If request accepts JSON (API call), return token in body for Authorization header use
      if (req.headers.accept?.includes("application/json")) {
        res.json({ token: sessionToken, user: demoUser });
        return;
      }
      // For browser navigation: inject token into localStorage before redirecting
      // This ensures the Authorization header fallback is set even if cookies are blocked
      const redirectTo = "/dashboard";
      res.send(`<!DOCTYPE html><html><head><title>Entrando...</title></head><body>
        <script>
          try { localStorage.setItem('eon_auth_token', ${JSON.stringify(sessionToken)}); } catch(e) {}
          window.location.replace(${JSON.stringify(redirectTo)});
        </script>
        <noscript><meta http-equiv="refresh" content="0;url=${redirectTo}"></noscript>
      </body></html>`);
    } catch (error) {
      console.error("[Demo Login] Failed", error);
      res.status(500).json({ error: "Demo login failed", details: String(error) });
    }
  });

  // Mega-admin login — secret-key protected, available in all environments
  // Best practice: uses a dedicated endpoint separated from demo/oauth flows
  app.get("/api/mega-admin-login", async (req: Request, res: Response) => {
    const secret = getQueryParam(req, "secret");
    if (secret !== MEGA_ADMIN_SECRET) {
      // Best practice: uniform error response — don't reveal if secret is wrong vs user not found
      res.status(401).json({ error: "Credenciais inválidas." });
      return;
    }
    try {
      await db.upsertUser({
        openId: MEGA_ADMIN_USER.openId,
        name: MEGA_ADMIN_USER.name,
        email: MEGA_ADMIN_USER.email,
        loginMethod: "mega-admin",
        persona: MEGA_ADMIN_USER.persona,
        role: MEGA_ADMIN_USER.role,
        lastSignedIn: new Date(),
      });
      const sessionToken = await sdk.createSessionToken(MEGA_ADMIN_USER.openId, {
        name: MEGA_ADMIN_USER.name,
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      if (req.headers.accept?.includes("application/json")) {
        res.json({ token: sessionToken, user: MEGA_ADMIN_USER });
        return;
      }
      // For browser navigation: inject token into localStorage before redirecting
      const redirectTo = "/mega-admin";
      res.send(`<!DOCTYPE html><html><head><title>Entrando...</title></head><body>
        <script>
          try { localStorage.setItem('eon_auth_token', ${JSON.stringify(sessionToken)}); } catch(e) {}
          window.location.replace(${JSON.stringify(redirectTo)});
        </script>
        <noscript><meta http-equiv="refresh" content="0;url=${redirectTo}"></noscript>
      </body></html>`);
    } catch (error) {
      console.error("[Mega-Admin Login] Failed", error);
      res.status(500).json({ error: "Login falhou.", details: String(error) });
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
