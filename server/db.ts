import { eq, and, desc, count, avg, sql, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users, tenants, claims, claimEvents, rules, ruleLogs,
  fraudScores, predictiveAnalyses, csatResponses, subscriptions,
  InsertUser, InsertTenant, InsertClaim, InsertClaimEvent,
  InsertRule, InsertRuleLog, InsertFraudScore, InsertPredictiveAnalysis,
  InsertCsatResponse, InsertSubscription,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const fields = ["name", "email", "loginMethod", "persona", "tenantId", "role"] as const;
  for (const field of fields) {
    const value = user[field];
    if (value !== undefined) {
      (values as Record<string, unknown>)[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }

  values.lastSignedIn = new Date();
  updateSet.lastSignedIn = new Date();

  if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Tenants ──────────────────────────────────────────────────────────────────
export async function getTenants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenants).orderBy(desc(tenants.createdAt));
}

export async function getTenantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result[0];
}

export async function createTenant(data: InsertTenant) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tenants).values(data);
  return result;
}

export async function updateTenantPillars(
  id: number,
  pillars: {
    pillarEonicData?: boolean;
    pillarRulesEngine?: boolean;
    pillarFraudML?: boolean;
    pillarPredictive?: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(tenants).set(pillars).where(eq(tenants.id, id));
}

export async function updateTenantBranding(
  id: number,
  branding: {
    brandName?: string | null;
    logoUrl?: string | null;
    primaryColor?: string | null;
    accentColor?: string | null;
    faviconUrl?: string | null;
    supportEmail?: string | null;
    supportPhone?: string | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(tenants).set(branding).where(eq(tenants.id, id));
}
// ─── Claims ───────────────────────────────────────────────────────────────────
export async function getClaimsByTenant(
  tenantId: number,
  limit = 50,
  offset = 0,
  status?: string
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(claims.tenantId, tenantId)];
  if (status) conditions.push(eq(claims.status, status as InsertClaim["status"]));
  return db
    .select()
    .from(claims)
    .where(and(...conditions))
    .orderBy(desc(claims.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getClaimById(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(claims)
    .where(and(eq(claims.id, id), eq(claims.tenantId, tenantId)))
    .limit(1);
  return result[0];
}

export async function createClaim(data: InsertClaim) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(claims).values(data);
  return result;
}

export async function updateClaimStatus(
  id: number,
  tenantId: number,
  status: InsertClaim["status"],
  extra?: Partial<InsertClaim>
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(claims)
    .set({ status, ...extra })
    .where(and(eq(claims.id, id), eq(claims.tenantId, tenantId)));
}

export async function updateClaim(id: number, tenantId: number, data: Partial<InsertClaim>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(claims).set(data).where(and(eq(claims.id, id), eq(claims.tenantId, tenantId)));
}

// ─── Claim Events ─────────────────────────────────────────────────────────────
export async function getClaimEvents(claimId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(claimEvents)
    .where(and(eq(claimEvents.claimId, claimId), eq(claimEvents.tenantId, tenantId)))
    .orderBy(desc(claimEvents.createdAt));
}

export async function createClaimEvent(data: InsertClaimEvent) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(claimEvents).values(data);
}

// ─── Rules ────────────────────────────────────────────────────────────────────
export async function getRulesByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(rules)
    .where(eq(rules.tenantId, tenantId))
    .orderBy(rules.priority, desc(rules.createdAt));
}

export async function createRule(data: InsertRule) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(rules).values(data);
  return result;
}

export async function updateRule(id: number, tenantId: number, data: Partial<InsertRule>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(rules).set(data).where(and(eq(rules.id, id), eq(rules.tenantId, tenantId)));
}

export async function deleteRule(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(rules).where(and(eq(rules.id, id), eq(rules.tenantId, tenantId)));
}

// ─── Rule Logs ────────────────────────────────────────────────────────────────
export async function getRuleLogsByTenant(tenantId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(ruleLogs)
    .where(eq(ruleLogs.tenantId, tenantId))
    .orderBy(desc(ruleLogs.createdAt))
    .limit(limit);
}

export async function getRuleLogsByClaim(claimId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(ruleLogs)
    .where(and(eq(ruleLogs.claimId, claimId), eq(ruleLogs.tenantId, tenantId)))
    .orderBy(desc(ruleLogs.createdAt));
}

export async function createRuleLog(data: InsertRuleLog) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(ruleLogs).values(data);
}

// ─── Fraud Scores ─────────────────────────────────────────────────────────────
export async function getFraudScoresByClaim(claimId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(fraudScores)
    .where(eq(fraudScores.claimId, claimId))
    .orderBy(desc(fraudScores.createdAt));
}

export async function getFraudScoresByTenant(tenantId: number, riskLevel?: "green" | "yellow" | "red") {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(fraudScores.tenantId, tenantId)];
  if (riskLevel) conditions.push(eq(fraudScores.riskLevel, riskLevel));
  return db
    .select()
    .from(fraudScores)
    .where(and(...conditions))
    .orderBy(desc(fraudScores.createdAt))
    .limit(100);
}

export async function upsertFraudScore(data: InsertFraudScore) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(fraudScores).values(data);
}

export async function updateFraudInvestigation(
  id: number,
  status: InsertFraudScore["investigationStatus"],
  notes: string,
  investigatorId: number
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(fraudScores)
    .set({ investigationStatus: status, investigatorNotes: notes, investigatorId })
    .where(eq(fraudScores.id, id));
}

