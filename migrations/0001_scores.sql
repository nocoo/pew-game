CREATE TABLE scores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 6),
  score      INTEGER NOT NULL CHECK(score >= 0),
  wave       INTEGER NOT NULL CHECK(wave >= 1),
  duration   REAL NOT NULL CHECK(duration > 0),
  created    TEXT NOT NULL DEFAULT (datetime('now')),
  session_id TEXT NOT NULL UNIQUE
) STRICT;

CREATE INDEX idx_scores_ranking ON scores(score DESC, created ASC, id ASC);
