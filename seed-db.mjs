/**
 * EonSure - Seed Script
 * Populates the database with realistic sample data for demonstration.
 *
 * Usage: node seed-db.mjs
 *
 * What it creates:
 *  - 1 tenant (Seguradora Atlântica)
 *  - 1 subscription (enterprise, all pillars active)
 *  - 5 rules (no-code rules engine)
 *  - 25 claims across all statuses and types
 *  - claim_events for each claim (lifecycle log)
 *  - fraud_scores for all claims
 *  - predictive_analyses for closed/resolved claims
 *  - csat_responses across all personas
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("❌ DATABASE_URL not set in environment.");
  process.exit(1);
}

const conn = await mysql.createConnection(DB_URL);
console.log("✅ Connected to database.");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function formatDate(d) {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

// ─── 1. Tenant ────────────────────────────────────────────────────────────────

console.log("\n📦 Seeding tenant...");

const [existingTenants] = await conn.execute(
  "SELECT id FROM tenants WHERE slug = 'seguradora-atlantica' LIMIT 1"
);

let tenantId;
if (existingTenants.length > 0) {
  tenantId = existingTenants[0].id;
  console.log(`   ↳ Tenant already exists (id=${tenantId}), skipping.`);
} else {
  const [res] = await conn.execute(
    `INSERT INTO tenants (name, slug, pillarEonicData, pillarRulesEngine, pillarFraudML, pillarPredictive, subscriptionPlan, isActive, createdAt, updatedAt)
     VALUES (?, ?, 1, 1, 1, 1, 'enterprise', 1, NOW(), NOW())`,
    ["Seguradora Atlântica S.A.", "seguradora-atlantica"]
  );
  tenantId = res.insertId;
  console.log(`   ↳ Created tenant id=${tenantId}`);
}

// ─── 2. Subscription ──────────────────────────────────────────────────────────

console.log("\n💳 Seeding subscription...");

const [existingSubs] = await conn.execute(
  "SELECT id FROM subscriptions WHERE tenantId = ? LIMIT 1",
  [tenantId]
);

if (existingSubs.length > 0) {
  console.log("   ↳ Subscription already exists, skipping.");
} else {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30);
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await conn.execute(
    `INSERT INTO subscriptions
      (tenantId, plan, pillarEonicData, pillarRulesEngine, pillarFraudML, pillarPredictive,
       maxClaims, maxUsers, billingCycle, status, trialEndsAt, currentPeriodStart, currentPeriodEnd, createdAt, updatedAt)
     VALUES (?, 'enterprise', 1, 1, 1, 1, 1000, 50, 'annual', 'active', ?, NOW(), ?, NOW(), NOW())`,
    [tenantId, formatDate(trialEnd), formatDate(periodEnd)]
  );
  console.log("   ↳ Created enterprise subscription.");
}

// ─── 3. Rules ─────────────────────────────────────────────────────────────────

console.log("\n⚙️  Seeding rules...");

const [existingRules] = await conn.execute(
  "SELECT COUNT(*) as cnt FROM rules WHERE tenantId = ?",
  [tenantId]
);

if (existingRules[0].cnt > 0) {
  console.log("   ↳ Rules already exist, skipping.");
} else {
  const rulesData = [
    {
      name: "Alto Valor → Escalação Automática",
      description: "Sinistros acima de R$ 200.000 são automaticamente escalados para análise sênior.",
      conditions: JSON.stringify([{ field: "claimedAmount", operator: "greater_than", value: "200000" }]),
      action: "escalate",
      priority: 10,
    },
    {
      name: "Score de Fraude Alto → Investigação",
      description: "Sinistros com score de fraude acima de 70 são sinalizados para investigação.",
      conditions: JSON.stringify([{ field: "fraudScore", operator: "greater_than", value: "70" }]),
      action: "flag_fraud",
      priority: 5,
    },
    {
      name: "Sinistro de Saúde → Perito Médico",
      description: "Todos os sinistros de saúde são automaticamente atribuídos a um perito médico.",
      conditions: JSON.stringify([{ field: "claimType", operator: "equals", value: "health" }]),
      action: "assign_to_perito",
      priority: 20,
    },
    {
      name: "Baixo Valor Auto → Aprovação Automática",
      description: "Sinistros de automóvel abaixo de R$ 5.000 com risco verde são aprovados automaticamente.",
      conditions: JSON.stringify([
        { field: "claimType", operator: "equals", value: "auto" },
        { field: "claimedAmount", operator: "less_than", value: "5000" },
        { field: "fraudRisk", operator: "equals", value: "green" },
      ]),
      action: "auto_approve",
      priority: 30,
    },
    {
      name: "Documentação Incompleta → Solicitar Docs",
      description: "Sinistros de propriedade sem documentação disparam solicitação automática.",
      conditions: JSON.stringify([{ field: "claimType", operator: "equals", value: "property" }]),
      action: "request_documents",
      priority: 25,
    },
  ];

  for (const rule of rulesData) {
    await conn.execute(
      `INSERT INTO rules (tenantId, name, description, isActive, priority, conditions, action, triggerCount, createdAt, updatedAt)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?, NOW(), NOW())`,
      [tenantId, rule.name, rule.description, rule.priority, rule.conditions, rule.action, rand(0, 48)]
    );
  }
  console.log(`   ↳ Created ${rulesData.length} rules.`);
}

// ─── 4. Claims ────────────────────────────────────────────────────────────────

console.log("\n📋 Seeding claims...");

const [existingClaims] = await conn.execute(
  "SELECT COUNT(*) as cnt FROM claims WHERE tenantId = ?",
  [tenantId]
);

if (existingClaims[0].cnt >= 20) {
  console.log("   ↳ Claims already seeded, skipping.");
  await conn.end();
  console.log("\n✅ Seed complete (no changes needed).");
  process.exit(0);
}

const claimTypes = ["auto", "property", "health", "life", "liability", "other"];
const statuses = ["ingestion", "triage", "risk_analysis", "investigation", "resolution", "closed", "rejected"];
const priorities = ["low", "medium", "high", "critical"];
const fraudRisks = ["green", "green", "green", "yellow", "yellow", "red"]; // weighted toward green

const insuredNames = [
  "Mariana Costa Silva", "João Pedro Almeida", "Fernanda Oliveira Santos",
  "Carlos Eduardo Mendes", "Ana Beatriz Ferreira", "Roberto Souza Lima",
  "Patrícia Nascimento", "Lucas Rodrigues Carvalho", "Juliana Martins Pereira",
  "Thiago Barbosa Nunes", "Camila Araújo Dias", "Felipe Gomes Ribeiro",
  "Larissa Teixeira Moura", "André Vieira Cunha", "Beatriz Lopes Cardoso",
  "Gustavo Pinto Rocha", "Vanessa Correia Freitas", "Diego Monteiro Azevedo",
  "Renata Cavalcanti Borges", "Henrique Duarte Fonseca", "Simone Melo Tavares",
  "Marcelo Batista Pires", "Cristina Andrade Vasconcelos", "Paulo Sérgio Ramos",
  "Aline Figueiredo Sousa",
];

const descriptions = {
  auto: [
    "Colisão traseira em rodovia estadual durante chuva forte. Veículo com danos na parte traseira.",
    "Abalroamento em cruzamento sem semáforo. Terceiro envolvido sem habilitação.",
    "Capotamento em curva molhada. Airbags acionados. Veículo considerado perda total.",
    "Furto do veículo em estacionamento de shopping. Câmeras registraram o ocorrido.",
    "Incêndio no motor após superaquecimento. Danos totais ao compartimento do motor.",
  ],
  property: [
    "Incêndio parcial em residência causado por curto-circuito na fiação elétrica.",
    "Alagamento de imóvel comercial durante chuvas de verão. Danos ao estoque.",
    "Roubo à residência com arrombamento. Eletrônicos e joias subtraídos.",
    "Desabamento de muro de arrimo após chuvas intensas. Danos estruturais.",
    "Explosão de botijão de gás em cozinha. Danos à estrutura e mobiliário.",
  ],
  health: [
    "Internação hospitalar de emergência por infarto agudo do miocárdio.",
    "Cirurgia ortopédica de urgência após acidente de trabalho.",
    "Tratamento oncológico — quimioterapia e radioterapia por 6 meses.",
    "Acidente vascular cerebral com sequelas motoras. Reabilitação necessária.",
    "Fratura exposta de fêmur em acidente doméstico. Cirurgia e fisioterapia.",
  ],
  life: [
    "Falecimento por causas naturais. Beneficiários: cônjuge e dois filhos.",
    "Morte acidental em acidente de trânsito. Cobertura de morte acidental acionada.",
    "Invalidez permanente total por acidente de trabalho.",
    "Diagnóstico de doença grave — cobertura de doenças graves acionada.",
    "Falecimento por doença preexistente. Análise de carência em andamento.",
  ],
  liability: [
    "Dano a terceiro causado por queda de objeto de obra em andamento.",
    "Acidente em estabelecimento comercial — cliente fraturou tornozelo.",
    "Vazamento de produto químico causou danos ao imóvel vizinho.",
    "Responsabilidade civil por erro médico em clínica segurada.",
    "Dano ambiental causado por descarte irregular de resíduos.",
  ],
  other: [
    "Sinistro de transporte de carga — mercadoria avariada durante transporte.",
    "Seguro garantia — inadimplência de contratado em obra pública.",
    "Seguro rural — perda de safra por seca prolongada.",
    "Seguro de equipamentos — dano a maquinário industrial por sobrecarga.",
    "Seguro de eventos — cancelamento de evento por força maior.",
  ],
};

const createdClaimIds = [];

for (let i = 0; i < 25; i++) {
  const claimType = randItem(claimTypes);
  const status = randItem(statuses);
  const fraudRisk = randItem(fraudRisks);
  const priority = randItem(priorities);
  const insuredName = insuredNames[i];
  const description = randItem(descriptions[claimType]);

  const claimedAmount = randFloat(3000, 450000);
  const approvedAmount = status === "closed"
    ? randFloat(claimedAmount * 0.4, claimedAmount * 0.95)
    : null;
  const fraudScore = fraudRisk === "red" ? randFloat(70, 98) :
    fraudRisk === "yellow" ? randFloat(40, 69) : randFloat(5, 39);

  const daysBack = rand(1, 180);
  const incidentDate = daysAgo(daysBack + rand(1, 30));
  const createdAt = daysAgo(daysBack);
  const resolvedAt = (status === "closed" || status === "rejected")
    ? daysAgo(rand(0, daysBack - 1))
    : null;

  const year = createdAt.getFullYear();
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const claimNumber = `CLM-${year}-${suffix}`;
  const policyNumber = `POL-${rand(100000, 999999)}`;

  const [claimRes] = await conn.execute(
    `INSERT INTO claims
      (claimNumber, tenantId, policyNumber, insuredName, claimType, description,
       incidentDate, reportedDate, status, claimedAmount, approvedAmount,
       fraudRisk, fraudScore, priority, litigationProbability, predictedResolutionDays,
       resolvedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      claimNumber, tenantId, policyNumber, insuredName, claimType, description,
      formatDate(incidentDate), formatDate(createdAt),
      status,
      claimedAmount.toFixed(2),
      approvedAmount ? approvedAmount.toFixed(2) : null,
      fraudRisk, fraudScore.toFixed(2), priority,
      randFloat(0.02, 0.65).toFixed(2),
      rand(5, 90),
      resolvedAt ? formatDate(resolvedAt) : null,
      formatDate(createdAt), formatDate(createdAt),
    ]
  );

  const claimId = claimRes.insertId;
  createdClaimIds.push({ claimId, status, fraudRisk, fraudScore, claimedAmount, approvedAmount, createdAt, resolvedAt, claimType });
}

console.log(`   ↳ Created ${createdClaimIds.length} claims.`);

// ─── 5. Claim Events ──────────────────────────────────────────────────────────

console.log("\n📅 Seeding claim events...");

const STATUS_SEQUENCE = ["ingestion", "triage", "risk_analysis", "investigation", "resolution", "closed"];
const actorNames = ["Sistema EonSure", "Gerente Operacional", "Analista de Fraude", "Perito Técnico", "Supervisor Sênior"];
const eventDescriptions = {
  ingestion: "Sinistro registrado no sistema via portal do segurado.",
  triage: "Triagem automática concluída. Documentação inicial verificada.",
  risk_analysis: "Análise de risco executada. Score de fraude calculado pelo modelo ML.",
  investigation: "Sinistro encaminhado para investigação detalhada.",
  resolution: "Proposta de resolução gerada com base na análise preditiva.",
  closed: "Sinistro encerrado. Indenização processada e paga ao segurado.",
  rejected: "Sinistro rejeitado após análise. Motivo: inconsistências na documentação.",
};

let eventCount = 0;
for (const { claimId, status, createdAt } of createdClaimIds) {
  const statusIdx = STATUS_SEQUENCE.indexOf(status);
  const stepsToLog = statusIdx === -1 ? 1 : statusIdx + 1;

  for (let step = 0; step < stepsToLog; step++) {
    const fromStatus = step === 0 ? null : STATUS_SEQUENCE[step - 1];
    const toStatus = STATUS_SEQUENCE[step] ?? status;
    const eventDate = new Date(createdAt);
    eventDate.setHours(eventDate.getHours() + step * rand(2, 48));

    await conn.execute(
      `INSERT INTO claim_events
        (claimId, tenantId, eventType, fromStatus, toStatus, description,
         performedByName, isAutomated, createdAt)
       VALUES (?, ?, 'status_change', ?, ?, ?, ?, ?, ?)`,
      [
        claimId, tenantId,
        fromStatus, toStatus,
        eventDescriptions[toStatus] ?? "Status atualizado.",
        step === 0 ? "Sistema EonSure" : randItem(actorNames),
        step === 0 ? 1 : 0,
        formatDate(eventDate),
      ]
    );
    eventCount++;
  }
}

console.log(`   ↳ Created ${eventCount} claim events.`);

// ─── 6. Fraud Scores ──────────────────────────────────────────────────────────

console.log("\n🔍 Seeding fraud scores...");

const fraudFactorsByRisk = {
  green: [
    [{ name: "Histórico do segurado", weight: 0.3, value: "Sem ocorrências anteriores", contribution: -15 }],
    [{ name: "Valor do sinistro", weight: 0.4, value: "Dentro da média histórica", contribution: -10 }],
    [{ name: "Documentação", weight: 0.3, value: "Completa e consistente", contribution: -12 }],
  ],
  yellow: [
    [
      { name: "Frequência de sinistros", weight: 0.35, value: "2 sinistros em 12 meses", contribution: 25 },
      { name: "Valor acima da média", weight: 0.25, value: "35% acima da média do tipo", contribution: 18 },
    ],
    [
      { name: "Inconsistência de datas", weight: 0.4, value: "Data do incidente inconsistente", contribution: 30 },
      { name: "Testemunhas", weight: 0.2, value: "Apenas uma testemunha", contribution: 12 },
    ],
  ],
  red: [
    [
      { name: "Histórico de fraudes", weight: 0.5, value: "Sinistro anterior rejeitado por fraude", contribution: 45 },
      { name: "Valor muito acima da média", weight: 0.3, value: "180% acima da média do tipo", contribution: 28 },
      { name: "Documentação suspeita", weight: 0.2, value: "Laudos com inconsistências técnicas", contribution: 22 },
    ],
    [
      { name: "Rede de fraude detectada", weight: 0.6, value: "CPF associado a 4 sinistros em 6 meses", contribution: 55 },
      { name: "Localização suspeita", weight: 0.2, value: "Endereço de risco elevado", contribution: 18 },
      { name: "Padrão de comportamento", weight: 0.2, value: "Sinistro reportado 1 dia após contratação", contribution: 20 },
    ],
  ],
};

const investigationStatuses = {
  green: ["pending", "cleared"],
  yellow: ["pending", "in_review"],
  red: ["in_review", "confirmed_fraud", "pending"],
};

let fraudCount = 0;
for (const { claimId, fraudRisk, fraudScore, createdAt } of createdClaimIds) {
  const factors = randItem(fraudFactorsByRisk[fraudRisk]);
  const invStatus = randItem(investigationStatuses[fraudRisk]);
  const scoreDate = new Date(createdAt);
  scoreDate.setHours(scoreDate.getHours() + rand(1, 12));

  await conn.execute(
    `INSERT INTO fraud_scores
      (claimId, tenantId, score, riskLevel, factors, modelVersion,
       investigationStatus, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 'eon-fraud-v2.1', ?, ?, ?)`,
    [
      claimId, tenantId,
      fraudScore.toFixed(2), fraudRisk,
      JSON.stringify(factors),
      invStatus,
      formatDate(scoreDate), formatDate(scoreDate),
    ]
  );
  fraudCount++;
}

console.log(`   ↳ Created ${fraudCount} fraud scores.`);

// ─── 7. Predictive Analyses ───────────────────────────────────────────────────

console.log("\n🤖 Seeding predictive analyses...");

const analysisFactorTemplates = [
  [
    { factor: "Histórico de sinistros similares", impact: "positive", weight: 0.35 },
    { factor: "Perfil do segurado", impact: "positive", weight: 0.25 },
    { factor: "Tipo de cobertura", impact: "neutral", weight: 0.20 },
    { factor: "Região geográfica", impact: "negative", weight: 0.20 },
  ],
  [
    { factor: "Valor médio do tipo de sinistro", impact: "positive", weight: 0.40 },
    { factor: "Tempo desde a contratação", impact: "positive", weight: 0.30 },
    { factor: "Score de crédito do segurado", impact: "positive", weight: 0.30 },
  ],
];

let analysisCount = 0;
const eligibleStatuses = ["risk_analysis", "investigation", "resolution", "closed"];
for (const { claimId, status, claimedAmount, createdAt } of createdClaimIds) {
  if (!eligibleStatuses.includes(status)) continue;

  const suggested = claimedAmount * randFloat(0.55, 0.90);
  const predicted = suggested * randFloat(0.95, 1.10);
  const litigation = randFloat(0.02, 0.65);
  const tmrDays = rand(8, 75);
  const confidence = randFloat(0.72, 0.96);
  const similarCases = rand(12, 340);
  const analysisDate = new Date(createdAt);
  analysisDate.setHours(analysisDate.getHours() + rand(6, 48));

  await conn.execute(
    `INSERT INTO predictive_analyses
      (claimId, tenantId, suggestedAmount, predictedFinalCost, litigationProbability,
       predictedResolutionDays, confidenceScore, similarCasesCount, analysisFactors,
       modelVersion, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'eon-predict-v1.4', ?)`,
    [
      claimId, tenantId,
      suggested.toFixed(2), predicted.toFixed(2),
      litigation.toFixed(2), tmrDays,
      confidence.toFixed(2), similarCases,
      JSON.stringify(randItem(analysisFactorTemplates)),
      formatDate(analysisDate),
    ]
  );
  analysisCount++;
}

console.log(`   ↳ Created ${analysisCount} predictive analyses.`);

// ─── 8. CSAT Responses ────────────────────────────────────────────────────────

console.log("\n⭐ Seeding CSAT responses...");

const [existingCsat] = await conn.execute(
  "SELECT COUNT(*) as cnt FROM csat_responses WHERE tenantId = ?",
  [tenantId]
);

if (existingCsat[0].cnt > 0) {
  console.log("   ↳ CSAT responses already exist, skipping.");
} else {
  const personas = ["c-level", "gerente-sinistros", "analista-fraude", "cio", "perito"];
  const triggerTypes = ["post_claim_closure", "scheduled_monthly", "scheduled_quarterly", "manual"];
  const feedbacks = [
    "A plataforma melhorou significativamente nossa eficiência operacional.",
    "O motor de regras é muito intuitivo. Conseguimos configurar sem suporte técnico.",
    "Os alertas de fraude estão bem calibrados. Reduzimos falsos positivos em 30%.",
    "A análise preditiva nos ajuda a priorizar os sinistros mais complexos.",
    "Interface moderna e responsiva. Equipe adaptou rapidamente.",
    "Precisamos de mais relatórios customizáveis para o board.",
    "A integração com nosso sistema legado foi tranquila.",
    "O suporte ao cliente é excelente e responsivo.",
  ];

  let csatCount = 0;
  for (let i = 0; i < 30; i++) {
    const persona = randItem(personas);
    const score = rand(3, 10);
    const npsScore = rand(6, 10);
    const responseDate = daysAgo(rand(1, 90));

    await conn.execute(
      `INSERT INTO csat_responses
        (tenantId, persona, score, npsScore, feedback, triggerType, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId, persona, score, npsScore,
        Math.random() > 0.3 ? randItem(feedbacks) : null,
        randItem(triggerTypes),
        formatDate(responseDate),
      ]
    );
    csatCount++;
  }
  console.log(`   ↳ Created ${csatCount} CSAT responses.`);
}

// ─── Done ─────────────────────────────────────────────────────────────────────

await conn.end();

console.log(`
╔══════════════════════════════════════════════════════╗
║          ✅ EonSure Seed Complete!                   ║
╠══════════════════════════════════════════════════════╣
║  Tenant:    Seguradora Atlântica S.A.                ║
║  Claims:    25 (all statuses, types, risk levels)    ║
║  Events:    lifecycle log per claim                  ║
║  Fraud:     25 scores (green/yellow/red)             ║
║  Analytics: predictive analyses for eligible claims  ║
║  CSAT:      30 responses across all personas         ║
║  Rules:     5 no-code rules                          ║
╚══════════════════════════════════════════════════════╝
`);
