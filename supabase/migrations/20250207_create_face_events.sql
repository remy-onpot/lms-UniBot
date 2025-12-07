-- Create face_events table to track micro-interactions and analytics
CREATE TABLE IF NOT EXISTS face_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  -- event_type: 'pulse', 'login', 'quiz_start', 'quiz_complete', 'assignment_submit', 'shop_purchase', etc.
  face_state VARCHAR(50),
  -- face_state: 'thinking', 'happy', 'sad', 'bouncing', 'idle', etc.
  metadata JSONB,
  -- metadata: can store contextual info like quiz score, assignment id, item purchased, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS face_events_user_id_idx ON face_events(user_id);
CREATE INDEX IF NOT EXISTS face_events_created_at_idx ON face_events(created_at);
CREATE INDEX IF NOT EXISTS face_events_event_type_idx ON face_events(event_type);

-- Enable RLS (Row Level Security)
ALTER TABLE face_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own face events
CREATE POLICY "Users can view their own face events"
  ON face_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Allow server to insert face events (authenticated users can log their own events)
CREATE POLICY "Authenticated users can insert their own face events"
  ON face_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create a function to record face events (can be called via RPC)
CREATE OR REPLACE FUNCTION record_face_event(
  p_event_type VARCHAR,
  p_face_state VARCHAR,
  p_metadata JSONB
)
RETURNS TABLE(
  event_id BIGINT,
  user_id UUID,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO face_events (user_id, event_type, face_state, metadata)
  VALUES (auth.uid(), p_event_type, p_face_state, p_metadata)
  RETURNING id, user_id, created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get recent face events for a user (for analytics/dashboard)
CREATE OR REPLACE FUNCTION get_face_events_summary(p_limit INT DEFAULT 50)
RETURNS TABLE(
  event_type VARCHAR,
  face_state VARCHAR,
  count BIGINT,
  recent_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fe.event_type,
    fe.face_state,
    COUNT(*)::BIGINT,
    MAX(fe.created_at)
  FROM face_events fe
  WHERE fe.user_id = auth.uid()
  GROUP BY fe.event_type, fe.face_state
  ORDER BY MAX(fe.created_at) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
