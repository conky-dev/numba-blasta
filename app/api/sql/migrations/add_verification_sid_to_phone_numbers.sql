-- ============================================================================
-- ADD VERIFICATION SID TO PHONE NUMBERS
-- ============================================================================
-- Adds column to store Twilio verification SID for tracking verification status
-- ============================================================================

ALTER TABLE phone_numbers
ADD COLUMN IF NOT EXISTS verification_sid TEXT;

CREATE INDEX IF NOT EXISTS idx_phone_numbers_verification_sid 
  ON phone_numbers(verification_sid) 
  WHERE verification_sid IS NOT NULL;

COMMENT ON COLUMN phone_numbers.verification_sid IS 'Twilio Toll-Free Verification SID for tracking verification status';

