-- ============================================================================
-- MIGRATE EXISTING PHONE NUMBERS
-- ============================================================================
-- Migrates phone numbers from organizations.sms_sender_number to phone_numbers table
-- This ensures organizations with existing numbers are migrated to the new structure
-- ============================================================================

-- Migrate existing phone numbers from organizations table to phone_numbers table
INSERT INTO phone_numbers (org_id, phone_number, type, status, is_primary, created_at, updated_at)
SELECT 
  id AS org_id,
  sms_sender_number AS phone_number,
  'toll-free' AS type, -- Default to toll-free for existing numbers
  COALESCE(sms_sender_status, 'none') AS status,
  true AS is_primary, -- All existing numbers are primary (they were the only one)
  COALESCE(updated_at, created_at, NOW()) AS created_at,
  NOW() AS updated_at
FROM organizations
WHERE sms_sender_number IS NOT NULL 
  AND sms_sender_number != ''
  -- Only insert if not already migrated (avoid duplicates)
  AND NOT EXISTS (
    SELECT 1 
    FROM phone_numbers pn 
    WHERE pn.org_id = organizations.id 
      AND pn.phone_number = organizations.sms_sender_number
  );

-- Log migration results
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM phone_numbers
  WHERE is_primary = true;
  
  RAISE NOTICE 'Migrated % phone numbers from organizations table to phone_numbers table', migrated_count;
END $$;

