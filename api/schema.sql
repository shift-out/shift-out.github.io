CREATE TABLE IF NOT EXISTS leaderboard_scores (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('standard', 'strict')),
  player_id TEXT NOT NULL,
  name TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  updated_at INTEGER NOT NULL,
  UNIQUE (mode, player_id)
);

CREATE INDEX IF NOT EXISTS leaderboard_mode_score_idx
  ON leaderboard_scores (mode, score DESC, updated_at ASC);
