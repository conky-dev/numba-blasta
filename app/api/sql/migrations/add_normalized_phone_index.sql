-- ============================================================================
-- Add index on normalized phone for faster webhook lookups
-- ============================================================================
-- This speeds up inbound webhook matching by normalizing phone to last 10 digits
-- ============================================================================

-- Create expression index on normalized last 10 digits of phone
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_normalized_phone_last10
  ON contacts (RIGHT(regexp_replace(phone, '\D', '', 'g'), 10))
  WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_contacts_normalized_phone_last10 IS 
  'Index on last 10 digits of phone (all non-digits stripped) for fast webhook matching';

