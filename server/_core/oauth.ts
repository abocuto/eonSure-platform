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

export function registerOAuthRoutes(app: Express) {
  // Demo login route — only available in development mode
  app.get("/api/demo-login", async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === "production") {
      res.status(403).json({ error: "Demo login not available in production" });
      return;
    }
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
      res.redirect(302, "/dashboard");
    } catch (error) {
      console.error("[Demo Login] Failed", error);
      res.status(500).json({ error: "Demo login failed", details: String(error) });
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
