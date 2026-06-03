import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "mega-admin"]).default("user").notNull(),
  persona: mysqlEnum("persona", [
    "c-level",
    "gerente-sinistros",
    "analista-fraude",
    "cio",
    "perito",
  ]).default("perito"),
  tenantId: int("tenantId"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Tenants ─────────────────────────────────────────────────────────────────
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  logoUrl: text("logoUrl"),
  // White-label branding
  brandName: varchar("brandName", { length: 128 }),
  primaryColor: varchar("primaryColor", { length: 32 }),
  accentColor: varchar("accentColor", { length: 32 }),
  faviconUrl: text("faviconUrl"),
  supportEmail: varchar("supportEmail", { length: 320 }),
  supportPhone: varchar("supportPhone", { length: 32 }),
  // Pilares tecnológicos ativáveis
  pillarEonicData: boolean("pillarEonicData").default(false).notNull(),
  pillarRulesEngine: boolean("pillarRulesEngine").default(false).notNull(),
  pillarFraudML: boolean("pillarFraudML").default(false).notNull(),
  pillarPredictive: boolean("pillarPredictive").default(false).notNull(),
  subscriptionPlan: mysqlEnum("subscriptionPlan", ["starter", "professional", "enterprise"]).default("starter").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ─── Claims (Sinistros) ───────────────────────────────────────────────────────
export const claims = mysqlTable("claims", {
  id: int("id").autoincrement().primaryKey(),
  claimNumber: varchar("claimNumber", { length: 64 }).notNull().unique(),
  tenantId: int("tenantId").notNull(),
  policyNumber: varchar("policyNumber", { length: 64 }),
  insuredName: varchar("insuredName", { length: 256 }),
  insuredDocument: varchar("insuredDocument", { length: 32 }),
  claimType: mysqlEnum("claimType", [
    "auto",
    "property",
    "health",
    "life",
    "liability",
    "other",
  ]).notNull(),
  description: text("description"),
  incidentDate: timestamp("incidentDate"),
  reportedDate: timestamp("reportedDate").defaultNow(),
  // Ciclo de vida: ingestão → triagem → análise → resolução
  status: mysqlEnum("status", [
    "ingestion",
    "triage",
    "risk_analysis",
    "investigation",
    "resolution",
    "closed",
    "rejected",
  ]).default("ingestion").notNull(),
  claimedAmount: decimal("claimedAmount", { precision: 15, scale: 2 }),
  approvedAmount: decimal("approvedAmount", { precision: 15, scale: 2 }),
  suggestedAmount: decimal("suggestedAmount", { precision: 15, scale: 2 }),
  assignedTo: int("assignedTo"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium"),
  fraudRisk: mysqlEnum("fraudRisk", ["green", "yellow", "red"]).default("green"),
  fraudScore: decimal("fraudScore", { precision: 5, scale: 2 }),
  litigationProbability: decimal("litigationProbability", { precision: 5, scale: 2 }),
  predictedResolutionDays: int("predictedResolutionDays"),
  resolvedAt: timestamp("resolvedAt"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Claim = typeof claims.$inferSelect;
export type InsertClaim = typeof claims.$inferInsert;

// ─── Claim Events (Log do Ciclo de Vida) ─────────────────────────────────────
export const claimEvents = mysqlTable("claim_events", {
  id: int("id").autoincrement().primaryKey(),
  claimId: int("claimId").notNull(),
  tenantId: int("tenantId").notNull(),
  eventType: mysqlEnum("eventType", [
    "status_change",
    "rule_applied",
    "fraud_score_updated",
    "assignment_changed",
    "amount_updated",
    "comment_added",
    "document_added",
    "resolution",
  ]).notNull(),
  fromStatus: varchar("fromStatus", { length: 64 }),
  toStatus: varchar("toStatus", { length: 64 }),
  description: text("description"),
  performedBy: int("performedBy"),
  performedByName: varchar("performedByName", { length: 256 }),
  isAutomated: boolean("isAutomated").default(false),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClaimEvent = typeof claimEvents.$inferSelect;
export type InsertClaimEvent = typeof claimEvents.$inferInsert;

// ─── Rules (Motor de Regras No-Code) ─────────────────────────────────────────
export const rules = mysqlTable("rules", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  priority: int("priority").default(0),
  // Condições e ações em JSON (no-code)
  conditions: json("conditions").notNull(), // [{ field, operator, value }]
  action: mysqlEnum("action", [
    "auto_approve",
    "auto_reject",
    "escalate",
    "flag_fraud",
    "assign_to_perito",
    "request_documents",
    "notify",
  ]).notNull(),
  actionParams: json("actionParams"),
  triggerCount: int("triggerCount").default(0),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Rule = typeof rules.$inferSelect;
export type InsertRule = typeof rules.$inferInsert;

// ─── Rule Logs (Log de Explicabilidade) ──────────────────────────────────────
export const ruleLogs = mysqlTable("rule_logs", {
  id: int("id").autoincrement().primaryKey(),
  ruleId: int("ruleId").notNull(),
  claimId: int("claimId").notNull(),
  tenantId: int("tenantId").notNull(),
  ruleName: varchar("ruleName", { length: 256 }),
  conditionsEvaluated: json("conditionsEvaluated").notNull(),
  conditionsMet: boolean("conditionsMet").notNull(),
  actionTaken: varchar("actionTaken", { length: 64 }),
  explanation: text("explanation"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RuleLog = typeof ruleLogs.$inferSelect;
export type InsertRuleLog = typeof ruleLogs.$inferInsert;

// ─── Fraud Scores ─────────────────────────────────────────────────────────────
export const fraudScores = mysqlTable("fraud_scores", {
  id: int("id").autoincrement().primaryKey(),
  claimId: int("claimId").notNull(),
  tenantId: int("tenantId").notNull(),
  score: decimal("score", { precision: 5, scale: 2 }).notNull(),
  riskLevel: mysqlEnum("riskLevel", ["green", "yellow", "red"]).notNull(),
  factors: json("factors"), // [{ name, weight, value, contribution }]
  modelVersion: varchar("modelVersion", { length: 32 }),
  investigationStatus: mysqlEnum("investigationStatus", [
    "pending",
    "in_review",
    "cleared",
    "confirmed_fraud",
  ]).default("pending"),
  investigatorId: int("investigatorId"),
  investigatorNotes: text("investigatorNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FraudScore = typeof fraudScores.$inferSelect;
export type InsertFraudScore = typeof fraudScores.$inferInsert;

// ─── Predictive Analyses ──────────────────────────────────────────────────────
export const predictiveAnalyses = mysqlTable("predictive_analyses", {
  id: int("id").autoincrement().primaryKey(),
  claimId: int("claimId").notNull(),
  tenantId: int("tenantId").notNull(),
  suggestedAmount: decimal("suggestedAmount", { precision: 15, scale: 2 }),
  predictedFinalCost: decimal("predictedFinalCost", { precision: 15, scale: 2 }),
  litigationProbability: decimal("litigationProbability", { precision: 5, scale: 2 }),
  predictedResolutionDays: int("predictedResolutionDays"),
  confidenceScore: decimal("confidenceScore", { precision: 5, scale: 2 }),
  similarCasesCount: int("similarCasesCount"),
  analysisFactors: json("analysisFactors"),
  modelVersion: varchar("modelVersion", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PredictiveAnalysis = typeof predictiveAnalyses.$inferSelect;
export type InsertPredictiveAnalysis = typeof predictiveAnalyses.$inferInsert;

// ─── CSAT Responses ───────────────────────────────────────────────────────────
export const csatResponses = mysqlTable("csat_responses", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId"),
  persona: mysqlEnum("persona", [
    "c-level",
    "gerente-sinistros",
    "analista-fraude",
    "cio",
    "perito",
  ]).notNull(),
  score: int("score").notNull(), // 1-10
  npsScore: int("npsScore"), // 0-10
  feedback: text("feedback"),
  claimId: int("claimId"),
  triggerType: mysqlEnum("triggerType", [
    "post_claim_closure",
    "scheduled_monthly",
    "scheduled_quarterly",
    "scheduled_semiannual",
    "manual",
  ]).default("manual"),
  responses: json("responses"), // Respostas estruturadas por pergunta
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CsatResponse = typeof csatResponses.$inferSelect;
export type InsertCsatResponse = typeof csatResponses.$inferInsert;

// ─── Subscriptions ────────────────────────────────────────────────────────────
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().unique(),
  plan: mysqlEnum("plan", ["starter", "professional", "enterprise"]).default("starter").notNull(),
  pillarEonicData: boolean("pillarEonicData").default(false).notNull(),
  pillarRulesEngine: boolean("pillarRulesEngine").default(false).notNull(),
  pillarFraudML: boolean("pillarFraudML").default(false).notNull(),
  pillarPredictive: boolean("pillarPredictive").default(false).notNull(),
  maxClaims: int("maxClaims").default(100),
  maxUsers: int("maxUsers").default(5),
  billingCycle: mysqlEnum("billingCycle", ["monthly", "annual"]).default("monthly"),
  status: mysqlEnum("status", ["active", "suspended", "cancelled", "trial"]).default("trial").notNull(),
  trialEndsAt: timestamp("trialEndsAt"),
  currentPeriodStart: timestamp("currentPeriodStart").defaultNow(),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// ─── Audit Logs (Mega-Admin) ────────────────────────────────────────────────────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  // Who performed the action
  adminId: int("adminId").notNull(),
  adminName: varchar("adminName", { length: 256 }),
  adminEmail: varchar("adminEmail", { length: 320 }),
  // What action was performed
  action: varchar("action", { length: 128 }).notNull(), // e.g. "tenant.suspend", "user.delete"
  resource: varchar("resource", { length: 64 }).notNull(), // e.g. "tenant", "user", "subscription"
  resourceId: int("resourceId"),
  resourceName: varchar("resourceName", { length: 256 }),
  // Context
  targetTenantId: int("targetTenantId"),
  targetTenantName: varchar("targetTenantName", { length: 256 }),
  // Before/after state for reversibility
  previousState: json("previousState"),
  newState: json("newState"),
  // Request metadata for security
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("info").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
