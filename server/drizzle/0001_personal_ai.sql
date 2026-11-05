CREATE TABLE `personal_ai` (
  `user_id` text PRIMARY KEY NOT NULL,
  `key_cipher` text,
  `nonce` text,
  `model` text NOT NULL DEFAULT 'gemini-3.1-flash-lite',
  `status` text NOT NULL DEFAULT 'unconfigured',
  `message` text NOT NULL DEFAULT '',
  `disabled` integer NOT NULL DEFAULT 0,
  `checked_at` text
);
