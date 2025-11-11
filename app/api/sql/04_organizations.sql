-- organizations table
-- Core organization/account entity - all resources are scoped to an org
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  
  -- Contact information
  email TEXT,
  phone TEXT,
  
  -- Billing (moved from user_profiles since billing is org-scoped)
  balance_cents INTEGER DEFAULT 0 NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Twilio integration (org-level, not user-level)
  twilio_subaccount_sid TEXT,
  twilio_subaccount_auth_token TEXT, -- Should be encrypted in production
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- organization_members table
-- Links users to organizations with roles
-- For now: 1 user = 1 org (auto-created on signup)
-- Future: can support multi-org by adding users to multiple orgs
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_org_member UNIQUE (org_id, user_id)
);

-- Indexes
CREATE INDEX idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_status ON organizations(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_org_id ON organization_members(org_id);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
-- Users can view orgs they are members of
CREATE POLICY "Users can view own organizations"
  ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Users can update orgs they own or admin
CREATE POLICY "Owners and admins can update organizations"
  ON organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT org_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Service role can insert (for auto-creation on signup)
CREATE POLICY "Service role can insert organizations"
  ON organizations
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for organization_members
-- Users can view members of their own orgs
CREATE POLICY "Users can view org members"
  ON organization_members
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Only owners can manage members
CREATE POLICY "Owners can manage members"
  ON organization_members
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Service role can insert (for auto-creation on signup)
CREATE POLICY "Service role can insert members"
  ON organization_members
  FOR INSERT
  WITH CHECK (true);

-- Trigger to automatically create organization on user signup
CREATE OR REPLACE FUNCTION create_user_organization()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  user_name TEXT;
BEGIN
  -- Get user's name for org name
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Organization');
  
  -- Create organization
  INSERT INTO organizations (name, email)
  VALUES (user_name || '''s Organization', NEW.email)
  RETURNING id INTO new_org_id;
  
  -- Add user as owner
  INSERT INTO organization_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating organization for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_org
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_organization();

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function to get user's org_id (assumes single org per user for now)
CREATE OR REPLACE FUNCTION get_user_org_id(check_user_id UUID DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(check_user_id, auth.uid());
  
  RETURN (
    SELECT org_id 
    FROM organization_members 
    WHERE user_id = target_user_id 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is org owner
CREATE OR REPLACE FUNCTION is_org_owner(check_org_id UUID, check_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(check_user_id, auth.uid());
  
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE org_id = check_org_id 
      AND user_id = target_user_id 
      AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is org admin or owner
CREATE OR REPLACE FUNCTION is_org_admin(check_org_id UUID, check_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(check_user_id, auth.uid());
  
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE org_id = check_org_id 
      AND user_id = target_user_id 
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

