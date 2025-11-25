-- ============================================================================
-- CLEANUP EMPTY CATEGORY CONTACTS
-- ============================================================================
-- This script marks contacts with empty category arrays as deleted
-- These are "orphan" contacts that lost all their categories but weren't deleted
-- ============================================================================

-- Mark contacts with empty category arrays as deleted
UPDATE contacts
SET 
  deleted_at = NOW(),
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND (
    category IS NULL 
    OR array_length(category, 1) IS NULL 
    OR array_length(category, 1) = 0
  )
RETURNING 
  id,
  org_id,
  phone,
  first_name,
  last_name,
  category;

-- Show summary of affected contacts
SELECT 
  org_id,
  COUNT(*) as contacts_deleted
FROM contacts
WHERE deleted_at IS NOT NULL
  AND deleted_at >= NOW() - INTERVAL '5 seconds'
GROUP BY org_id;

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY contact_category_counts;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this after to verify no contacts with empty categories remain:
-- 
-- SELECT COUNT(*) as remaining_empty_contacts
-- FROM contacts
-- WHERE deleted_at IS NULL
--   AND (
--     category IS NULL 
--     OR array_length(category, 1) IS NULL 
--     OR array_length(category, 1) = 0
--   );
-- 
-- Should return 0
-- ============================================================================

