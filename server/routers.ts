import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb } from "./db";
import {
  upsertUser, getUserByOpenId, getTenants, getTenantById, createTenant, updateTenantPillars, updateTenantBranding,
  getClaimsByTenant, getClaimById, createClaim, updateClaimStatus, updateClaim,
  getClaimEvents, createClaimEvent,
  getRulesByTenant, createRule, updateRule, deleteRule,
  getRuleLogsByTenant, getRuleLogsByClaim, createRuleLog,
  getFraudScoresByClaim, getFraudScoresByTenant, upsertFraudScore, updateFraudInvestigation,
  getPredictiveAnalysisByClaim, createPredictiveAnalysis,
  getCsatByTenant, createCsatResponse,
  getSubscriptionByTenant, upsertSubscription,
  getKpisByTenant, getKpisTrend,
  getClaimsStatusSummary,
  getAllTenantsWithStats, getTenantFullDetail, updateTenantByAdmin,
  updateSubscriptionByAdmin, updateUserByAdmin, removeUserFromTenant,
  createAuditLog, getAuditLogs, getPlatformMetrics,
} from "./db";
import { TRPCError } from "@trpc/server";
import { requirePermission, requireMegaAdmin } from "./_core/rbac";
import { megaAdminRouter } from "./routers/megaAdmin";
import { tenantUsersRouter } from "./routers/tenantUsers";
import { analyzeFraudWithAI, generatePredictionWithAI } from "./_core/aiService";
import { eventBus } from "./_core/eventBus";

// Helper: get tenantId from user (default to 1 for demo)
function getTenantId(user: { tenantId?: number | null }) {
  return user.tenantId ?? 1;
}

