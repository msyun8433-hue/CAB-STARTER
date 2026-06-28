-- Create sessions table (고객 기록)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  sensations TEXT,
  one_word TEXT,
  scene TEXT,
  scene_sensation TEXT,
  scene_interpretation TEXT,
  voice_a TEXT,
  voice_b TEXT,
  one_sentence TEXT,
  sentence_feeling TEXT,
  tomorrow_action TEXT,
  gratitude JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create mirrors table (거울 글)
CREATE TABLE IF NOT EXISTS mirrors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  mirror_text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create visits table (타임라인 재방문 추적)
CREATE TABLE IF NOT EXISTS visits (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mirror_id UUID REFERENCES mirrors(id) ON DELETE SET NULL,
  time_spent_seconds INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_recorded_at ON sessions(recorded_at);
CREATE INDEX IF NOT EXISTS idx_mirrors_session_id ON mirrors(session_id);
CREATE INDEX IF NOT EXISTS idx_mirrors_created_at ON mirrors(created_at);
CREATE INDEX IF NOT EXISTS idx_visits_user_id ON visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at);
