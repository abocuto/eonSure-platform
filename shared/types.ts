export type Persona = "c-level" | "gerente-sinistros" | "analista-fraude" | "cio" | "perito";

export const PERSONA_LABELS: Record<Persona, string> = {
  "c-level": "C-Level",
  "gerente-sinistros": "Gerente de Sinistros",
  "analista-fraude": "Analista de Fraude",
  "cio": "CIO / Diretor de Tecnologia",
  "perito": "Perito / Avaliador",
};

export const PERSONA_ICONS: Record<Persona, string> = {
  "c-level": "TrendingUp",
  "gerente-sinistros": "ClipboardList",
  "analista-fraude": "ShieldAlert",
  "cio": "Server",
  "perito": "Search",
};

export type ClaimStatus =
  | "ingestion"
  | "triage"
  | "risk_analysis"
  | "investigation"
  | "resolution"
  | "closed"
  | "rejected";

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  ingestion: "Ingestão",
  triage: "Triagem",
  risk_analysis: "Análise de Risco",
  investigation: "Investigação",
  resolution: "Resolução",
  closed: "Encerrado",
  rejected: "Rejeitado",
};

export const CLAIM_STATUS_ORDER: ClaimStatus[] = [
  "ingestion",
  "triage",
  "risk_analysis",
  "investigation",
  "resolution",
  "closed",
];

export type RiskLevel = "green" | "yellow" | "red";

export const RISK_LABELS: Record<RiskLevel, string> = {
  green: "Baixo Risco",
  yellow: "Risco Médio",
  red: "Alto Risco",
};

export type ClaimType = "auto" | "property" | "health" | "life" | "liability" | "other";

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  auto: "Automóvel",
  property: "Propriedade",
  health: "Saúde",
  life: "Vida",
  liability: "Responsabilidade Civil",
  other: "Outros",
};

export type Pillar = "pillarEonicData" | "pillarRulesEngine" | "pillarFraudML" | "pillarPredictive";

export const PILLAR_LABELS: Record<Pillar, string> = {
  pillarEonicData: "Estrutura de Dados Eônica",
  pillarRulesEngine: "Motor de Regras da Justiça",
  pillarFraudML: "Machine Learning Contra Fraude",
  pillarPredictive: "Análise Preditiva para Longevidade",
};

export const PILLAR_DESCRIPTIONS: Record<Pillar, string> = {
  pillarEonicData: "Harmonização e gestão de dados de sinistros ao longo de vastos períodos e fontes",
  pillarRulesEngine: "Lógica de negócios transparente e configurável com triagem automatizada",
  pillarFraudML: "Modelos de ML para detecção e mitigação ativa de fraudes em tempo real",
  pillarPredictive: "IA para sugestões de indenização e previsão de custo final com precisão cirúrgica",
};

export const PILLAR_ICONS: Record<Pillar, string> = {
  pillarEonicData: "Database",
  pillarRulesEngine: "GitBranch",
  pillarFraudML: "ShieldAlert",
  pillarPredictive: "BarChart3",
};
