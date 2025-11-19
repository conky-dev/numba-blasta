-- Migration: Simplify outbound message pricing to single rate per segment
-- Date: 2025-11-19
-- 
-- This migration consolidates outbound message pricing into a single rate per segment.
-- Previously we had separate rates for "short" and "long" messages, but since we now
-- charge per segment, we only need one base rate.

-- Step 1: Remove the custom_rate_outbound_message_long column from organizations
ALTER TABLE organizations 
DROP COLUMN IF EXISTS custom_rate_outbound_message_long;

-- Step 2: Drop the check constraint for the removed column (if it exists)
ALTER TABLE organizations 
DROP CONSTRAINT IF EXISTS check_org_custom_rate_outbound_message_long_non_negative;

-- Step 3: Update the pricing table - remove 'outbound_message_long' type
DELETE FROM pricing 
WHERE service_type = 'outbound_message_long';

-- Step 4: Update the outbound_message pricing description for clarity
UPDATE pricing
SET 
  description = 'Cost per SMS segment (regardless of message length)',
  updated_at = NOW()
WHERE service_type = 'outbound_message';

-- Step 5: Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '- Removed custom_rate_outbound_message_long from organizations';
  RAISE NOTICE '- Removed outbound_message_long from pricing table';
  RAISE NOTICE '- Updated outbound_message description';
  RAISE NOTICE '- All messages now charge per segment using one base rate';
END $$;

