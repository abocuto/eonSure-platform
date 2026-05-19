# EonSure Platform - TODO

## Design System & Estrutura Base
- [x] Configurar paleta de cores EonSure (azul escuro + ciano) no index.css
- [x] Importar fonte Roboto no index.html
- [x] Criar componentes reutilizáveis: RiskBadge, KPICard, StatusPill, ClaimCard
- [x] Configurar EonLayout com sidebar de navegação por persona
- [x] Criar página de landing/login da EonSure

## Banco de Dados (Schema)
- [x] Tabela: tenants (multi-tenant com pilares ativáveis)
- [x] Tabela: claims (sinistros com ciclo de vida completo)
- [x] Tabela: claim_events (log de eventos do ciclo de vida)
- [x] Tabela: fraud_scores (scores de risco Verde/Amarelo/Vermelho)
- [x] Tabela: rules (Motor de Regras no-code)
- [x] Tabela: rule_logs (log de explicabilidade das decisões)
- [x] Tabela: predictive_analyses (análises preditivas e sugestões)
- [x] Tabela: csat_responses (respostas de feedback por persona)
- [x] Tabela: subscriptions (assinaturas e módulos ativos por tenant)
- [x] Atualizar tabela users com campo persona e tenant_id

## Backend (tRPC Routers)
- [x] Router: tenants (CRUD + ativação de pilares)
- [x] Router: claims (CRUD + transições de status do ciclo de vida)
- [x] Router: fraud (score de risco + painel de investigação)
- [x] Router: rules (Motor de Regras no-code + log de explicabilidade)
- [x] Router: analytics (KPIs + análise preditiva)
- [x] Router: csat (coleta e consulta de feedback)
- [x] Router: subscriptions (gestão de assinaturas modulares)

## Autenticação e Controle de Acesso
- [x] Implementar controle de acesso por persona: C-Level, Gerente de Sinistros, Analista de Fraude, CIO, Perito
- [x] Middleware de autorização por persona no backend
- [x] Navegação condicional por persona no frontend

## Dashboard Executivo (C-Level)
- [x] KPI: Eficiência Financeira (custo total de sinistros)
- [x] KPI: TMR - Tempo Médio de Resolução
- [x] KPI: Acurácia Preditiva de Risco
- [x] Gráficos de tendência em tempo real
- [x] Resumo de sinistros por status

## Módulo Claim Lifecycle
- [x] Tela de ingestão de sinistro (formulário)
- [x] Tela de triagem automática com Motor de Regras
- [x] Tela de análise de risco com score de fraude
- [x] Tela de resolução e fechamento
- [x] Timeline visual do ciclo de vida do sinistro
- [x] Filtros e busca de sinistros

## Motor de Regras (No-Code)
- [x] Interface de criação/edição de regras no-code
- [x] Condições configuráveis (campo, operador, valor)
- [x] Ações configuráveis (aprovar, rejeitar, escalar, alertar)
- [x] Log de explicabilidade para cada decisão automatizada
- [x] Ativação/desativação de regras por tenant

## Detecção de Fraude
- [x] Score de risco com classificação Verde/Amarelo/Vermelho
- [x] Painel de investigação de fraude
- [x] Histórico de alertas de fraude
- [x] Detalhes de fatores de risco por sinistro
- [x] Ações de investigação (aprovar, escalar, rejeitar)

## Análise Preditiva
- [x] Sugestão inteligente de valor de indenização
- [x] Previsão de custo final do sinistro
- [x] Probabilidade de litígio
- [x] Previsão de TMR por sinistro
- [x] Dashboard de análises preditivas agregadas

## Módulo CSAT
- [x] Formulário de feedback por persona
- [x] Frequência configurável de coleta (mensal/trimestral/semestral)
- [x] Painel de resultados CSAT por persona
- [x] Integração no workflow (trigger pós-fechamento de sinistro)

## Gestão de Assinaturas e Módulos
- [x] Painel de gestão de tenant (CIO)
- [x] Ativação/desativação dos 4 pilares tecnológicos por tenant
- [x] Histórico de ativações e configurações

## Testes
- [x] Testes unitários para routers de claims
- [x] Testes unitários para Motor de Regras
- [x] Testes unitários para score de fraude

## Melhorias e Bugfixes
- [x] Corrigir nomes de colunas SQL raw (snake_case → camelCase)
- [x] Corrigir Link com <a> aninhado no Dashboard e EonLayout
- [x] Página de edição de perfil do usuário (/profile) com seletor de persona
- [x] Bloco de usuário na sidebar clicável → navega para /profile
- [x] Botão "Sair da conta" separado na sidebar com ícone e label
