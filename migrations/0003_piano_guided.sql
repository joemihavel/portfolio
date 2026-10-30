-- Retain survival-mode history, and keep guided scores in their own ranking.
ALTER TABLE piano_runs ADD COLUMN ruleset TEXT NOT NULL DEFAULT 'survival-v1';
ALTER TABLE piano_scores ADD COLUMN ruleset TEXT NOT NULL DEFAULT 'survival-v1';
CREATE INDEX piano_scores_ruleset_song ON piano_scores(ruleset, song_id, score DESC, best_combo DESC, duration ASC, created_at ASC);
