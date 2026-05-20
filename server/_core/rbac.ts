/**
 * RBAC — Role-Based Access Control
 * Centralizes persona-based permission checks for tRPC procedures.
 */

import { TRPCError } from "@trpc/server";
import type { User } from "../../drizzle/schema";

export type Persona = "c-level" | "gerente-sinistros" | "analista-fraude" | "cio" | "perito";

// ─── Permission Matrix ────────────────────────────────────────────────────────
// Defines which personas can perform each action category.
export const PERMISSIONS = {
  // Claims
  "claims:read":    ["c-level", "gerente-sinistros", "analista-fraude", "cio", "perito"],
  "claims:create":  ["gerente-sinistros", "perito"],
  "claims:advance": ["gerente-sinistros", "perito"],

  // Fraud
  "fraud:read":           ["c-level", "gerente-sinistros", "analista-fraude"],
  "fraud:analyze":        ["analista-fraude", "gerente-sinistros"],
  "fraud:update-investigation": ["analista-fraude"],

  // Rules Engine
  "rules:read":   ["c-level", "gerente-sinistros", "cio"],
  "rules:write":  ["gerente-sinistros", "cio"],
  "rules:delete": ["gerente-sinistros", "cio"],

  // Analytics
  "analytics:read":    ["c-level", "gerente-sinistros", "cio"],
  "analytics:predict": ["c-level", "gerente-sinistros", "analista-fraude", "cio", "perito"],

  // CSAT
  "csat:read":   ["c-level", "gerente-sinistros", "cio"],
  "csat:submit": ["c-level", "gerente-sinistros", "analista-fraude", "cio", "perito"],

  // Subscriptions / Tenant
  "subscriptions:read":   ["cio", "c-level"],
  "subscriptions:write":  ["cio"],
  "tenant:branding":      ["cio", "c-level"],
  "tenant:admin":         [] as string[], // admin role only

  // Profile
  "profile:update-name":    ["c-level", "gerente-sinistros", "analista-fraude", "cio", "perito"],
  "profile:update-persona": [] as string[], // admin only — users cannot self-assign persona
} as const;

export type Permission = keyof typeof PERMISSIONS;

// ─── Guard Function ───────────────────────────────────────────────────────────
/**
 * Throws TRPCError FORBIDDEN if the user does not have the required permission.
 * Admins bypass all persona checks.
 */
export function requirePermission(
  user: Pick<User, "role" | "persona">,
  permission: Permission
): void {
  if (user.role === "admin") return; // admins bypass all checks

  const allowed = PERMISSIONS[permission] as readonly string[];
  const persona = user.persona ?? "perito";

  if (!allowed.includes(persona)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `A persona "${persona}" não tem permissão para executar a ação "${permission}".`,
    });
  }
}

// ─── Frontend Permission Map (exported for client-side use) ──────────────────
// Mirrors server permissions for UI gating (route protection, button visibility).
export const PERSONA_ROUTE_MAP: Record<Persona, string[]> = {
  "c-level":           ["/dashboard", "/claims", "/fraud", "/analytics", "/csat", "/subscriptions", "/whitelabel"],
  "gerente-sinistros": ["/dashboard", "/claims", "/fraud", "/rules", "/analytics", "/csat"],
  "analista-fraude":   ["/dashboard", "/claims", "/fraud"],
  "cio":               ["/dashboard", "/rules", "/analytics", "/csat", "/subscriptions", "/whitelabel"],
  "perito":            ["/dashboard", "/claims"],
};
