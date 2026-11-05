CREATE TABLE `learning_states` (
  `user_id` text PRIMARY KEY NOT NULL,
  `revision` integer NOT NULL,
  `state_blob` blob NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `learning_recovery` (
  `user_id` text NOT NULL,
  `revision` integer NOT NULL,
  `state_blob` blob NOT NULL,
  `updated_at` text NOT NULL,
  PRIMARY KEY (`user_id`, `revision`)
);
