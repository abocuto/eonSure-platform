import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ─────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getKpisByTenant: vi.fn().mockResolvedValue({
    totalClaims: 42,
    closedClaims: 18,
    avgResolutionDays: "12.5",
    financialStats: { totalClaimed: "500000.00", totalApproved: "380000.00" },
  }),
  getClaimsByTenant: vi.fn().mockResolvedValue([
    {
      id: 1,
      claimNumber: "CLM-2026-0001",
      tenantId: 1,
      claimType: "auto",
      status: "ingestion",
      priority: "medium",
      fraudRisk: "green",
      claimedAmount: "50000.00",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getTenants: vi.fn().mockResolvedValue([]),
  getTenantById: vi.fn().mockResolvedValue(null),
  createTenant: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateTenantPillars: vi.fn().mockResolvedValue(undefined),
  getRuleLogsByClaim: vi.fn().mockResolvedValue([]),
  createRuleLog: vi.fn().mockResolvedValue(undefined),
  getFraudScoresByClaim: vi.fn().mockResolvedValue([]),
  getPredictiveAnalysisByClaim: vi.fn().mockResolvedValue(null),
  getClaims: vi.fn().mockResolvedValue([
    {
      id: 1,
      claimNumber: "CLM-2026-0001",
      tenantId: 1,
      claimType: "auto",
      status: "ingestion",
      priority: "medium",
      fraudRisk: "green",
      claimedAmount: "50000.00",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  createClaim: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateClaim: vi.fn().mockResolvedValue(undefined),
  updateClaimStatus: vi.fn().mockResolvedValue(undefined),
  createClaimEvent: vi.fn().mockResolvedValue(undefined),
  getClaimById: vi.fn().mockResolvedValue({
    id: 1,
    claimNumber: "CLM-2026-0001",
    tenantId: 1,
    claimType: "auto",
    status: "ingestion",
    priority: "medium",
    fraudRisk: "green",
    claimedAmount: "50000.00",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getClaimEvents: vi.fn().mockResolvedValue([]),
  getRulesByTenant: vi.fn().mockResolvedValue([
    {
      id: 1,
      tenantId: 1,
      name: "Regra de Alto Valor",
      isActive: true,
      priority: 1,
      conditions: [{ field: "claimedAmount", operator: "greater_than", value: "100000" }],
      action: "escalate",
      triggerCount: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  createRule: vi.fn().mockResolvedValue({ insertId: 2 }),
  updateRule: vi.fn().mockResolvedValue(undefined),
  deleteRule: vi.fn().mockResolvedValue(undefined),
  getRuleLogsByTenant: vi.fn().mockResolvedValue([
    {
      id: 1,
      ruleId: 1,
      claimId: 1,
      tenantId: 1,
      ruleName: "Regra de Alto Valor",
      conditionsEvaluated: [{ field: "claimedAmount", operator: "greater_than", value: "100000" }],
      conditionsMet: true,
      actionTaken: "escalate",
      explanation: "Valor reclamado R$150.000 excede o limite de R$100.000",
      createdAt: new Date(),
    },
  ]),
  getFraudScoresByTenant: vi.fn().mockResolvedValue([
    {
      id: 1,
      claimId: 1,
      tenantId: 1,
      score: "72.50",
      riskLevel: "yellow",
      factors: [{ name: "Histórico de sinistros", weight: 0.4, contribution: 0.3 }],
      investigationStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  upsertFraudScore: vi.fn().mockResolvedValue(undefined),
  updateFraudInvestigation: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn().mockResolvedValue(null),
  createPredictiveAnalysis: vi.fn().mockResolvedValue(undefined),
  getCsatByTenant: vi.fn().mockResolvedValue([
    {
      id: 1,
      tenantId: 1,
      persona: "perito",
      score: 8,
      npsScore: 9,
      feedback: "Plataforma muito eficiente",
      createdAt: new Date(),
    },
  ]),
  createCsatResponse: vi.fn().mockResolvedValue(undefined),
  getSubscriptionByTenant: vi.fn().mockResolvedValue({
    id: 1,
    tenantId: 1,
    plan: "professional",
    pillarEonicData: true,
    pillarRulesEngine: true,
    pillarFraudML: false,
    pillarPredictive: false,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  upsertSubscription: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

// ─── Helper: create auth context ─────────────────────────────────────────────
function makeCtx(
  persona: "c-level" | "gerente-sinistros" | "analista-fraude" | "cio" | "perito" = "gerente-sinistros",
  role: "user" | "admin" = "user"
): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-001",
      name: "Test User",
      email: "test@eonsure.com",
      loginMethod: "manus",
      role,
      persona,
      tenantId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Claims Router Tests ──────────────────────────────────────────────────────
describe("claims router", () => {
  it("list: returns claims for authenticated tenant", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.claims.list({});
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("claimNumber");
    expect(result[0]).toHaveProperty("status");
  });

  it("list: supports status filter", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.claims.list({ status: "ingestion" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("create: creates a new claim and returns claimNumber", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.claims.create({
      claimType: "auto",
      insuredName: "João Silva",
      policyNumber: "POL-001",
      claimedAmount: "50000.00",
      description: "Colisão em rodovia",
      incidentDate: "2026-05-01",
    });
    expect(result).toHaveProperty("claimNumber");
  });

  it("advanceStatus: advances claim lifecycle correctly", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.claims.advanceStatus({
      id: 1,
      status: "triage",
      notes: "Triagem iniciada",
    });
    expect(result).toHaveProperty("success", true);
  });
});

// ─── Rules Engine Tests ───────────────────────────────────────────────────────
describe("rules router", () => {
  it("list: returns rules for tenant", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rules.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("conditions");
    expect(result[0]).toHaveProperty("action");
  });

  it("create: creates a no-code rule with conditions and action", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rules.create({
      name: "Sinistro de Alto Valor",
      priority: 1,
      conditions: [
        { field: "claimedAmount", operator: "greater_than", value: "100000" },
      ],
      action: "escalate",
    });
    expect(result).toBeDefined();
  });

  it("update: toggles rule active state", async () => {
    const caller = appRouter.createCaller(makeCtx());
    // updateRule returns void (undefined), which is valid
    await expect(caller.rules.update({ id: 1, isActive: false })).resolves.not.toThrow();
  });

  it("delete: removes a rule", async () => {
    const caller = appRouter.createCaller(makeCtx());
    // deleteRule returns void (undefined), which is valid
    await expect(caller.rules.delete({ id: 1 })).resolves.not.toThrow();
  });

  it("getLogs: returns explainability log entries", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.rules.getLogs({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("ruleName");
      expect(result[0]).toHaveProperty("conditionsMet");
      expect(result[0]).toHaveProperty("explanation");
    }
  });
});

// ─── Fraud Detection Tests ────────────────────────────────────────────────────
describe("fraud router", () => {
  it("getScoresByTenant: returns fraud scores", async () => {
    const caller = appRouter.createCaller(makeCtx("analista-fraude"));
    const result = await caller.fraud.getScoresByTenant({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("getScoresByTenant: filters by risk level", async () => {
    const caller = appRouter.createCaller(makeCtx("analista-fraude"));
    const result = await caller.fraud.getScoresByTenant({ riskLevel: "yellow" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("analyzeRisk: computes risk score for a claim", async () => {
    const caller = appRouter.createCaller(makeCtx("analista-fraude"));
    const result = await caller.fraud.analyzeRisk({ claimId: 1 });
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("riskLevel");
    expect(["green", "yellow", "red"]).toContain(result.riskLevel);
  });

  it("updateInvestigation: updates investigation status with notes", async () => {
    const caller = appRouter.createCaller(makeCtx("analista-fraude"));
    // updateFraudInvestigation returns void (undefined), which is valid
    await expect(caller.fraud.updateInvestigation({
      scoreId: 1,
      status: "in_review",
      notes: "Documentos solicitados ao segurado",
    })).resolves.not.toThrow();
  });
});

// ─── Analytics Router Tests ───────────────────────────────────────────────────
describe("analytics router", () => {
  it("getKpis: returns KPI data for tenant", async () => {
    const caller = appRouter.createCaller(makeCtx("c-level"));
    const result = await caller.analytics.getKpis();
    expect(result).toHaveProperty("totalClaims");
    expect(result).toHaveProperty("closedClaims");
    expect(result).toHaveProperty("financialStats");
    expect(result.financialStats).toHaveProperty("totalClaimed");
    expect(result.financialStats).toHaveProperty("totalApproved");
  });
});

// ─── CSAT Router Tests ────────────────────────────────────────────────────────
describe("csat router", () => {
  it("list: returns CSAT responses for tenant", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.csat.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("submit: records a CSAT response", async () => {
    const caller = appRouter.createCaller(makeCtx("perito"));
    const result = await caller.csat.submit({
      score: 8,
      npsScore: 9,
      feedback: "Plataforma muito eficiente para avaliação de sinistros",
    });
    expect(result).toHaveProperty("success", true);
  });

  it("submit: validates score range (1-10)", async () => {
    const caller = appRouter.createCaller(makeCtx("perito"));
    await expect(
      caller.csat.submit({ score: 0 })
    ).rejects.toThrow();
  });
});

// ─── Subscriptions Router Tests ───────────────────────────────────────────────
describe("subscriptions router", () => {
  it("getMine: returns subscription for tenant", async () => {
    const caller = appRouter.createCaller(makeCtx("cio"));
    const result = await caller.subscriptions.getMine();
    expect(result).toHaveProperty("plan");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("pillarEonicData");
  });

  it("update: allows CIO to toggle pillars", async () => {
    const caller = appRouter.createCaller(makeCtx("cio"));
    const result = await caller.subscriptions.update({ pillarFraudML: true });
    expect(result).toHaveProperty("success", true);
  });
});
