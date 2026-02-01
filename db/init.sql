CREATE TABLE IF NOT EXISTS slack_installations (
  team_id TEXT NOT NULL DEFAULT '',
  enterprise_id TEXT NOT NULL DEFAULT '',
  is_enterprise_install BOOLEAN NOT NULL DEFAULT FALSE,
  install_data JSONB NOT NULL,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, enterprise_id, is_enterprise_install)
);

CREATE TABLE IF NOT EXISTS slack_oauth_states (
  state TEXT PRIMARY KEY,
  install_options JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS point_events (
  id BIGSERIAL PRIMARY KEY,
  team_id TEXT NOT NULL,
  giver_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS points (
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);
