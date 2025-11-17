-- ============================================================================
-- PHONE NUMBERS TABLE
-- ============================================================================
-- Stores multiple phone numbers per organization
-- Supports toll-free, local, and short-code numbers
-- ============================================================================

CREATE TABLE IF NOT EXISTS phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Phone number details
  phone_number TEXT NOT NULL,
  phone_sid TEXT, -- Twilio Phone Number SID
  type TEXT DEFAULT 'toll-free' CHECK (type IN ('toll-free', 'local', 'short-code')),
  
  -- Verification status
  status TEXT DEFAULT 'awaiting_verification' 
    CHECK (status IN ('none', 'awaiting_verification', 'verified', 'failed')),
  
  -- Metadata
  is_primary BOOLEAN DEFAULT false, -- Primary number for the org
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique phone numbers per org
  UNIQUE(org_id, phone_number)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_phone_numbers_org_id ON phone_numbers(org_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_status ON phone_numbers(org_id, status);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_primary ON phone_numbers(org_id, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_phone_numbers_phone_sid ON phone_numbers(phone_sid) WHERE phone_sid IS NOT NULL;

COMMENT ON TABLE phone_numbers IS 'Stores multiple phone numbers per organization for SMS sending';
COMMENT ON COLUMN phone_numbers.is_primary IS 'Primary phone number for the organization (used as default sender)';
COMMENT ON COLUMN phone_numbers.phone_sid IS 'Twilio Phone Number SID for API operations';

