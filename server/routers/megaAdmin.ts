import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { requireMegaAdmin } from "../_core/rbac";
import {
  getAllTenantsWithStats, getTenantFullDetail, updateTenantByAdmin,
  updateSubscriptionByAdmin, updateUserByAdmin, removeUserFromTenant,
  createAuditLog, getAuditLogs, getPlatformMetrics,
  getPlatformDashboardMetrics, getAllPlatformUsers, getCsatDetailByTenant,
  createTenantByAdmin,
} from "../db";

export const megaAdminRouter = router({
  // ─── Platform metrics ──────────────────────────────────────────────────────
  getPlatformMetrics: protectedProcedure.query(async ({ ctx }) => {
    requireMegaAdmin(ctx.user);
    return getPlatformMetrics();
  }),

  // ─── Tenant management ─────────────────────────────────────────────────────
  getAllTenants: protectedProcedure.query(async ({ ctx }) => {
    requireMegaAdmin(ctx.user);
    return getAllTenantsWithStats();
  }),

  getTenantDetail: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ ctx, input }) => {
      requireMegaAdmin(ctx.user);
      return getTenantFullDetail(input.tenantId);
    }),

  updateTenant: protectedProcedure
    .input(z.object({
      tenantId: z.number(),
      name: z.string().optional(),
      isActive: z.boolean().optional(),
      subscriptionPlan: z.enum(["starter", "professional", "enterprise"]).optional(),
      supportEmail: z.string().optional(),
      supportPhone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireMegaAdmin(ctx.user);
      const { tenantId, ...data } = input;
      const before = await getTenantFullDetail(tenantId);
      await updateTenantByAdmin(tenantId, data);
      await createAuditLog({
        adminId: ctx.user.id,
        adminName: ctx.user.name ?? undefined,
        adminEmail: ctx.user.email ?? undefined,
        action: "tenant.update",
        resource: "tenant",
        resourceId: tenantId,
        resourceName: before?.tenant.name ?? undefined,
        targetTenantId: tenantId,
        targetTenantName: before?.tenant.name ?? undefined,
        previousState: before?.tenant as Record<string, unknown>,
        newState: data as Record<string, unknown>,
        severity: "info",
      });
      return { success: true };
    }),

  // ─── Subscription management ───────────────────────────────────────────────
  updateSubscription: protectedProcedure
    .input(z.object({
      tenantId: z.number(),
      plan: z.enum(["starter", "professional", "enterprise"]).optional(),
      status: z.enum(["active", "suspended", "cancelled", "trial"]).optional(),
      maxClaims: z.number().optional(),
      maxUsers: z.number().optional(),
      billingCycle: z.enum(["monthly", "annual"]).optional(),
      pillarEonicData: z.boolean().optional(),
      pillarRulesEngine: z.boolean().optional(),
      pillarFraudML: z.boolean().optional(),
      pillarPredictive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireMegaAdmin(ctx.user);
      const { tenantId, ...data } = input;
      const before = await getTenantFullDetail(tenantId);
      await updateSubscriptionByAdmin(tenantId, data);
      await createAuditLog({
        adminId: ctx.user.id,
        adminName: ctx.user.name ?? undefined,
        adminEmail: ctx.user.email ?? undefined,
        action: "subscription.update",
        resource: "subscription",
        resourceId: tenantId,
        resourceName: before?.tenant.name ?? undefined,
        targetTenantId: tenantId,
        targetTenantName: before?.tenant.name ?? undefined,
        previousState: before?.subscription as Record<string, unknown>,
        newState: data as Record<string, unknown>,
        severity: data.status === "suspended" ? "warning" : "info",
      });
      return { success: true };
    }),

  // ─── User management ───────────────────────────────────────────────────────
  updateUser: protectedProcedure
    .input(z.object({
      userId: z.number(),
      name: z.string().optional(),
      role: z.enum(["user", "admin", "mega-admin"]).optional(),
      persona: z.enum(["c-level", "gerente-sinistros", "analista-fraude", "cio", "perito"]).optional(),
      tenantId: z.number().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireMegaAdmin(ctx.user);
      // Best practice: prevent self-demotion
      if (input.userId === ctx.user.id && input.role && input.role !== "mega-admin") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível remover o próprio role mega-admin." });
      }
      const { userId, ...data } = input;
      await updateUserByAdmin(userId, data);
      await createAuditLog({
        adminId: ctx.user.id,
        adminName: ctx.user.name ?? undefined,
        adminEmail: ctx.user.email ?? undefined,
        action: "user.update",
        resource: "user",
        resourceId: userId,
        targetTenantId: data.tenantId ?? undefined,
        newState: data as Record<string, unknown>,
        severity: data.role === "mega-admin" ? "critical" : "info",
      });
      return { success: true };
    }),

  removeUserFromTenant: protectedProcedure
    .input(z.object({ userId: z.number(), tenantName: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      requireMegaAdmin(ctx.user);
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível remover o próprio usuário." });
      }
      await removeUserFromTenant(input.userId);
      await createAuditLog({
        adminId: ctx.user.id,
        adminName: ctx.user.name ?? undefined,
        adminEmail: ctx.user.email ?? undefined,
        action: "user.remove-from-tenant",
        resource: "user",
        resourceId: input.userId,
        severity: "warning",
        notes: `Removido do tenant: ${input.tenantName ?? "desconhecido"}`,
      });
      return { success: true };
    }),

  // ─── Audit log ─────────────────────────────────────────────────────────────
  getAuditLog: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      requireMegaAdmin(ctx.user);
      return getAuditLogs(input.limit, input.offset);
    }),

  // ─── Dashboard gerencial expandido ─────────────────────────────────────────
  getDashboardMetrics: protectedProcedure.query(async ({ ctx }) => {
    requireMegaAdmin(ctx.user);
    return getPlatformDashboardMetrics();
  }),

  // ─── Todos os usuários da plataforma ──────────────────────────────────────
  getAllUsers: protectedProcedure
    .input(z.object({
      tenantId: z.number().optional(),
      role: z.string().optional(),
      persona: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      requireMegaAdmin(ctx.user);
      return getAllPlatformUsers(input ?? undefined);
    }),

  // ─── CSAT/NPS detalhado por tenant ─────────────────────────────────────────
  getTenantCsat: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ ctx, input }) => {
      requireMegaAdmin(ctx.user);
      return getCsatDetailByTenant(input.tenantId);
    }),

  // ─── Criar novo tenant ─────────────────────────────────────────────────────
  createTenant: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
      plan: z.enum(["starter", "professional", "enterprise"]),
      supportEmail: z.string().email().optional(),
      supportPhone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireMegaAdmin(ctx.user);
      try {
        const newId = await createTenantByAdmin(input);
        await createAuditLog({
          adminId: ctx.user.id,
          adminName: ctx.user.name ?? undefined,
          adminEmail: ctx.user.email ?? undefined,
          action: "tenant.create",
          resource: "tenant",
          resourceId: newId ?? undefined,
          resourceName: input.name,
          newState: input as Record<string, unknown>,
          severity: "info",
        });
        return { success: true, tenantId: newId };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro ao criar tenant";
        throw new TRPCError({ code: "BAD_REQUEST", message: msg });
      }
    }),
});
