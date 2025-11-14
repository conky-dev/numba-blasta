-- Add column to track account management type
ALTER TABLE organizations
ADD COLUMN account_type TEXT DEFAULT 'byoa' CHECK (account_type IN ('byoa', 'managed', 'platform'));

-- Rename misleading columns for clarity
ALTER TABLE organizations
RENAME COLUMN twilio_subaccount_sid TO twilio_account_sid;

ALTER TABLE organizations
RENAME COLUMN twilio_subaccount_auth_token TO twilio_auth_token;

-- Add index for faster lookups
CREATE INDEX idx_organizations_account_type ON organizations(account_type);

COMMENT ON COLUMN organizations.account_type IS 'Account management type: byoa (bring your own), managed (we created subaccount), platform (uses default platform account)';
COMMENT ON COLUMN organizations.twilio_account_sid IS 'Twilio Account SID - either customer''s own account (byoa) or subaccount we created (managed)';
COMMENT ON COLUMN organizations.twilio_auth_token IS 'Twilio Auth Token - either customer''s own (byoa) or subaccount token (managed)';