export const appRouter = router({
  system: systemRouter,
  megaAdmin: megaAdminRouter,
  tenantUsers: tenantUsersRouter,

  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Update only name — persona is now admin-only
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx.user, "profile:update-name");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await db.update(users)
          .set({ name: input.name, updatedAt: new Date() })
          .where(eq(users.id, ctx.user.id));
        return { success: true };
      }),

    // Admin-only: assign persona to a user
    assignPersona: protectedProcedure
      .input(z.object({
        userId: z.number(),
        persona: z.enum(["c-level", "gerente-sinistros", "analista-fraude", "cio", "perito"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem atribuir personas." });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await db.update(users)
          .set({ persona: input.persona, updatedAt: new Date() })
          .where(eq(users.id, input.userId));
        return { success: true };
      }),
  }),

  // ─── Tenants ───────────────────────────────────────────────────────────────
  tenants: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getTenants();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getTenantById(input.id);
      }),

    getMine: protectedProcedure.query(async ({ ctx }) => {
      const tenantId = getTenantId(ctx.user);
      return getTenantById(tenantId);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2),
          slug: z.string().min(2),
          logoUrl: z.string().optional(),
          subscriptionPlan: z.enum(["starter", "professional", "enterprise"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return createTenant({ ...input, subscriptionPlan: input.subscriptionPlan ?? "starter" });
      }),

    updatePillars: protectedProcedure
      .input(
        z.object({
          tenantId: z.number(),
          pillarEonicData: z.boolean().optional(),
          pillarRulesEngine: z.boolean().optional(),
          pillarFraudML: z.boolean().optional(),
          pillarPredictive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx.user, "subscriptions:write");
        const { tenantId, ...pillars } = input;
        const myTenantId = getTenantId(ctx.user);
        if (ctx.user.role !== "admin" && tenantId !== myTenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return updateTenantPillars(tenantId, pillars);
      }),

    updateBranding: protectedProcedure
      .input(
        z.object({
          brandName: z.string().max(128).optional().nullable(),
          logoUrl: z.string().url().optional().nullable(),
          primaryColor: z.string().max(32).optional().nullable(),
          accentColor: z.string().max(32).optional().nullable(),
          faviconUrl: z.string().url().optional().nullable(),
          supportEmail: z.string().email().optional().nullable(),
          supportPhone: z.string().max(32).optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx.user, "tenant:branding");
        const tenantId = getTenantId(ctx.user);
        return updateTenantBranding(tenantId, input);
      }),
  }),

  // ─── Claims ────────────────────────────────────────────────────────────────
  claims: router({
    list: protectedProcedure
      .input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        status: z.enum(["ingestion", "triage", "risk_analysis", "investigation", "resolution", "closed", "rejected"]).optional(),
      }))
      .query(async ({ ctx, input }) => {
        requirePermission(ctx.user, "claims:read");
        const tenantId = getTenantId(ctx.user);
        return getClaimsByTenant(tenantId, input.limit ?? 50, input.offset ?? 0, input.status);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        requirePermission(ctx.user, "claims:read");
        const tenantId = getTenantId(ctx.user);
        const claim = await getClaimById(input.id, tenantId);
        if (!claim) throw new TRPCError({ code: "NOT_FOUND" });
        return claim;
      }),

    create: protectedProcedure
      .input(
        z.object({
          policyNumber: z.string().optional(),
          insuredName: z.string().min(2),
          insuredDocument: z.string().optional(),
          claimType: z.enum(["auto", "property", "health", "life", "liability", "other"]),
          description: z.string().optional(),
          incidentDate: z.string().optional(),
          claimedAmount: z.string().optional(),
          attachmentUrls: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx.user, "claims:create");
        const tenantId = getTenantId(ctx.user);
        const claimNumber = `CLM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const { attachmentUrls, ...claimData } = input;
        const result = await createClaim({
          ...claimData,
          claimNumber,
          tenantId,
          status: "ingestion",
          incidentDate: input.incidentDate ? new Date(input.incidentDate) : undefined,
          metadata: attachmentUrls && attachmentUrls.length > 0 ? { attachmentUrls } : undefined,
        });

        const insertId = (result as { insertId?: number }).insertId ?? 0;

        await createClaimEvent({
          claimId: insertId,
          tenantId,
          eventType: "status_change",
          toStatus: "ingestion",
          description: "Sinistro registrado no sistema",
          performedBy: ctx.user.id,
          performedByName: ctx.user.name ?? "Sistema",
          isAutomated: false,
        });

        // Publish event for async pipeline (rules engine + fraud scoring)
        eventBus.publish({
          type: "claim.created",
          payload: {
            claimId: insertId,
            tenantId,
            claimType: input.claimType,
            claimedAmount: input.claimedAmount ?? null,
            description: input.description ?? null,
            performedById: ctx.user.id,
            performedByName: ctx.user.name ?? "Sistema",
          },
        });

        return { claimNumber, claimId: insertId };
      }),

    advanceStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["ingestion", "triage", "risk_analysis", "investigation", "resolution", "closed", "rejected"]),
          notes: z.string().optional(),
          approvedAmount: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx.user, "claims:advance");
        const tenantId = getTenantId(ctx.user);
        const claim = await getClaimById(input.id, tenantId);
        if (!claim) throw new TRPCError({ code: "NOT_FOUND" });

        // Enforce lifecycle order
        const ORDER = ["ingestion", "triage", "risk_analysis", "investigation", "resolution", "closed"];
        const currentIdx = ORDER.indexOf(claim.status);
        const nextIdx = ORDER.indexOf(input.status);
        const isRejection = input.status === "rejected";
        if (!isRejection && nextIdx !== currentIdx + 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Transição inválida: não é possível ir de "${claim.status}" para "${input.status}" diretamente.`,
          });
        }

        const extra: Record<string, unknown> = {};
        if (input.approvedAmount) extra.approvedAmount = input.approvedAmount;
        if (input.status === "closed") extra.resolvedAt = new Date();

        await updateClaimStatus(input.id, tenantId, input.status, extra);
        await createClaimEvent({
          claimId: input.id,
          tenantId,
          eventType: "status_change",
          fromStatus: claim.status,
          toStatus: input.status,
          description: input.notes ?? `Status alterado para ${input.status}`,
          performedBy: ctx.user.id,
          performedByName: ctx.user.name ?? "Sistema",
          isAutomated: false,
        });

        // Publish event for async pipeline (auto-prediction on risk_analysis)
        eventBus.publish({
          type: "claim.status_changed",
          payload: {
            claimId: input.id,
            tenantId,
            fromStatus: claim.status,
            toStatus: input.status,
            performedById: ctx.user.id,
            performedByName: ctx.user.name ?? "Sistema",
          },
        });

        return { success: true };
      }),

    getEvents: protectedProcedure
      .input(z.object({ claimId: z.number() }))
      .query(async ({ ctx, input }) => {
        requirePermission(ctx.user, "claims:read");
        const tenantId = getTenantId(ctx.user);
        return getClaimEvents(input.claimId, tenantId);
      }),

    // Lightweight status summary — available to all personas with claims:read
    getStatusSummary: protectedProcedure.query(async ({ ctx }) => {
      requirePermission(ctx.user, "claims:read");
      const tenantId = getTenantId(ctx.user);
      return getClaimsStatusSummary(tenantId);
    }),
  }),

  // ─── Rules (Motor de Regras No-Code) ──────────────────────────────────────
  rules: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      requirePermission(ctx.user, "rules:read");
      const tenantId = getTenantId(ctx.user);
      return getRulesByTenant(tenantId);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2),
          description: z.string().optional(),
          priority: z.number().optional(),
          conditions: z.array(
            z.object({
              field: z.string(),
              operator: z.enum(["equals", "not_equals", "greater_than", "less_than", "contains", "in"]),
              value: z.union([z.string(), z.number(), z.array(z.string())]),
            })
          ),
          action: z.enum(["auto_approve", "auto_reject", "escalate", "flag_fraud", "assign_to_perito", "request_documents", "notify"]),
          actionParams: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx.user, "rules:write");
        const tenantId = getTenantId(ctx.user);
        return createRule({ ...input, tenantId, createdBy: ctx.user.id });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
          priority: z.number().optional(),
          conditions: z.array(z.object({
            field: z.string(),
            operator: z.enum(["equals", "not_equals", "greater_than", "less_than", "contains", "in"]),
            value: z.union([z.string(), z.number(), z.array(z.string())]),
          })).optional(),
          action: z.enum(["auto_approve", "auto_reject", "escalate", "flag_fraud", "assign_to_perito", "request_documents", "notify"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx.user, "rules:write");
        const tenantId = getTenantId(ctx.user);
        const { id, ...data } = input;
        return updateRule(id, tenantId, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx.user, "rules:delete");
        const tenantId = getTenantId(ctx.user);
        return deleteRule(input.id, tenantId);
      }),

    getLogs: protectedProcedure
      .input(z.object({ claimId: z.number().optional(), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        requirePermission(ctx.user, "rules:read");
        const tenantId = getTenantId(ctx.user);
        if (input.claimId) return getRuleLogsByClaim(input.claimId, tenantId);
        return getRuleLogsByTenant(tenantId, input.limit ?? 50);
      }),

    applyToClaimSimulate: protectedProcedure
      .input(z.object({ claimId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx.user, "rules:read");
        const tenantId = getTenantId(ctx.user);
        const claim = await getClaimById(input.claimId, tenantId);
        if (!claim) throw new TRPCError({ code: "NOT_FOUND" });

        const tenantRules = await getRulesByTenant(tenantId);
        const activeRules = tenantRules.filter((r) => r.isActive);
        const results = [];

        for (const rule of activeRules) {
          const conditions = rule.conditions as Array<{ field: string; operator: string; value: unknown }>;
          let allMet = true;
          const evaluated = [];

          for (const cond of conditions) {
            const claimVal = (claim as Record<string, unknown>)[cond.field];
            let met = false;
            if (cond.operator === "equals") met = claimVal === cond.value;
            else if (cond.operator === "not_equals") met = claimVal !== cond.value;
            else if (cond.operator === "greater_than") met = Number(claimVal) > Number(cond.value);
            else if (cond.operator === "less_than") met = Number(claimVal) < Number(cond.value);
            else if (cond.operator === "contains") met = String(claimVal).includes(String(cond.value));
            else if (cond.operator === "in") met = (cond.value as string[]).includes(String(claimVal));
            if (!met) allMet = false;
            evaluated.push({ ...cond, met, actualValue: claimVal });
          }

          const explanation = allMet
            ? `Regra "${rule.name}" ativada: ${conditions.map((c) => `${c.field} ${c.operator} ${c.value}`).join(" E ")}. Ação: ${rule.action}`
            : `Regra "${rule.name}" não ativada: condições não atendidas.`;

          await createRuleLog({
            ruleId: rule.id,
            claimId: input.claimId,
            tenantId,
            ruleName: rule.name,
            conditionsEvaluated: evaluated,
            conditionsMet: allMet,
            actionTaken: allMet ? rule.action : null,
            explanation,
          });

          results.push({ ruleId: rule.id, ruleName: rule.name, conditionsMet: allMet, action: allMet ? rule.action : null, explanation });
        }

        return results;
      }),
  }),

  // ─── Fraud ─────────────────────────────────────────────────────────────────
  fraud: router({
    getScoresByClaim: protectedProcedure
      .input(z.object({ claimId: z.number() }))
      .query(async ({ ctx, input }) => {
        requirePermission(ctx.user, "fraud:read");
        return getFraudScoresByClaim(input.claimId);
      }),

    getScoresByTenant: protectedProcedure
      .input(z.object({ riskLevel: z.enum(["green", "yellow", "red"]).optional() }))
      .query(async ({ ctx, input }) => {
        requirePermission(ctx.user, "fraud:read");
        const tenantId = getTenantId(ctx.user);
        return getFraudScoresByTenant(tenantId, input.riskLevel);
      }),

    analyzeRisk: protectedProcedure
      .input(z.object({ claimId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx.user, "fraud:analyze");
        const tenantId = getTenantId(ctx.user);
        const claim = await getClaimById(input.claimId, tenantId);
        if (!claim) throw new TRPCError({ code: "NOT_FOUND" });

        // Real AI-powered fraud analysis via LLM
        const aiResult = await analyzeFraudWithAI({
          claimType: claim.claimType,
          description: claim.description,
          claimedAmount: Number(claim.claimedAmount ?? 0),
          insuredName: claim.insuredName ?? "",
                    policyNumber: claim.policyNumber,
          incidentDate: claim.incidentDate instanceof Date ? claim.incidentDate.toISOString() : claim.incidentDate,
        });
        const { score, riskLevel, factors, modelVersion } = aiResult;

        await upsertFraudScore({
          claimId: input.claimId,
          tenantId,
          score: score.toFixed(2),
          riskLevel,
          factors,
          modelVersion,
          investigationStatus: "pending",
        });

        await updateClaim(input.claimId, tenantId, {
          fraudRisk: riskLevel,
          fraudScore: score.toFixed(2),
        });

        await createClaimEvent({
          claimId: input.claimId,
          tenantId,
          eventType: "fraud_score_updated",
          description: `IA analisou risco: ${score.toFixed(0)}% (${riskLevel.toUpperCase()}) — ${aiResult.reasoning}`,
          performedBy: ctx.user.id,
          performedByName: "EonSure AI",
          isAutomated: true,
        });

        return { score, riskLevel, factors };
      }),

    updateInvestigation: protectedProcedure
      .input(
        z.object({
          scoreId: z.number(),
          status: z.enum(["pending", "in_review", "cleared", "confirmed_fraud"]),
          notes: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx.user, "fraud:update-investigation");
        return updateFraudInvestigation(input.scoreId, input.status, input.notes, ctx.user.id);
      }),
  }),

  // ─── Analytics ─────────────────────────────────────────────────────────────
  analytics: router({
    getKpis: protectedProcedure.query(async ({ ctx }) => {
      requirePermission(ctx.user, "analytics:read");
      const tenantId = getTenantId(ctx.user);
      return getKpisByTenant(tenantId);
    }),

    getKpisTrend: protectedProcedure
      .input(z.object({ months: z.number().min(1).max(12).optional() }))
      .query(async ({ ctx, input }) => {
        requirePermission(ctx.user, "analytics:read");
        const tenantId = getTenantId(ctx.user);
        return getKpisTrend(tenantId, input.months ?? 6);
      }),

    getPredictiveAnalysis: protectedProcedure
      .input(z.object({ claimId: z.number() }))
      .query(async ({ ctx, input }) => {
        requirePermission(ctx.user, "analytics:predict");
        return getPredictiveAnalysisByClaim(input.claimId);
      }),

    generatePrediction: protectedProcedure
      .input(z.object({ claimId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx.user, "analytics:predict");
        const tenantId = getTenantId(ctx.user);
        const claim = await getClaimById(input.claimId, tenantId);
        if (!claim) throw new TRPCError({ code: "NOT_FOUND" });

        const claimedAmount = Number(claim.claimedAmount ?? 10000);
        const fraudScore = Number(claim.fraudScore ?? 20);
        const fraudRisk = claim.fraudRisk ?? "green";

        // Real AI-powered predictive analytics via LLM
        const prediction = await generatePredictionWithAI({
          claimType: claim.claimType,
          description: claim.description,
          claimedAmount,
          fraudScore,
          riskLevel: fraudRisk,
        });

        const {
          suggestedAmount, predictedFinalCost, litigationProbability,
          predictedResolutionDays, confidenceScore, analysisFactors,
        } = prediction;

        await createPredictiveAnalysis({
          claimId: input.claimId,
          tenantId,
          suggestedAmount: suggestedAmount.toFixed(2),
          predictedFinalCost: predictedFinalCost.toFixed(2),
          litigationProbability: litigationProbability.toFixed(2),
          predictedResolutionDays,
          confidenceScore: confidenceScore.toFixed(2),
          similarCasesCount: 127,
          analysisFactors,
          modelVersion: "gpt-4.1-mini-v1",
        });

        await updateClaim(input.claimId, tenantId, {
          suggestedAmount: suggestedAmount.toFixed(2),
          litigationProbability: litigationProbability.toFixed(2),
          predictedResolutionDays,
        });

        return { suggestedAmount, predictedFinalCost, litigationProbability, predictedResolutionDays, confidenceScore };
      }),
  }),

  // ─── CSAT ──────────────────────────────────────────────────────────────────
  csat: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      requirePermission(ctx.user, "csat:read");
      const tenantId = getTenantId(ctx.user);
      return getCsatByTenant(tenantId);
    }),

    submit: protectedProcedure
      .input(
        z.object({
          score: z.number().min(1).max(10),
          npsScore: z.number().min(0).max(10).optional(),
          feedback: z.string().optional(),
          claimId: z.number().optional(),
          responses: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx.user, "csat:submit");
        const tenantId = getTenantId(ctx.user);
        const persona = (ctx.user.persona ?? "perito") as InsertCsatResponse["persona"];
        await createCsatResponse({
          ...input,
          tenantId,
          userId: ctx.user.id,
          persona,
          triggerType: "manual",
        });
        return { success: true };
      }),
  }),

  // ─── Subscriptions ─────────────────────────────────────────────────────────
  subscriptions: router({
    getMine: protectedProcedure.query(async ({ ctx }) => {
      requirePermission(ctx.user, "subscriptions:read");
      const tenantId = getTenantId(ctx.user);
      return getSubscriptionByTenant(tenantId);
    }),

    update: protectedProcedure
      .input(
        z.object({
          plan: z.enum(["starter", "professional", "enterprise"]).optional(),
          pillarEonicData: z.boolean().optional(),
          pillarRulesEngine: z.boolean().optional(),
          pillarFraudML: z.boolean().optional(),
          pillarPredictive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        requirePermission(ctx.user, "subscriptions:write");
        const tenantId = getTenantId(ctx.user);
        const existing = await getSubscriptionByTenant(tenantId);
        await upsertSubscription({
          tenantId,
          plan: input.plan ?? existing?.plan ?? "starter",
          pillarEonicData: input.pillarEonicData ?? existing?.pillarEonicData ?? false,
          pillarRulesEngine: input.pillarRulesEngine ?? existing?.pillarRulesEngine ?? false,
          pillarFraudML: input.pillarFraudML ?? existing?.pillarFraudML ?? false,
          pillarPredictive: input.pillarPredictive ?? existing?.pillarPredictive ?? false,
          status: existing?.status ?? "trial",
        });
        return { success: true };
      }),
  }),
});

// Type alias for use in the client
type InsertCsatResponse = { persona: "c-level" | "gerente-sinistros" | "analista-fraude" | "cio" | "perito" };

export type AppRouter = typeof appRouter;
