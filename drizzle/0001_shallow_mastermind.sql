CREATE TABLE `claim_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`claimId` int NOT NULL,
	`tenantId` int NOT NULL,
	`eventType` enum('status_change','rule_applied','fraud_score_updated','assignment_changed','amount_updated','comment_added','document_added','resolution') NOT NULL,
	`fromStatus` varchar(64),
	`toStatus` varchar(64),
	`description` text,
	`performedBy` int,
	`performedByName` varchar(256),
	`isAutomated` boolean DEFAULT false,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `claim_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `claims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`claimNumber` varchar(64) NOT NULL,
	`tenantId` int NOT NULL,
	`policyNumber` varchar(64),
	`insuredName` varchar(256),
	`insuredDocument` varchar(32),
	`claimType` enum('auto','property','health','life','liability','other') NOT NULL,
	`description` text,
	`incidentDate` timestamp,
	`reportedDate` timestamp DEFAULT (now()),
	`status` enum('ingestion','triage','risk_analysis','investigation','resolution','closed','rejected') NOT NULL DEFAULT 'ingestion',
	`claimedAmount` decimal(15,2),
	`approvedAmount` decimal(15,2),
	`suggestedAmount` decimal(15,2),
	`assignedTo` int,
	`priority` enum('low','medium','high','critical') DEFAULT 'medium',
	`fraudRisk` enum('green','yellow','red') DEFAULT 'green',
	`fraudScore` decimal(5,2),
	`litigationProbability` decimal(5,2),
	`predictedResolutionDays` int,
	`resolvedAt` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `claims_id` PRIMARY KEY(`id`),
	CONSTRAINT `claims_claimNumber_unique` UNIQUE(`claimNumber`)
);
--> statement-breakpoint
CREATE TABLE `csat_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int,
	`persona` enum('c-level','gerente-sinistros','analista-fraude','cio','perito') NOT NULL,
	`score` int NOT NULL,
	`npsScore` int,
	`feedback` text,
	`claimId` int,
	`triggerType` enum('post_claim_closure','scheduled_monthly','scheduled_quarterly','scheduled_semiannual','manual') DEFAULT 'manual',
	`responses` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `csat_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fraud_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`claimId` int NOT NULL,
	`tenantId` int NOT NULL,
	`score` decimal(5,2) NOT NULL,
	`riskLevel` enum('green','yellow','red') NOT NULL,
	`factors` json,
	`modelVersion` varchar(32),
	`investigationStatus` enum('pending','in_review','cleared','confirmed_fraud') DEFAULT 'pending',
	`investigatorId` int,
	`investigatorNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fraud_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `predictive_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`claimId` int NOT NULL,
	`tenantId` int NOT NULL,
	`suggestedAmount` decimal(15,2),
	`predictedFinalCost` decimal(15,2),
	`litigationProbability` decimal(5,2),
	`predictedResolutionDays` int,
	`confidenceScore` decimal(5,2),
	`similarCasesCount` int,
	`analysisFactors` json,
	`modelVersion` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `predictive_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rule_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ruleId` int NOT NULL,
	`claimId` int NOT NULL,
	`tenantId` int NOT NULL,
	`ruleName` varchar(256),
	`conditionsEvaluated` json NOT NULL,
	`conditionsMet` boolean NOT NULL,
	`actionTaken` varchar(64),
	`explanation` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rule_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`priority` int DEFAULT 0,
	`conditions` json NOT NULL,
	`action` enum('auto_approve','auto_reject','escalate','flag_fraud','assign_to_perito','request_documents','notify') NOT NULL,
	`actionParams` json,
	`triggerCount` int DEFAULT 0,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`plan` enum('starter','professional','enterprise') NOT NULL DEFAULT 'starter',
	`pillarEonicData` boolean NOT NULL DEFAULT false,
	`pillarRulesEngine` boolean NOT NULL DEFAULT false,
	`pillarFraudML` boolean NOT NULL DEFAULT false,
	`pillarPredictive` boolean NOT NULL DEFAULT false,
	`maxClaims` int DEFAULT 100,
	`maxUsers` int DEFAULT 5,
	`billingCycle` enum('monthly','annual') DEFAULT 'monthly',
	`status` enum('active','suspended','cancelled','trial') NOT NULL DEFAULT 'trial',
	`trialEndsAt` timestamp,
	`currentPeriodStart` timestamp DEFAULT (now()),
	`currentPeriodEnd` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_tenantId_unique` UNIQUE(`tenantId`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`logoUrl` text,
	`pillarEonicData` boolean NOT NULL DEFAULT false,
	`pillarRulesEngine` boolean NOT NULL DEFAULT false,
	`pillarFraudML` boolean NOT NULL DEFAULT false,
	`pillarPredictive` boolean NOT NULL DEFAULT false,
	`subscriptionPlan` enum('starter','professional','enterprise') NOT NULL DEFAULT 'starter',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `persona` enum('c-level','gerente-sinistros','analista-fraude','cio','perito') DEFAULT 'perito';--> statement-breakpoint
ALTER TABLE `users` ADD `tenantId` int;