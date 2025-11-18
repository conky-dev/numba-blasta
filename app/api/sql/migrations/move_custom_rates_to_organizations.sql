-- ============================================================================
-- MOVE CUSTOM MESSAGE RATES FROM USER_PROFILES TO ORGANIZATIONS
-- ============================================================================
-- Moves custom pricing columns from user_profiles to organizations table
-- This makes more sense as pricing should be per organization, not per user
-- ============================================================================

-- Step 1: Drop columns from user_profiles
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS custom_rate_inbound_message,
DROP COLUMN IF EXISTS custom_rate_outbound_message,
DROP COLUMN IF EXISTS custom_rate_outbound_message_long;

-- Step 2: Drop constraints from user_profiles (if they exist)
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS check_custom_rate_inbound_message_non_negative;

ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS check_custom_rate_outbound_message_non_negative;

ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS check_custom_rate_outbound_message_long_non_negative;

-- Step 3: Drop the index from user_profiles (if it exists)
DROP INDEX IF EXISTS idx_user_profiles_has_custom_rates;

-- Step 4: Add custom rate columns to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS custom_rate_inbound_message DECIMAL(10, 4) NULL,
ADD COLUMN IF NOT EXISTS custom_rate_outbound_message DECIMAL(10, 4) NULL,
ADD COLUMN IF NOT EXISTS custom_rate_outbound_message_long DECIMAL(10, 4) NULL;

-- Add comments for documentation
COMMENT ON COLUMN organizations.custom_rate_inbound_message IS 
  'Custom rate per inbound SMS message (in USD). If NULL, uses default pricing from pricing table.';

COMMENT ON COLUMN organizations.custom_rate_outbound_message IS 
  'Custom rate per outbound SMS message under 140 characters (in USD). If NULL, uses default pricing from pricing table.';

COMMENT ON COLUMN organizations.custom_rate_outbound_message_long IS 
  'Custom rate per outbound SMS message over 140 characters (in USD). If NULL, uses default pricing from pricing table.';

-- Step 5: Add check constraints to ensure rates are non-negative
ALTER TABLE organizations
ADD CONSTRAINT check_org_custom_rate_inbound_message_non_negative 
  CHECK (custom_rate_inbound_message IS NULL OR custom_rate_inbound_message >= 0);

ALTER TABLE organizations
ADD CONSTRAINT check_org_custom_rate_outbound_message_non_negative 
  CHECK (custom_rate_outbound_message IS NULL OR custom_rate_outbound_message >= 0);

ALTER TABLE organizations
ADD CONSTRAINT check_org_custom_rate_outbound_message_long_non_negative 
  CHECK (custom_rate_outbound_message_long IS NULL OR custom_rate_outbound_message_long >= 0);

-- Step 6: Create index for organizations with custom rates
CREATE INDEX IF NOT EXISTS idx_organizations_has_custom_rates 
  ON organizations(id) 
  WHERE custom_rate_inbound_message IS NOT NULL 
     OR custom_rate_outbound_message IS NOT NULL 
     OR custom_rate_outbound_message_long IS NOT NULL;

-- ============================================================================
-- USAGE NOTES:
-- ============================================================================
-- To set custom rates for an organization:
--   UPDATE organizations 
--   SET custom_rate_inbound_message = 0.004,
--       custom_rate_outbound_message = 0.006,
--       custom_rate_outbound_message_long = 0.012
--   WHERE id = 'org-uuid-here';
--
-- To reset to default pricing:
--   UPDATE organizations 
--   SET custom_rate_inbound_message = NULL,
--       custom_rate_outbound_message = NULL,
--       custom_rate_outbound_message_long = NULL
--   WHERE id = 'org-uuid-here';
-- ============================================================================

