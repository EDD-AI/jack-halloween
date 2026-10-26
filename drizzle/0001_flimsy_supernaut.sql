ALTER TABLE `rooms` ADD `state` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `revision` integer DEFAULT 0 NOT NULL;