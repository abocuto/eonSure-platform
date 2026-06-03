CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`adminName` varchar(256),
	`adminEmail` varchar(320),
	`action` varchar(128) NOT NULL,
	`resource` varchar(64) NOT NULL,
	`resourceId` int,
	`resourceName` varchar(256),
	`targetTenantId` int,
	`targetTenantName` varchar(256),
	`previousState` json,
	`newState` json,
	`ipAddress` varchar(64),
	`userAgent` text,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'info',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','mega-admin') NOT NULL DEFAULT 'user';