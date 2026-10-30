CREATE TABLE inbox_items (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  amount INTEGER NOT NULL,
  note TEXT,
  received_at TEXT NOT NULL
);

CREATE INDEX inbox_items_token ON inbox_items (token_hash, received_at);
