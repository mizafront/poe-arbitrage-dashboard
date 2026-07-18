CREATE TABLE IF NOT EXISTS opportunity_snapshots (
  league TEXT NOT NULL,
  recipe_key TEXT NOT NULL,
  category TEXT NOT NULL,
  card_category TEXT NOT NULL DEFAULT '',
  input_category TEXT NOT NULL,
  output_category TEXT NOT NULL,
  input_name TEXT NOT NULL,
  output_name TEXT NOT NULL,
  ratio REAL NOT NULL,
  output_quantity REAL NOT NULL DEFAULT 1,
  input_ninja REAL,
  input_watch REAL,
  input_sources INTEGER NOT NULL DEFAULT 1,
  input_watch_volume REAL NOT NULL DEFAULT 0,
  output_ninja REAL,
  output_watch REAL,
  output_sources INTEGER NOT NULL DEFAULT 1,
  output_watch_volume REAL NOT NULL DEFAULT 0,
  captured_at INTEGER NOT NULL,
  PRIMARY KEY (league, recipe_key, captured_at)
);

CREATE INDEX IF NOT EXISTS idx_opportunity_snapshots_league_time
  ON opportunity_snapshots (league, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_opportunity_snapshots_recipe_time
  ON opportunity_snapshots (league, recipe_key, captured_at DESC);

CREATE TABLE IF NOT EXISTS collector_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  recipe_count INTEGER NOT NULL DEFAULT 0,
  source_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_collector_runs_league_time
  ON collector_runs (league, started_at DESC);
