CREATE TABLE `convites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenant_id` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('tenant_admin','tenant_member','field_agent') NOT NULL,
	`token` varchar(128) NOT NULL,
	`convidado_por_id` int NOT NULL,
	`usado_em` timestamp,
	`expira_em` timestamp NOT NULL,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `convites_id` PRIMARY KEY(`id`),
	CONSTRAINT `convites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `sessoes` (
	`id` varchar(128) NOT NULL,
	`user_id` int NOT NULL,
	`ip_origem` varchar(45),
	`user_agent` text,
	`expires_at` timestamp NOT NULL,
	`criada_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('mega_admin','tenant_admin','tenant_member','field_agent','trial_user','user','admin','mega-admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `tenants` ADD `status` enum('trial','active','suspended','cancelled') DEFAULT 'trial' NOT NULL;--> statement-breakpoint
ALTER TABLE `tenants` ADD `trialExpiraEm` timestamp;--> statement-breakpoint
ALTER TABLE `tenants` ADD `cnpj` varchar(18);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `totpSecret` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `totpVerificado` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `totpAtivoEm` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `ultimoLoginEm` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `tentativasLoginFalhadas` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `bloqueadoAte` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `convidadoPor` int;--> statement-breakpoint
ALTER TABLE `users` ADD `convidadoEm` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `trialExpiraEm` timestamp;