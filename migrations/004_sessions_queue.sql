-- Create sessions_queue table (AI 생성 세션 워크플로우 큐)
CREATE TABLE IF NOT EXISTS sessions_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'created',
  state_name TEXT NOT NULL,
  materials_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generation_started_at TIMESTAMPTZ,
  generation_completed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approver_notes TEXT,
  storage_path TEXT,
  -- Constraint: validate status values
  CONSTRAINT sessions_queue_status_check CHECK (status IN ('created', 'generating', 'generated', 'approved', 'archived'))
);

-- Create session_scripts table (파이프라인 단계별 생성 결과물)
CREATE TABLE IF NOT EXISTS session_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions_queue(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Constraint: validate status values
  CONSTRAINT session_scripts_status_check CHECK (status IN ('pending', 'approved', 'rejected')),
  -- Unique constraint: one stage per session
  UNIQUE (session_id, stage)
);

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION set_session_scripts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session_scripts updated_at
CREATE TRIGGER session_scripts_updated_at
  BEFORE UPDATE ON session_scripts
  FOR EACH ROW EXECUTE FUNCTION set_session_scripts_updated_at();

-- Create indexes for performance
-- Partial index for pending queue items (worker pattern)
CREATE INDEX IF NOT EXISTS idx_sessions_queue_pending
  ON sessions_queue(created_at)
  WHERE status = 'created';

-- Status-based lookup
CREATE INDEX IF NOT EXISTS idx_sessions_queue_status ON sessions_queue(status);

-- State name lookup
CREATE INDEX IF NOT EXISTS idx_sessions_queue_state_name ON sessions_queue(state_name);

-- Session script lookup by session
CREATE INDEX IF NOT EXISTS idx_session_scripts_session_id ON session_scripts(session_id);

-- Status lookup
CREATE INDEX IF NOT EXISTS idx_session_scripts_status ON session_scripts(status);

-- Enable RLS (Row-Level Security)
-- Note: INSERT/UPDATE/DELETE operations are handled by service_role (backend only)
-- authenticated users can only SELECT
ALTER TABLE sessions_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_scripts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow SELECT for authenticated users only
-- (materials_text may contain sensitive user content)
CREATE POLICY sessions_queue_select ON sessions_queue
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY session_scripts_select ON session_scripts
  FOR SELECT
  TO authenticated
  USING (true);
