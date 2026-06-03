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
- [x] Script de seed com sinistros, eventos, scores de fraude e análises preditivas
- [x] Botão de alternância light/dark no header do EonLayout
- [x] Painel de configurações white-label por tenant (cores, logo, nome)
- [x] Aplicar branding white-label salvo (brandName, logoUrl, primaryColor) no EonLayout em runtime
- [x] Associar automaticamente usuário ao tenant de demonstração (id=1) quando tenantId for nulo no login
- [x] Cards de status de sinistros no Dashboard com contadores e link filtrado para /claims
- [x] Cards de status do Dashboard exibem contadores para todas as personas (não apenas analytics:read)
- [x] Página /claims lê query param ?status= e aplica filtro automaticamente ao abrir via cards

## Mega-Admin
- [x] Adicionar role "mega-admin" no schema de users e migrar banco
- [x] Criar tabela audit_logs para rastrear todas as ações do mega-admin
- [x] Criar queries de administração global no db.ts (listagem de tenants, stats, usuários por tenant)
- [x] Criar router mega-admin com procedures protegidas por role mega-admin
- [x] Criar rota /api/mega-admin-login com autenticação por secret
- [x] Criar página /mega-admin com listagem de todos os tenants e métricas globais
- [x] Criar página /mega-admin/tenant/:id com detalhe do cliente (cadastro, assinatura, usuários, sinistros)
- [x] Criar página /mega-admin/audit com log de todas as ações administrativas
- [x] Proteção de rota: redirecionar não-mega-admin que tentar acessar /mega-admin
- [x] Confirmação de ações destrutivas (suspender tenant, excluir usuário)
- [x] Criar usuário mega-admin no banco via SQL
- [x] Adicionar link para /mega-admin no EonLayout apenas para mega-admin

## Mega-Admin Reestruturado (v2)
- [x] Backend: queries de CSAT/NPS global agregado por tenant e plataforma
- [x] Backend: query getAllPlatformUsers com dados de todos os usuários + credenciais demo
- [x] Backend: query createTenant para criação de novo cliente pelo mega-admin
- [x] Backend: métricas financeiras estimadas (MRR, ARR) por plano de assinatura
- [x] Dashboard mega-admin: métricas gerenciais (MRR, ARR, CSAT médio, NPS médio, churn)
- [x] Dashboard mega-admin: gráficos de distribuição de planos e status de tenants
- [x] Dashboard mega-admin: tabela de tenants com CSAT/NPS por linha
- [x] Dashboard mega-admin: botão "Novo Cliente" com modal de criação
- [x] Página /mega-admin/users: lista de todos os usuários da plataforma com persona, role, tenant e credenciais demo
- [x] Página /mega-admin/users: filtros por tenant, role e persona
- [x] Detalhe do tenant: aba CSAT/NPS com histórico de respostas e médias
- [x] Navegação mega-admin: link para /mega-admin/users no header

## Bugfixes
- [x] Dashboard: race condition causava analytics.getKpis ser disparado para persona perito antes do auth resolver; corrigido com persona derivada somente pós-auth e retry:false

## Gestão Multi-Tenant e Usuários (Sprint 3)
- [ ] Backend: procedure createTenantUser para criar usuário vinculado a tenant
- [ ] Backend: procedure getTenantUsers para listar usuários do tenant (C-Level e CIO)
- [ ] Backend: procedure updateTenantUser para editar role/persona de usuário
- [ ] Backend: procedure removeTenantUser para remover usuário do tenant
- [ ] Backend: procedure bulkImportUsers para importar usuários em lote via XLSX/CSV
- [ ] Backend: procedure getMegaAdminTenantLeaders para mega-admin ver apenas C-Level e CIO por tenant
- [ ] Backend: createTenant expandido para incluir criação do primeiro usuário C-Level
- [ ] Mega-admin: modal de criação de tenant em 2 etapas (dados do tenant + primeiro usuário C-Level)
- [ ] Mega-admin: lista de usuários filtrada por C-Level/CIO separados por cliente
- [ ] Página /users: gerenciamento de usuários do tenant para C-Level e CIO
- [ ] Página /users: importação em lote via XLSX/CSV com preview e atribuição de nível
- [ ] Sidebar EonLayout: logo do cliente com fallback ícone genérico (Building2)
- [ ] Sidebar EonLayout: texto "powered by EonSure" abaixo da marca do cliente
- [ ] Sidebar EonLayout: identificação automática do tenant pelo login (tenantId do usuário)
- [ ] Isolamento multi-tenant: todas as queries usam tenantId do usuário autenticado
- [ ] Rota /users adicionada no App.tsx e ProtectedRoute (c-level, cio)
- [ ] Navegação: link "Usuários" adicionado no EonLayout para c-level e cio
