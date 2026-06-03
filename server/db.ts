import { eq, and, desc, count, avg, sql, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users, tenants, claims, claimEvents, rules, ruleLogs,
  fraudScores, predictiveAnalyses, csatResponses, subscriptions, auditLogs,
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

export async function getFirstTenant() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tenants).orderBy(tenants.id).limit(1);
  return result[0];
}

/**
 * Returns the demo tenant (slug = 'seguradora-atlantica' or id = 1).
 * Used for auto-associating new users that have no tenant yet.
 */
export async function getDemoTenant() {
  const db = await getDb();
  if (!db) return undefined;
  // Try by known demo slug first, fall back to id=1, then first tenant
  const bySlug = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, "seguradora-atlantica"))
    .limit(1);
  if (bySlug[0]) return bySlug[0];
  const byId = await db.select().from(tenants).where(eq(tenants.id, 1)).limit(1);
  if (byId[0]) return byId[0];
  // Last resort: first available tenant
  const first = await db.select().from(tenants).orderBy(tenants.id).limit(1);
  return first[0];
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
  if (status) {
    const validStatuses = ["ingestion", "triage", "risk_analysis", "investigation", "resolution", "closed", "rejected"] as const;
    type ClaimStatus = typeof validStatuses[number];
    if (validStatuses.includes(status as ClaimStatus)) {
      conditions.push(eq(claims.status, status as ClaimStatus));
    }
  }
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
  if (!db) return null;
  const result = await db
    .select()
    .from(predictiveAnalyses)
    .where(eq(predictiveAnalyses.claimId, claimId))
    .orderBy(desc(predictiveAnalyses.createdAt))
    .limit(1);
  return result[0] ?? null;
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

  // Count per lifecycle status
  const [ingestionCount] = await db.select({ count: count() }).from(claims).where(and(eq(claims.tenantId, tenantId), eq(claims.status, "ingestion")));
  const [triageCount] = await db.select({ count: count() }).from(claims).where(and(eq(claims.tenantId, tenantId), eq(claims.status, "triage")));
  const [riskCount] = await db.select({ count: count() }).from(claims).where(and(eq(claims.tenantId, tenantId), eq(claims.status, "risk_analysis")));
  const [resolutionCount] = await db.select({ count: count() }).from(claims).where(and(eq(claims.tenantId, tenantId), eq(claims.status, "resolution")));
  const [rejectedCount] = await db.select({ count: count() }).from(claims).where(and(eq(claims.tenantId, tenantId), eq(claims.status, "rejected")));

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
    statusBreakdown: {
      ingestion: ingestionCount?.count ?? 0,
      triage: triageCount?.count ?? 0,
      risk_analysis: riskCount?.count ?? 0,
      resolution: resolutionCount?.count ?? 0,
      closed: closedClaims?.count ?? 0,
      rejected: rejectedCount?.count ?? 0,
    },
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

// Lightweight status summary — available to all personas with claims:read
export async function getClaimsStatusSummary(tenantId: number) {
  const db = await getDb();
  if (!db) return { ingestion: 0, triage: 0, risk_analysis: 0, resolution: 0, closed: 0, rejected: 0 };

  const statuses = ["ingestion", "triage", "risk_analysis", "resolution", "closed", "rejected"] as const;
  const results = await Promise.all(
    statuses.map((s) =>
      db.select({ count: count() }).from(claims).where(and(eq(claims.tenantId, tenantId), eq(claims.status, s)))
        .then(([r]) => ({ status: s, count: r?.count ?? 0 }))
    )
  );
  return Object.fromEntries(results.map((r) => [r.status, r.count])) as Record<typeof statuses[number], number>;
}

// ─── Mega-Admin Queries ───────────────────────────────────────────────────────

/** Lista todos os tenants com contagem de usuários e sinistros */
export async function getAllTenantsWithStats() {
  const db = await getDb();
  if (!db) return [];

  const allTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt));

  const stats = await Promise.all(
    allTenants.map(async (t) => {
      const [userCount] = await db.select({ count: count() }).from(users).where(eq(users.tenantId, t.id));
      const [claimCount] = await db.select({ count: count() }).from(claims).where(eq(claims.tenantId, t.id));
      return {
        ...t,
        userCount: userCount?.count ?? 0,
        claimCount: claimCount?.count ?? 0,
      };
    })
  );
  return stats;
}