// ─── Predictive Analyses ──────────────────────────────────────────────────────
export async function getPredictiveAnalysisByClaim(claimId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(predictiveAnalyses)
    .where(eq(predictiveAnalyses.claimId, claimId))
    .orderBy(desc(predictiveAnalyses.createdAt))
    .limit(1);
  return result[0];
}

export async function createPredictiveAnalysis(data: InsertPredictiveAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(predictiveAnalyses).values(data);
}

// ─── CSAT ─────────────────────────────────────────────────────────────────────
export async function getCsatByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(csatResponses)
    .where(eq(csatResponses.tenantId, tenantId))
    .orderBy(desc(csatResponses.createdAt));
}

export async function createCsatResponse(data: InsertCsatResponse) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(csatResponses).values(data);
}

// ─── Subscriptions ────────────────────────────────────────────────────────────
export async function getSubscriptionByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, tenantId))
    .limit(1);
  return result[0];
}

export async function upsertSubscription(data: InsertSubscription) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(subscriptions).values(data).onDuplicateKeyUpdate({
    set: {
      plan: data.plan,
      pillarEonicData: data.pillarEonicData,
      pillarRulesEngine: data.pillarRulesEngine,
      pillarFraudML: data.pillarFraudML,
      pillarPredictive: data.pillarPredictive,
      status: data.status,
      updatedAt: new Date(),
    },
  });
}

// ─── Analytics / KPIs Trend (Time Series) ───────────────────────────────────
export async function getKpisTrend(tenantId: number, months = 6) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      month: sql<string>`DATE_FORMAT(createdAt, '%Y-%m')`,
      totalClaims: count(),
      closedClaims: sql<number>`SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END)`,
      rejectedClaims: sql<number>`SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END)`,
      fraudRed: sql<number>`SUM(CASE WHEN fraudRisk = 'red' THEN 1 ELSE 0 END)`,
      totalClaimed: sql<number>`SUM(CAST(claimedAmount AS DECIMAL(15,2)))`,
      totalApproved: sql<number>`SUM(CAST(approvedAmount AS DECIMAL(15,2)))`,
      avgResolutionDays: sql<number>`AVG(CASE WHEN status = 'closed' THEN DATEDIFF(resolvedAt, createdAt) END)`,
    })
    .from(claims)
    .where(
      and(
        eq(claims.tenantId, tenantId),
        sql`createdAt >= DATE_SUB(NOW(), INTERVAL ${months} MONTH)`
      )
    )
    .groupBy(sql`DATE_FORMAT(createdAt, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(createdAt, '%Y-%m') ASC`);

  return rows.map((r) => ({
    month: r.month,
    totalClaims: Number(r.totalClaims ?? 0),
    closedClaims: Number(r.closedClaims ?? 0),
    rejectedClaims: Number(r.rejectedClaims ?? 0),
    fraudRed: Number(r.fraudRed ?? 0),
    totalClaimed: Number(r.totalClaimed ?? 0),
    totalApproved: Number(r.totalApproved ?? 0),
    avgResolutionDays: Number(r.avgResolutionDays ?? 0).toFixed(1),
    financialEfficiency: r.totalClaimed && Number(r.totalClaimed) > 0
      ? ((1 - Number(r.totalApproved ?? 0) / Number(r.totalClaimed)) * 100).toFixed(1)
      : "0.0",
  }));
}

// ─── Analytics / KPIs ────────────────────────────────────────────────────────
export async function getKpisByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return null;

  const [totalClaims] = await db
    .select({ count: count() })
    .from(claims)
    .where(eq(claims.tenantId, tenantId));

  const [openClaims] = await db
    .select({ count: count() })
    .from(claims)
    .where(and(eq(claims.tenantId, tenantId), sql`${claims.status} NOT IN ('closed', 'rejected')`));

  const [closedClaims] = await db
    .select({ count: count() })
    .from(claims)
    .where(and(eq(claims.tenantId, tenantId), eq(claims.status, "closed")));

  const [fraudStats] = await db
    .select({
      greenCount: sql<number>`SUM(CASE WHEN fraudRisk = 'green' THEN 1 ELSE 0 END)`,
      yellowCount: sql<number>`SUM(CASE WHEN fraudRisk = 'yellow' THEN 1 ELSE 0 END)`,
      redCount: sql<number>`SUM(CASE WHEN fraudRisk = 'red' THEN 1 ELSE 0 END)`,
    })
    .from(claims)
    .where(eq(claims.tenantId, tenantId));

  const [avgResolution] = await db
    .select({
      avgDays: sql<number>`AVG(DATEDIFF(resolvedAt, createdAt))`,
    })
    .from(claims)
    .where(and(eq(claims.tenantId, tenantId), eq(claims.status, "closed")));

  const [financialStats] = await db
    .select({
      totalClaimed: sql<number>`SUM(CAST(claimedAmount AS DECIMAL(15,2)))`,
      totalApproved: sql<number>`SUM(CAST(approvedAmount AS DECIMAL(15,2)))`,
    })
    .from(claims)
    .where(eq(claims.tenantId, tenantId));

  return {
    totalClaims: totalClaims?.count ?? 0,
    openClaims: openClaims?.count ?? 0,
    closedClaims: closedClaims?.count ?? 0,
    fraudStats: {
      green: Number(fraudStats?.greenCount ?? 0),
      yellow: Number(fraudStats?.yellowCount ?? 0),
      red: Number(fraudStats?.redCount ?? 0),
    },
    avgResolutionDays: Number(avgResolution?.avgDays ?? 0).toFixed(1),
    financialStats: {
      totalClaimed: Number(financialStats?.totalClaimed ?? 0),
      totalApproved: Number(financialStats?.totalApproved ?? 0),
    },
  };
}
