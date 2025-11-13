-- ============================================================================
-- ORGANIZATION INVITATIONS TABLE
-- ============================================================================
-- Allows users to invite others to join their organization via:
-- 1. Short code (manual entry): e.g., "SMSb-8x92kd"
-- 2. Long token (email link): e.g., "abc123def456..."
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Optional: if inviting specific email, enforce matching on accept
  email TEXT,
  
  -- Short code for manual entry (8 chars, easy to type)
  code TEXT UNIQUE NOT NULL,
  
  -- Long token for URL-based invites (secure, hard to guess)
  token TEXT UNIQUE NOT NULL,
  
  -- Role to assign when invitation is accepted
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  
  -- Who created the invitation
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Invitation lifecycle
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  
  -- Multi-use invitations (1 = single use, -1 = unlimited)
  max_uses INT DEFAULT 1,
  uses_count INT DEFAULT 0,
  
  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_uses CHECK (uses_count <= max_uses OR max_uses = -1)
);

-- Indexes for fast lookups
CREATE INDEX idx_invitations_code ON organization_invitations(code) WHERE status = 'pending';
CREATE INDEX idx_invitations_token ON organization_invitations(token) WHERE status = 'pending';
CREATE INDEX idx_invitations_email ON organization_invitations(email) WHERE status = 'pending' AND email IS NOT NULL;
CREATE INDEX idx_invitations_org ON organization_invitations(org_id);
CREATE INDEX idx_invitations_status ON organization_invitations(org_id, status);

-- Enable RLS
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view invitations for their own orgs
CREATE POLICY "Users can view org invitations"
  ON organization_invitations
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Only owner/admin can create invitations
CREATE POLICY "Admins can create invitations"
  ON organization_invitations
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Only owner/admin can revoke invitations
CREATE POLICY "Admins can update invitations"
  ON organization_invitations
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Only owner/admin can delete invitations
CREATE POLICY "Admins can delete invitations"
  ON organization_invitations
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- HELPER FUNCTION: Generate short invitation code
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No confusing chars (0,O,I,1)
  result TEXT := 'SMSb-';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Auto-expire old invitations
-- ============================================================================
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE organization_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- NOTES:
-- - Call expire_old_invitations() periodically via cron or before checking
-- - Codes are short (SMSb-XXXXXX) for manual entry
-- - Tokens are UUIDs for secure URL-based invites
-- - max_uses = -1 means unlimited (for team invite links)
-- ============================================================================

