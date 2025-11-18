-- ============================================================================
-- ADD CUSTOM MESSAGE RATES TO USER_PROFILES
-- ============================================================================
-- Adds columns to user_profiles to allow custom pricing per user/organization
-- These rates override the default pricing from the pricing table when set
-- ============================================================================

-- Add custom rate columns (nullable - if NULL, use default pricing)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS custom_rate_inbound_message DECIMAL(10, 4) NULL,
ADD COLUMN IF NOT EXISTS custom_rate_outbound_message DECIMAL(10, 4) NULL,
ADD COLUMN IF NOT EXISTS custom_rate_outbound_message_long DECIMAL(10, 4) NULL;

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.custom_rate_inbound_message IS 
  'Custom rate per inbound SMS message (in USD). If NULL, uses default pricing from pricing table.';

COMMENT ON COLUMN user_profiles.custom_rate_outbound_message IS 
  'Custom rate per outbound SMS message under 140 characters (in USD). If NULL, uses default pricing from pricing table.';

COMMENT ON COLUMN user_profiles.custom_rate_outbound_message_long IS 
  'Custom rate per outbound SMS message over 140 characters (in USD). If NULL, uses default pricing from pricing table.';

-- Add check constraints to ensure rates are non-negative
ALTER TABLE user_profiles
ADD CONSTRAINT check_custom_rate_inbound_message_non_negative 
  CHECK (custom_rate_inbound_message IS NULL OR custom_rate_inbound_message >= 0);

ALTER TABLE user_profiles
ADD CONSTRAINT check_custom_rate_outbound_message_non_negative 
  CHECK (custom_rate_outbound_message IS NULL OR custom_rate_outbound_message >= 0);

ALTER TABLE user_profiles
ADD CONSTRAINT check_custom_rate_outbound_message_long_non_negative 
  CHECK (custom_rate_outbound_message_long IS NULL OR custom_rate_outbound_message_long >= 0);

-- Create index for users with custom rates (for efficient lookups)
CREATE INDEX IF NOT EXISTS idx_user_profiles_has_custom_rates 
  ON user_profiles(user_id) 
  WHERE custom_rate_inbound_message IS NOT NULL 
     OR custom_rate_outbound_message IS NOT NULL 
     OR custom_rate_outbound_message_long IS NOT NULL;

-- ============================================================================
-- USAGE NOTES:
-- ============================================================================
-- To set custom rates for a user:
--   UPDATE user_profiles 
--   SET custom_rate_inbound_message = 0.004,
--       custom_rate_outbound_message = 0.006,
--       custom_rate_outbound_message_long = 0.012
--   WHERE user_id = 'user-uuid-here';
--
-- To reset to default pricing:
--   UPDATE user_profiles 
--   SET custom_rate_inbound_message = NULL,
--       custom_rate_outbound_message = NULL,
--       custom_rate_outbound_message_long = NULL
--   WHERE user_id = 'user-uuid-here';
-- ============================================================================

