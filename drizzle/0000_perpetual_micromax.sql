CREATE TABLE `players` (
	`token` text PRIMARY KEY NOT NULL,
	`room_code` text NOT NULL,
	`name` text NOT NULL,
	`avatar` integer NOT NULL,
	`ready` integer DEFAULT 0 NOT NULL,
	`joined_at` integer NOT NULL,
	`last_seen` integer NOT NULL,
	FOREIGN KEY (`room_code`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`host_token` text NOT NULL,
	`created_at` integer NOT NULL,
	`locked` integer DEFAULT 0 NOT NULL,
	`pulse` integer DEFAULT 0 NOT NULL
);
