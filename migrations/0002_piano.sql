-- Piano scores are independent of the existing portfolio wall.
CREATE TABLE IF NOT EXISTS piano_runs (
  id TEXT PRIMARY KEY,
  visitor TEXT NOT NULL,
  song_id TEXT NOT NULL,
  started_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS piano_runs_expiry ON piano_runs(started_at);

CREATE TABLE IF NOT EXISTS piano_scores (
  id TEXT PRIMARY KEY REFERENCES piano_runs(id),
  name TEXT NOT NULL,
  song_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  duration REAL NOT NULL,
  best_combo INTEGER NOT NULL,
  perfect INTEGER NOT NULL,
  good INTEGER NOT NULL,
  misses INTEGER NOT NULL,
  max_speed REAL NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS piano_scores_song ON piano_scores(song_id, score DESC, best_combo DESC, duration ASC, created_at ASC);
CREATE INDEX IF NOT EXISTS piano_scores_all ON piano_scores(score DESC, best_combo DESC, duration ASC, created_at ASC);
CREATE TABLE IF NOT EXISTS piano_rate_limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
