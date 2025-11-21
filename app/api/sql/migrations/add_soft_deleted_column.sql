-- ============================================================================
-- ADD SOFT_DELETED COLUMN TO CONTACTS
-- ============================================================================
-- Adds a soft_deleted boolean flag to distinguish between:
-- - deleted_at: Invalid numbers, errors from Twilio
-- - soft_deleted: User-initiated soft delete of entire lists
-- 
-- This allows filtering out soft-deleted contacts from materialized view
-- while keeping the list visible with accurate stats
-- ============================================================================

-- Step 1: Add soft_deleted column
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS soft_deleted BOOLEAN DEFAULT FALSE NOT NULL;

-- Step 2: Create index for fast filtering
CREATE INDEX IF NOT EXISTS idx_contacts_soft_deleted 
ON contacts (org_id, soft_deleted) 
WHERE soft_deleted = FALSE;

-- Step 3: Update existing deleted_at contacts to be soft_deleted if needed
-- (Optional - only run if you want to mark existing deleted contacts as soft-deleted)
-- UPDATE contacts SET soft_deleted = TRUE WHERE deleted_at IS NOT NULL;

-- Step 4: Drop and recreate materialized view to exclude soft_deleted contacts
DROP MATERIALIZED VIEW IF EXISTS contact_category_counts CASCADE;

CREATE MATERIALIZED VIEW contact_category_counts AS
SELECT 
  org_id,
  unnest(category) AS category_name,
  COUNT(*) AS contact_count
FROM contacts
WHERE deleted_at IS NULL 
  AND opted_out_at IS NULL 
  AND soft_deleted = FALSE  -- Exclude soft-deleted contacts
GROUP BY org_id, unnest(category);

-- Step 5: Recreate unique index for concurrent refresh
CREATE UNIQUE INDEX idx_category_counts_org_unique
ON contact_category_counts (org_id, category_name);

-- Step 6: Initial refresh
REFRESH MATERIALIZED VIEW contact_category_counts;

-- Step 7: Add comment
COMMENT ON COLUMN contacts.soft_deleted IS 'User-initiated soft delete flag. When TRUE, contact is excluded from category counts but data is preserved.';
COMMENT ON MATERIALIZED VIEW contact_category_counts IS 'Cached category counts per organization. Excludes deleted_at, opted_out_at, and soft_deleted contacts.';

-- ============================================================================
-- USAGE:
-- ============================================================================
-- Soft delete entire list:
-- UPDATE contacts SET soft_deleted = TRUE WHERE 'ListName' = ANY(category);
--
-- Restore soft-deleted contacts:
-- UPDATE contacts SET soft_deleted = FALSE WHERE id = 'contact-id';
--
-- Get all contacts including soft-deleted:
-- SELECT * FROM contacts WHERE org_id = 'xxx';
--
-- Get only active contacts (what MV shows):
-- SELECT * FROM contacts 
-- WHERE org_id = 'xxx' 
--   AND deleted_at IS NULL 
--   AND opted_out_at IS NULL 
--   AND soft_deleted = FALSE;
-- ============================================================================

