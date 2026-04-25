CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`loanId` int NOT NULL,
	`studentId` int NOT NULL,
	`adminId` int,
	`alertType` enum('overdue','approaching_deadline','damage_report','loss_report') NOT NULL,
	`daysOverdue` int DEFAULT 0,
	`status` enum('pending','acknowledged','resolved') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`acknowledgedAt` timestamp,
	`resolvedAt` timestamp,
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` varchar(100) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int,
	`userId` int,
	`toolId` int,
	`details` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`toolId` int NOT NULL,
	`totalQuantity` int NOT NULL DEFAULT 1,
	`availableQuantity` int NOT NULL DEFAULT 1,
	`borrowedQuantity` int NOT NULL DEFAULT 0,
	`maintenanceQuantity` int NOT NULL DEFAULT 0,
	`lostQuantity` int NOT NULL DEFAULT 0,
	`status` enum('available','borrowed','maintenance','lost') NOT NULL DEFAULT 'available',
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loanRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`minDays` int NOT NULL,
	`maxDays` int,
	`sanctionDescription` varchar(255) NOT NULL,
	`canBorrow` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loanRules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`toolId` int NOT NULL,
	`studentId` int NOT NULL,
	`borrowDate` datetime NOT NULL,
	`expectedReturnDate` datetime NOT NULL,
	`actualReturnDate` datetime,
	`status` enum('active','returned','overdue','lost') NOT NULL DEFAULT 'active',
	`conditionOnBorrow` enum('excellent','good','fair','poor') NOT NULL DEFAULT 'good',
	`conditionOnReturn` enum('excellent','good','fair','poor'),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sanctions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`loanId` int,
	`sanctionType` enum('overdue','damage','loss','other') NOT NULL,
	`daysOverdue` int DEFAULT 0,
	`description` text,
	`status` enum('active','resolved','appealed') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `sanctions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`toolId` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(100) NOT NULL,
	`condition` enum('excellent','good','fair','poor') NOT NULL DEFAULT 'good',
	`location` varchar(255) NOT NULL,
	`qrCode` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tools_id` PRIMARY KEY(`id`),
	CONSTRAINT `tools_toolId_unique` UNIQUE(`toolId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('student','admin') NOT NULL DEFAULT 'student';--> statement-breakpoint
ALTER TABLE `users` ADD `studentId` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_studentId_unique` UNIQUE(`studentId`);