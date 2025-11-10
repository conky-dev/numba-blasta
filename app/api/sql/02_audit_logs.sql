-- audit_logs table
-- Tracks important user actions and system events for security and debugging
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- e.g., 'login', 'sms_sent', 'campaign_created', 'balance_added'
  resource_type TEXT, -- e.g., 'campaign', 'contact', 'message'
  resource_id TEXT, -- ID of the resource being acted upon
  details JSONB, -- Flexible field for event-specific data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only system/backend can insert audit logs (via service role)
-- No UPDATE or DELETE policies - audit logs are immutable

