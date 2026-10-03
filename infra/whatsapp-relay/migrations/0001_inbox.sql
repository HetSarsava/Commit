CREATE TABLE IF NOT EXISTS relay_events (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  signature TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  consumed_at INTEGER
);
CREATE INDEX IF NOT EXISTS relay_pending ON relay_events(consumed_at, created_at, id);
