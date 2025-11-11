-- ================================================
-- Contacts Table
-- ================================================
-- Stores individual contacts for SMS campaigns
-- Scoped to organization, unique by phone number
-- ================================================

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Contact details
  phone VARCHAR(20) NOT NULL, -- E.164 format: +1234567890
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  
  -- Opt-out management
  opted_out_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- Soft delete
  
  -- Constraints
  CONSTRAINT contacts_org_phone_unique UNIQUE (org_id, phone, deleted_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_org_id ON contacts(org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_search ON contacts USING gin(
  to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(email, ''))
);

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY contacts_org_isolation ON contacts
  FOR ALL
  USING (org_id = get_user_org_id());

-- Trigger to update updated_at
CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Helper Functions
-- ================================================

-- Count contacts for an organization
CREATE OR REPLACE FUNCTION count_org_contacts(p_org_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM contacts
  WHERE org_id = p_org_id
    AND deleted_at IS NULL;
$$ LANGUAGE SQL STABLE;

-- Check if phone is opted out
CREATE OR REPLACE FUNCTION is_phone_opted_out(p_org_id UUID, p_phone VARCHAR)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM contacts
    WHERE org_id = p_org_id
      AND phone = p_phone
      AND opted_out_at IS NOT NULL
      AND deleted_at IS NULL
  );
$$ LANGUAGE SQL STABLE;

-- Get contact by phone
CREATE OR REPLACE FUNCTION get_contact_by_phone(p_org_id UUID, p_phone VARCHAR)
RETURNS UUID AS $$
  SELECT id
  FROM contacts
  WHERE org_id = p_org_id
    AND phone = p_phone
    AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

COMMENT ON TABLE contacts IS 'Individual contacts for SMS campaigns, scoped to organization';
COMMENT ON COLUMN contacts.phone IS 'Phone number in E.164 format (+1234567890)';
COMMENT ON COLUMN contacts.opted_out_at IS 'Timestamp when contact opted out of messages (via STOP)';

