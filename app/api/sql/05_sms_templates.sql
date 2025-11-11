-- sms_templates table
-- Stores reusable SMS message templates with variable placeholders
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Unique template name per org (only for non-deleted templates)
  CONSTRAINT unique_template_name_per_org UNIQUE NULLS NOT DISTINCT (org_id, name, deleted_at)
);

-- Indexes
CREATE INDEX idx_templates_org_id ON sms_templates(org_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_templates_created_by ON sms_templates(created_by);

-- Full-text search index for name and content
CREATE INDEX idx_templates_search ON sms_templates 
  USING gin(to_tsvector('english', name || ' ' || content)) 
  WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view templates in their org
CREATE POLICY "Users can view org templates"
  ON sms_templates
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Users can create templates in their org
CREATE POLICY "Users can create templates"
  ON sms_templates
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Users can update templates in their org
CREATE POLICY "Users can update org templates"
  ON sms_templates
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Users can delete (soft delete) templates in their org
CREATE POLICY "Users can delete org templates"
  ON sms_templates
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_sms_templates_updated_at
  BEFORE UPDATE ON sms_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

