import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  upsertUser, getUserByOpenId, getTenants, getTenantById, createTenant, updateTenantPillars,
  getClaimsByTenant, getClaimById, createClaim, updateClaimStatus, updateClaim,
  getClaimEvents, createClaimEvent,
  getRulesByTenant, createRule, updateRule, deleteRule,
  getRuleLogsByTenant, getRuleLogsByClaim, createRuleLog,
  getFraudScoresByClaim, getFraudScoresByTenant, upsertFraudScore, updateFraudInvestigation,
  getPredictiveAnalysisByClaim, createPredictiveAnalysis,
  getCsatByTenant, createCsatResponse,
  getSubscriptionByTenant, upsertSubscription,
  getKpisByTenant,
} from "./db";
import { TRPCError } from "@trpc/server";

// Helper: get tenantId from user (default to 1 for demo)
function getTenantId(user: { tenantId?: number | null }) {
  return user.tenantId ?? 1;
}

export const appRouter = router({
  system: systemRouter,

  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
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
        const { tenantId, ...pillars } = input;
        const myTenantId = getTenantId(ctx.user);
        if (ctx.user.role !== "admin" && tenantId !== myTenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return updateTenantPillars(tenantId, pillars);
      }),
  }),

  // ─── Claims ────────────────────────────────────────────────────────────────
  claims: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const tenantId = getTenantId(ctx.user);
        return getClaimsByTenant(tenantId, input.limit ?? 50, input.offset ?? 0);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
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
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenantId = getTenantId(ctx.user);
        const claimNumber = `CLM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        await createClaim({
          ...input,
          claimNumber,
          tenantId,
          status: "ingestion",
          incidentDate: input.incidentDate ? new Date(input.incidentDate) : undefined,
        });
        await createClaimEvent({
          claimId: 0, // will be updated
          tenantId,
          eventType: "status_change",
          toStatus: "ingestion",
          description: "Sinistro registrado no sistema",
          performedBy: ctx.user.id,
          performedByName: ctx.user.name ?? "Sistema",
          isAutomated: false,
        });
        return { claimNumber };
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
        const tenantId = getTenantId(ctx.user);
        const claim = await getClaimById(input.id, tenantId);
        if (!claim) throw new TRPCError({ code: "NOT_FOUND" });

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
        return { success: true };
      }),

    getEvents: protectedProcedure
      .input(z.object({ claimId: z.number() }))
      .query(async ({ ctx, input }) => {
        const tenantId = getTenantId(ctx.user);
        return getClaimEvents(input.claimId, tenantId);
      }),
  }),

  // ─── Rules (Motor de Regras No-Code) ──────────────────────────────────────
  rules: router({
    list: protectedProcedure.query(async ({ ctx }) => {
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
        const tenantId = getTenantId(ctx.user);
        const { id, ...data } = input;
        return updateRule(id, tenantId, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = getTenantId(ctx.user);
        return deleteRule(input.id, tenantId);
      }),

    getLogs: protectedProcedure
      .input(z.object({ claimId: z.number().optional(), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const tenantId = getTenantId(ctx.user);
        if (input.claimId) return getRuleLogsByClaim(input.claimId, tenantId);
        return getRuleLogsByTenant(tenantId, input.limit ?? 50);
      }),

    applyToClaimSimulate: protectedProcedure
      .input(z.object({ claimId: z.number() }))
      .mutation(async ({ ctx, input }) => {
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
      .query(async ({ input }) => {
        return getFraudScoresByClaim(input.claimId);
      }),

    getScoresByTenant: protectedProcedure
      .input(z.object({ riskLevel: z.enum(["green", "yellow", "red"]).optional() }))
      .query(async ({ ctx, input }) => {
        const tenantId = getTenantId(ctx.user);
        return getFraudScoresByTenant(tenantId, input.riskLevel);
      }),

    analyzeRisk: protectedProcedure
      .input(z.object({ claimId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = getTenantId(ctx.user);
        const claim = await getClaimById(input.claimId, tenantId);
        if (!claim) throw new TRPCError({ code: "NOT_FOUND" });

        // Simulate ML risk scoring
        const amount = Number(claim.claimedAmount ?? 0);
        const factors = [
          { name: "Valor do Sinistro", weight: 0.3, value: amount, contribution: amount > 50000 ? 0.4 : 0.1 },
          { name: "Histórico do Segurado", weight: 0.25, value: "sem histórico", contribution: 0.1 },
          { name: "Tipo de Sinistro", weight: 0.2, value: claim.claimType, contribution: claim.claimType === "auto" ? 0.2 : 0.05 },
          { name: "Tempo desde Incidente", weight: 0.15, value: "2 dias", contribution: 0.05 },
          { name: "Padrão de Documentação", weight: 0.1, value: "completo", contribution: 0.02 },
        ];

        const score = factors.reduce((acc, f) => acc + f.contribution * 100, 0);
        const riskLevel: "green" | "yellow" | "red" = score < 30 ? "green" : score < 60 ? "yellow" : "red";

        await upsertFraudScore({
          claimId: input.claimId,
          tenantId,
          score: score.toFixed(2),
          riskLevel,
          factors,
          modelVersion: "v1.0",
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
          description: `Score de risco calculado: ${score.toFixed(0)}% (${riskLevel.toUpperCase()})`,
          performedBy: ctx.user.id,
          performedByName: "Sistema IA",
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
        return updateFraudInvestigation(input.scoreId, input.status, input.notes, ctx.user.id);
      }),
  }),

  // ─── Analytics ─────────────────────────────────────────────────────────────
  analytics: router({
    getKpis: protectedProcedure.query(async ({ ctx }) => {
      const tenantId = getTenantId(ctx.user);
      return getKpisByTenant(tenantId);
    }),

    getPredictiveAnalysis: protectedProcedure
      .input(z.object({ claimId: z.number() }))
      .query(async ({ input }) => {
        return getPredictiveAnalysisByClaim(input.claimId);
      }),

    generatePrediction: protectedProcedure
      .input(z.object({ claimId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = getTenantId(ctx.user);
        const claim = await getClaimById(input.claimId, tenantId);
        if (!claim) throw new TRPCError({ code: "NOT_FOUND" });

        const claimedAmount = Number(claim.claimedAmount ?? 10000);
        const fraudScore = Number(claim.fraudScore ?? 20);

        // Simulate predictive model
        const suggestedAmount = claimedAmount * (1 - fraudScore / 200);
        const predictedFinalCost = suggestedAmount * 1.05;
        const litigationProbability = fraudScore > 60 ? 0.45 : fraudScore > 30 ? 0.15 : 0.05;
        const predictedResolutionDays = fraudScore > 60 ? 45 : fraudScore > 30 ? 21 : 10;
        const confidenceScore = 0.82;

        await createPredictiveAnalysis({
          claimId: input.claimId,
          tenantId,
          suggestedAmount: suggestedAmount.toFixed(2),
          predictedFinalCost: predictedFinalCost.toFixed(2),
          litigationProbability: litigationProbability.toFixed(2),
          predictedResolutionDays,
          confidenceScore: confidenceScore.toFixed(2),
          similarCasesCount: 127,
          analysisFactors: [
            { name: "Valor Reclamado", impact: "alto", direction: "neutro" },
            { name: "Score de Fraude", impact: "médio", direction: "negativo" },
            { name: "Tipo de Sinistro", impact: "baixo", direction: "neutro" },
          ],
          modelVersion: "v1.0",
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
        if (ctx.user.persona !== "cio" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o CIO pode gerenciar assinaturas" });
        }
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
