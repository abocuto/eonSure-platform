/**
 * EonSure AI Service
 *
 * Integrates OpenAI LLM for real intelligent analysis of claims.
 * Replaces the deterministic scoring logic with genuine AI-powered
 * fraud detection and predictive analytics.
 *
 * Falls back gracefully to heuristic scoring if the API is unavailable.
 */

import OpenAI from "openai";

// Lazy initialization — avoids crash at startup when OPENAI_API_KEY is not set.
// Falls back to heuristic scoring in all methods if client is unavailable.
let _client: OpenAI | null = null;
function getClient(): OpenAI | null {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    });
  } catch {
    return null;
  }
  return _client;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface FraudAnalysisInput {
  claimType: string;
  description: string | null;
  claimedAmount: number;
  insuredName: string;
  policyNumber: string | null;
  incidentDate: string | null;
}

export interface FraudAnalysisResult {
  score: number;           // 0–100
  riskLevel: "green" | "yellow" | "red";
  factors: Array<{ name: string; weight: number; contribution: number }>;
  reasoning: string;
  modelVersion: string;
}

export interface PredictionInput {
  claimType: string;
  description: string | null;
  claimedAmount: number;
  fraudScore: number;
  riskLevel: string;
}

export interface PredictionResult {
  suggestedAmount: number;
  predictedFinalCost: number;
  litigationProbability: number;
  predictedResolutionDays: number;
  confidenceScore: number;
  reasoning: string;
  analysisFactors: Array<{ name: string; impact: string; direction: string }>;
}

// ─── Fraud Analysis via LLM ───────────────────────────────────────────────────
export async function analyzeFraudWithAI(input: FraudAnalysisInput): Promise<FraudAnalysisResult> {
  const prompt = `Você é um especialista em detecção de fraude de seguros da EonSure.
Analise o seguinte sinistro e retorne um JSON com a avaliação de risco de fraude.

Dados do sinistro:
- Tipo: ${input.claimType}
- Segurado: ${input.insuredName}
- Apólice: ${input.policyNumber ?? "não informada"}
- Valor reclamado: R$ ${input.claimedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Data do incidente: ${input.incidentDate ?? "não informada"}
- Descrição: ${input.description ?? "não fornecida"}

Retorne APENAS um JSON válido no seguinte formato (sem markdown, sem texto adicional):
{
  "score": <número de 0 a 100 representando o risco de fraude>,
  "riskLevel": <"green" se score < 40, "yellow" se 40-69, "red" se >= 70>,
  "factors": [
    {"name": "<nome do fator>", "weight": <peso de 0 a 1>, "contribution": <contribuição de 0 a 1>},
    ...
  ],
  "reasoning": "<explicação concisa em português de até 2 frases sobre os principais indicadores>"
}

Considere: valor do sinistro vs. média do setor, coerência da descrição, padrões suspeitos, data do incidente, tipo de cobertura.`;

  const client = getClient();
  if (!client) {
    console.warn("[AIService] No OpenAI API key configured, using heuristic fallback.");
    return heuristicFraudAnalysis(input);
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 600,
    });

    const content = response.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(content) as Omit<FraudAnalysisResult, "modelVersion">;

    // Validate and clamp values
    const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
    const riskLevel: "green" | "yellow" | "red" =
      score < 40 ? "green" : score < 70 ? "yellow" : "red";

    return {
      score,
      riskLevel,
      factors: Array.isArray(parsed.factors) ? parsed.factors.slice(0, 5) : [],
      reasoning: parsed.reasoning ?? "",
      modelVersion: "gpt-4.1-mini-v1",
    };
  } catch (err) {
    console.warn("[AIService] LLM fraud analysis failed, falling back to heuristic:", err);
    return heuristicFraudAnalysis(input);
  }
}

