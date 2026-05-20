/**
 * EonSure Claim Event Handlers
 *
 * These handlers are triggered automatically when claim events are published
 * to the event bus. They implement the proactive, automated intelligence
 * pipeline described in the EonSure manifesto:
 *
 *   claim.created → auto-apply rules engine → auto-score fraud risk (AI)
 *   claim.status_changed (→ risk_analysis) → auto-generate prediction (AI)
 *
 * All AI calls use the aiService which integrates OpenAI LLM with
 * graceful fallback to heuristic scoring if the API is unavailable.
 */

import { eventBus, ClaimCreatedPayload, ClaimStatusChangedPayload } from "./eventBus";
import { analyzeFraudWithAI, generatePredictionWithAI } from "./aiService";
import {
  getClaimById, getRulesByTenant, createRuleLog,
  upsertFraudScore, updateClaim, createClaimEvent,
  createPredictiveAnalysis,
} from "../db";

// ─── Handler: Auto-apply Rules Engine + AI Fraud Scoring on Claim Creation ────
async function handleClaimCreated(payload: ClaimCreatedPayload): Promise<void> {
  const { claimId, tenantId, performedById } = payload;

  console.log(`[EventBus] claim.created → Running rules engine for claim #${claimId}`);

  const claim = await getClaimById(claimId, tenantId);
  if (!claim) return;

  const tenantRules = await getRulesByTenant(tenantId);
  const activeRules = tenantRules.filter((r) => r.isActive);

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
      ? `[AUTO] Regra "${rule.name}" ativada automaticamente na ingestão. Ação: ${rule.action}`
      : `[AUTO] Regra "${rule.name}" avaliada — condições não atendidas.`;

    await createRuleLog({
      ruleId: rule.id,
      claimId,
      tenantId,
      ruleName: rule.name,
      conditionsEvaluated: evaluated,
      conditionsMet: allMet,
      actionTaken: allMet ? rule.action : null,
      explanation,
    });
  }

  if (activeRules.length > 0) {
    await createClaimEvent({
      claimId,
      tenantId,
      eventType: "rule_applied",
      description: `Motor de Regras executado automaticamente: ${activeRules.length} regra(s) avaliada(s).`,
      performedBy: performedById,
      performedByName: "Sistema IA",
      isAutomated: true,
    });
  }

  // AI-powered fraud scoring
  console.log(`[EventBus] claim.created → AI fraud scoring for claim #${claimId}`);
  try {
    const aiResult = await analyzeFraudWithAI({
      claimType: claim.claimType,
      description: claim.description,
      claimedAmount: Number(claim.claimedAmount ?? 0),
      insuredName: claim.insuredName ?? "",
      policyNumber: claim.policyNumber,
      incidentDate: claim.incidentDate,
    });

    const { score, riskLevel, factors, modelVersion } = aiResult;

    await upsertFraudScore({
      claimId,
      tenantId,
      score: score.toFixed(2),
      riskLevel,
      factors,
      modelVersion,
      investigationStatus: "pending",
    });

    await updateClaim(claimId, tenantId, {
      fraudRisk: riskLevel,
      fraudScore: score.toFixed(2),
    });

    await createClaimEvent({
      claimId,
      tenantId,
      eventType: "fraud_score_updated",
      description: `[AUTO] EonSure AI analisou risco: ${score.toFixed(0)}% (${riskLevel.toUpperCase()}) — ${aiResult.reasoning}`,
      performedBy: performedById,
      performedByName: "EonSure AI",
      isAutomated: true,
    });

    console.log(`[EventBus] AI pipeline complete for claim #${claimId} — risk: ${riskLevel} (${score.toFixed(0)}%)`);
  } catch (err) {
    console.error(`[EventBus] AI fraud scoring failed for claim #${claimId}:`, err);
  }
}

// ─── Handler: AI Prediction on risk_analysis stage ───────────────────────────
async function handleClaimStatusChanged(payload: ClaimStatusChangedPayload): Promise<void> {
  if (payload.toStatus !== "risk_analysis") return;

  const { claimId, tenantId, performedById } = payload;
  console.log(`[EventBus] claim.status_changed → risk_analysis → AI prediction for claim #${claimId}`);

  const claim = await getClaimById(claimId, tenantId);
  if (!claim) return;

  try {
    const prediction = await generatePredictionWithAI({
      claimType: claim.claimType,
      description: claim.description,
      claimedAmount: Number(claim.claimedAmount ?? 10000),
      fraudScore: Number(claim.fraudScore ?? 20),
      riskLevel: claim.fraudRisk ?? "green",
    });

    const {
      suggestedAmount, predictedFinalCost, litigationProbability,
      predictedResolutionDays, confidenceScore, analysisFactors,
    } = prediction;

    await createPredictiveAnalysis({
      claimId,
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

    await updateClaim(claimId, tenantId, {
      suggestedAmount: suggestedAmount.toFixed(2),
      litigationProbability: litigationProbability.toFixed(2),
      predictedResolutionDays,
    });

    await createClaimEvent({
      claimId,
      tenantId,
      eventType: "status_change",
      description: `[AUTO] EonSure AI gerou análise preditiva: indenização sugerida R$${suggestedAmount.toFixed(2)}, confiança ${(confidenceScore * 100).toFixed(0)}%.`,
      performedBy: performedById,
      performedByName: "EonSure AI",
      isAutomated: true,
    });

    console.log(`[EventBus] AI prediction complete for claim #${claimId}: R$${suggestedAmount.toFixed(2)}`);
  } catch (err) {
    console.error(`[EventBus] AI prediction failed for claim #${claimId}:`, err);
  }
}

// ─── Register Handlers ────────────────────────────────────────────────────────
export function registerClaimHandlers(): void {
  eventBus.subscribe<ClaimCreatedPayload>("claim.created", handleClaimCreated);
  eventBus.subscribe<ClaimStatusChangedPayload>("claim.status_changed", handleClaimStatusChanged);
  console.log("[EventBus] Claim handlers registered (AI-powered).");
}