/** Retorna um tenant com todos os detalhes: usuários, assinatura e métricas */
export async function getTenantFullDetail(tenantId: number) {
  const db = await getDb();
  if (!db) return null;

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) return null;

  const tenantUsers = await db.select().from(users).where(eq(users.tenantId, tenantId)).orderBy(desc(users.lastSignedIn));
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)).limit(1);
  const [claimCount] = await db.select({ count: count() }).from(claims).where(eq(claims.tenantId, tenantId));
  const [openCount] = await db.select({ count: count() }).from(claims).where(and(eq(claims.tenantId, tenantId), eq(claims.status, "ingestion")));

  return {
    tenant,
    users: tenantUsers,
    subscription: sub ?? null,
    stats: {
      totalClaims: claimCount?.count ?? 0,
      openClaims: openCount?.count ?? 0,
    },
  };
}

/** Atualiza dados de cadastro de um tenant (mega-admin) */
export async function updateTenantByAdmin(tenantId: number, data: Partial<{
  name: string;
  isActive: boolean;
  subscriptionPlan: "starter" | "professional" | "enterprise";
  supportEmail: string;
  supportPhone: string;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tenants).set({ ...data, updatedAt: new Date() }).where(eq(tenants.id, tenantId));
}

/** Atualiza a assinatura de um tenant (mega-admin) */
export async function updateSubscriptionByAdmin(tenantId: number, data: Partial<{
  plan: "starter" | "professional" | "enterprise";
  status: "active" | "suspended" | "cancelled" | "trial";
  maxClaims: number;
  maxUsers: number;
  billingCycle: "monthly" | "annual";
  pillarEonicData: boolean;
  pillarRulesEngine: boolean;
  pillarFraudML: boolean;
  pillarPredictive: boolean;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set({ ...data, updatedAt: new Date() }).where(eq(subscriptions.tenantId, tenantId));
}

/** Atualiza role/persona de um usuário (mega-admin) */
export async function updateUserByAdmin(userId: number, data: Partial<{
  name: string;
  role: "user" | "admin" | "mega-admin";
  persona: "c-level" | "gerente-sinistros" | "analista-fraude" | "cio" | "perito";
  tenantId: number | null;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId));
}

/** Remove um usuário de um tenant (soft delete via tenantId = null) */
export async function removeUserFromTenant(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ tenantId: null, updatedAt: new Date() }).where(eq(users.id, userId));
}

/** Registra uma ação no audit log */
export async function createAuditLog(data: {
  adminId: number;
  adminName?: string;
  adminEmail?: string;
  action: string;
  resource: string;
  resourceId?: number;
  resourceName?: string;
  targetTenantId?: number;
  targetTenantName?: string;
  previousState?: unknown;
  newState?: unknown;
  ipAddress?: string;
  userAgent?: string;
  severity?: "info" | "warning" | "critical";
  notes?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({
    adminId: data.adminId,
    adminName: data.adminName,
    adminEmail: data.adminEmail,
    action: data.action,
    resource: data.resource,
    resourceId: data.resourceId,
    resourceName: data.resourceName,
    targetTenantId: data.targetTenantId,
    targetTenantName: data.targetTenantName,
    previousState: data.previousState as Record<string, unknown> | null,
    newState: data.newState as Record<string, unknown> | null,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    severity: data.severity ?? "info",
    notes: data.notes,
  });
}

/** Lista o audit log com paginação */
export async function getAuditLogs(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
}

/** Métricas globais da plataforma */
export async function getPlatformMetrics() {
  const db = await getDb();
  if (!db) return { totalTenants: 0, activeTenants: 0, totalUsers: 0, totalClaims: 0, openClaims: 0 };

  const [totalTenants] = await db.select({ count: count() }).from(tenants);
  const [activeTenants] = await db.select({ count: count() }).from(tenants).where(eq(tenants.isActive, true));
  const [totalUsers] = await db.select({ count: count() }).from(users);
  const [totalClaims] = await db.select({ count: count() }).from(claims);
  const [openClaims] = await db.select({ count: count() }).from(claims).where(eq(claims.status, "ingestion"));

  return {
    totalTenants: totalTenants?.count ?? 0,
    activeTenants: activeTenants?.count ?? 0,
    totalUsers: totalUsers?.count ?? 0,
    totalClaims: totalClaims?.count ?? 0,
    openClaims: openClaims?.count ?? 0,
  };
}
