ALTER TABLE links ADD COLUMN expires_at TEXT;

CREATE TABLE IF NOT EXISTS flags (
  name  TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO flags (name, value) VALUES ('expiry', '0');
