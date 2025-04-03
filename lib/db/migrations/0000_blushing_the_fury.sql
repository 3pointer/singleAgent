CREATE TABLE `Chat` (
	`id` char(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`title` text NOT NULL,
	`userId` char(36) NOT NULL,
	`visibility` enum('public','private') NOT NULL DEFAULT 'private',
	CONSTRAINT `Chat_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Document` (
	`id` char(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`title` varchar(255) NOT NULL,
	`kind` varchar(20) NOT NULL,
	`content` text NOT NULL,
	`userId` char(36) NOT NULL,
	CONSTRAINT `Document_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Message` (
	`id` char(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`content` text NOT NULL,
	`role` varchar(20) NOT NULL,
	`chatId` char(36) NOT NULL,
	CONSTRAINT `Message_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Suggestion` (
	`id` char(36) NOT NULL,
	`documentId` char(36) NOT NULL,
	`documentCreatedAt` timestamp NOT NULL DEFAULT (now()),
	`content` json NOT NULL,
	CONSTRAINT `Suggestion_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `User` (
	`id` char(36) NOT NULL,
	`email` varchar(64) NOT NULL,
	`password` varchar(64),
	CONSTRAINT `User_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Vote` (
	`chatId` char(36) NOT NULL,
	`messageId` char(36) NOT NULL,
	`isUpvoted` boolean NOT NULL
);
--> statement-breakpoint
ALTER TABLE `Chat` ADD CONSTRAINT `Chat_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Document` ADD CONSTRAINT `Document_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Message` ADD CONSTRAINT `Message_chatId_Chat_id_fk` FOREIGN KEY (`chatId`) REFERENCES `Chat`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Suggestion` ADD CONSTRAINT `Suggestion_documentId_Document_id_fk` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_chatId_Chat_id_fk` FOREIGN KEY (`chatId`) REFERENCES `Chat`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_messageId_Message_id_fk` FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON DELETE no action ON UPDATE no action;