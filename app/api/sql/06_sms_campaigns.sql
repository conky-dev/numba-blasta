-- sms_campaigns table
-- Stores SMS campaign configuration and status
CREATE TABLE IF NOT EXISTS sms_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  
  -- Message content (either direct message or template reference)
  message TEXT,
  template_id UUID REFERENCES sms_templates(id) ON DELETE SET NULL,
  
  -- Target audience
  list_id UUID, -- Will reference contact_lists when we create that table
  
  -- Campaign status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'done', 'failed')),
  
  -- Scheduling
  schedule_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metrics (computed/cached from sms_messages)
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_campaigns_org_id ON sms_campaigns(org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_campaigns_status ON sms_campaigns(org_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_campaigns_schedule_at ON sms_campaigns(schedule_at) WHERE status = 'scheduled' AND deleted_at IS NULL;
CREATE INDEX idx_campaigns_template_id ON sms_campaigns(template_id) WHERE template_id IS NOT NULL;
CREATE INDEX idx_campaigns_created_by ON sms_campaigns(created_by);

-- Enable RLS
ALTER TABLE sms_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view campaigns in their org
CREATE POLICY "Users can view org campaigns"
  ON sms_campaigns
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Users can create campaigns in their org
CREATE POLICY "Users can create campaigns"
  ON sms_campaigns
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Users can update campaigns in their org (only if not running/done)
CREATE POLICY "Users can update org campaigns"
  ON sms_campaigns
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
    AND status IN ('draft', 'scheduled', 'paused')
    AND deleted_at IS NULL
  );

-- Users can delete campaigns in their org (soft delete, only if not running)
CREATE POLICY "Users can delete org campaigns"
  ON sms_campaigns
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
    AND status != 'running'
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_sms_campaigns_updated_at
  BEFORE UPDATE ON sms_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function to check if campaign is editable
CREATE OR REPLACE FUNCTION is_campaign_editable(campaign_status TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN campaign_status IN ('draft', 'scheduled', 'paused');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to get campaign metrics summary
CREATE OR REPLACE FUNCTION get_campaign_metrics(campaign_uuid UUID)
RETURNS TABLE(
  sent INTEGER,
  delivered INTEGER,
  failed INTEGER,
  replied INTEGER,
  delivery_rate NUMERIC,
  fail_rate NUMERIC,
  reply_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(c.sent_count, 0)::INTEGER as sent,
    COALESCE(c.delivered_count, 0)::INTEGER as delivered,
    COALESCE(c.failed_count, 0)::INTEGER as failed,
    COALESCE(c.replied_count, 0)::INTEGER as replied,
    CASE 
      WHEN c.sent_count > 0 
      THEN ROUND((c.delivered_count::NUMERIC / c.sent_count::NUMERIC) * 100, 2)
      ELSE 0 
    END as delivery_rate,
    CASE 
      WHEN c.sent_count > 0 
      THEN ROUND((c.failed_count::NUMERIC / c.sent_count::NUMERIC) * 100, 2)
      ELSE 0 
    END as fail_rate,
    CASE 
      WHEN c.delivered_count > 0 
      THEN ROUND((c.replied_count::NUMERIC / c.delivered_count::NUMERIC) * 100, 2)
      ELSE 0 
    END as reply_rate
  FROM sms_campaigns c
  WHERE c.id = campaign_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

