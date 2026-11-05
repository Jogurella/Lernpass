CREATE TABLE accounts (
 id TEXT PRIMARY KEY NOT NULL,
 created_at TEXT NOT NULL
);
CREATE TABLE devices (
 id TEXT PRIMARY KEY NOT NULL,
 account_id TEXT NOT NULL REFERENCES accounts(id),
 name TEXT NOT NULL,
 platform TEXT NOT NULL CHECK(platform IN ('win','ios')),
 token_hash TEXT UNIQUE NOT NULL,
 created_at TEXT NOT NULL,
 last_seen TEXT NOT NULL
);
CREATE INDEX devices_account ON devices(account_id);
CREATE TABLE pairing_codes (
 code_hash TEXT PRIMARY KEY NOT NULL,
 account_id TEXT NOT NULL REFERENCES accounts(id),
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 claimed_at INTEGER,
 claimed_device_id TEXT
);
CREATE TABLE device_rate_limits (
 bucket TEXT PRIMARY KEY NOT NULL,
 attempts INTEGER NOT NULL,
 reset_at INTEGER NOT NULL
);
