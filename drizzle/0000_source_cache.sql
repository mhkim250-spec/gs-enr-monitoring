CREATE TABLE `source_cache` (
	`source` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updated_at` integer NOT NULL,
	`status` text DEFAULT 'ok' NOT NULL,
	`error` text
);
