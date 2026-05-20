/**
 * ProtectedRoute — Client-side route guard by persona
 *
 * Prevents users from accessing pages they don't have permission for,
 * even if they know the URL directly. Redirects to /dashboard on unauthorized access.
 *
 * Note: This is a UX layer. Real authorization is enforced server-side via RBAC middleware.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Redirect } from "wouter";
import type { Persona } from "../../../shared/types";

// Route → allowed personas mapping (mirrors server RBAC)
const ROUTE_PERSONAS: Record<string, Persona[]> = {
  "/dashboard":     ["c-level", "gerente-sinistros", "analista-fraude", "cio", "perito"],
  "/claims":        ["c-level", "gerente-sinistros", "analista-fraude", "cio", "perito"],
  "/claims/new":    ["gerente-sinistros", "perito"],
  "/fraud":         ["c-level", "gerente-sinistros", "analista-fraude"],
  "/rules":         ["c-level", "gerente-sinistros", "cio"],
  "/analytics":     ["c-level", "gerente-sinistros", "cio"],
  "/csat":          ["c-level", "gerente-sinistros", "cio"],
  "/subscriptions": ["c-level", "cio"],
  "/whitelabel":    ["c-level", "cio"],
};

interface ProtectedRouteProps {
  path: string;
  children: React.ReactNode;
}

export function ProtectedRoute({ path, children }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) return <Redirect to="/login" />;

  const persona = user.persona as Persona;
  const allowed = ROUTE_PERSONAS[path];

  // If no restriction is defined for this path, allow all authenticated users
  if (!allowed) return <>{children}</>;

  // Admin bypasses all persona checks
  if (user.role === "admin") return <>{children}</>;

  if (!allowed.includes(persona)) {
    return <Redirect to="/dashboard" />;
  }

  return <>{children}</>;
}

/**
 * Hook to check if the current user can access a given route.
 * Useful for conditionally rendering navigation items.
 */
export function useCanAccess(path: string): boolean {
  const { user } = useAuth();
  if (!user) return false;
  if (user.role === "admin") return true;
  const allowed = ROUTE_PERSONAS[path];
  if (!allowed) return true;
  return allowed.includes(user.persona as Persona);
}