// ─── Predictive Analytics via LLM ────────────────────────────────────────────
export async function generatePredictionWithAI(input: PredictionInput): Promise<PredictionResult> {
  const prompt = `Você é um analista preditivo de sinistros da EonSure.
Com base nos dados abaixo, gere uma análise preditiva para este sinistro.

Dados:
- Tipo: ${input.claimType}
- Valor reclamado: R$ ${input.claimedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Score de fraude: ${input.fraudScore.toFixed(0)}% (nível: ${input.riskLevel})
- Descrição: ${input.description ?? "não fornecida"}

Retorne APENAS um JSON válido (sem markdown):
{
  "suggestedAmount": <valor sugerido de indenização em reais (número)>,
  "predictedFinalCost": <custo final previsto incluindo custos administrativos (número)>,
  "litigationProbability": <probabilidade de litígio de 0.0 a 1.0>,
  "predictedResolutionDays": <dias estimados para resolução (inteiro)>,
  "confidenceScore": <confiança do modelo de 0.0 a 1.0>,
  "reasoning": "<justificativa em português de até 2 frases>",
  "analysisFactors": [
    {"name": "<fator>", "impact": "alto|médio|baixo", "direction": "positivo|negativo|neutro"},
    ...
  ]
}`;

  const client = getClient();
  if (!client) {
    console.warn("[AIService] No OpenAI API key configured, using heuristic fallback.");
    return heuristicPrediction(input);
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(content) as Omit<PredictionResult, never>;

    return {
      suggestedAmount: Math.max(0, Number(parsed.suggestedAmount) || 0),
      predictedFinalCost: Math.max(0, Number(parsed.predictedFinalCost) || 0),
      litigationProbability: Math.max(0, Math.min(1, Number(parsed.litigationProbability) || 0)),
      predictedResolutionDays: Math.max(1, Math.round(Number(parsed.predictedResolutionDays) || 14)),
      confidenceScore: Math.max(0, Math.min(1, Number(parsed.confidenceScore) || 0.7)),
      reasoning: parsed.reasoning ?? "",
      analysisFactors: Array.isArray(parsed.analysisFactors) ? parsed.analysisFactors.slice(0, 5) : [],
    };
  } catch (err) {
    console.warn("[AIService] LLM prediction failed, falling back to heuristic:", err);
    return heuristicPrediction(input);
  }
}

// ─── Heuristic Fallbacks ──────────────────────────────────────────────────────
function heuristicFraudAnalysis(input: FraudAnalysisInput): FraudAnalysisResult {
  const amount = input.claimedAmount;
  const factors = [
    { name: "Valor do Sinistro", weight: 0.3, contribution: amount > 50000 ? 0.4 : 0.1 },
    { name: "Histórico do Segurado", weight: 0.25, contribution: 0.1 },
    { name: "Tipo de Sinistro", weight: 0.2, contribution: input.claimType === "auto" ? 0.2 : 0.05 },
    { name: "Tempo desde Incidente", weight: 0.15, contribution: 0.05 },
    { name: "Padrão de Documentação", weight: 0.1, contribution: 0.02 },
  ];
  const score = factors.reduce((acc, f) => acc + f.contribution * 100, 0);
  const riskLevel: "green" | "yellow" | "red" = score < 40 ? "green" : score < 70 ? "yellow" : "red";
  return { score, riskLevel, factors, reasoning: "Análise heurística aplicada (fallback).", modelVersion: "heuristic-v1" };
}

function heuristicPrediction(input: PredictionInput): PredictionResult {
  const suggestedAmount = input.claimedAmount * (1 - input.fraudScore / 200);
  return {
    suggestedAmount,
    predictedFinalCost: suggestedAmount * 1.05,
    litigationProbability: input.fraudScore > 60 ? 0.45 : input.fraudScore > 30 ? 0.15 : 0.05,
    predictedResolutionDays: input.fraudScore > 60 ? 45 : input.fraudScore > 30 ? 21 : 10,
    confidenceScore: 0.72,
    reasoning: "Análise heurística aplicada (fallback).",
    analysisFactors: [
      { name: "Valor Reclamado", impact: "alto", direction: "neutro" },
      { name: "Score de Fraude", impact: "médio", direction: "negativo" },
    ],
  };
}
