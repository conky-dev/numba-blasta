-- ============================================================================
-- ADD SOFT_DELETED TO MATERIALIZED VIEW
-- ============================================================================
-- Adds a soft_deleted boolean to the materialized view to mark deleted lists
-- When a list is deleted, we remove the category from all contacts
-- The MV will show the category as soft_deleted = TRUE if it has no active contacts
-- ============================================================================

-- Step 1: Drop and recreate materialized view with soft_deleted column
DROP MATERIALIZED VIEW IF EXISTS contact_category_counts CASCADE;

CREATE MATERIALIZED VIEW contact_category_counts AS
SELECT 
  org_id,
  unnest(category) AS category_name,
  COUNT(*) AS contact_count,
  -- Mark as soft_deleted if all contacts in this category are deleted/opted-out
  BOOL_AND(deleted_at IS NOT NULL OR opted_out_at IS NOT NULL) as soft_deleted
FROM contacts
GROUP BY org_id, unnest(category);

-- Step 2: Recreate unique index for concurrent refresh
CREATE UNIQUE INDEX idx_category_counts_org_unique
ON contact_category_counts (org_id, category_name);

-- Step 3: Initial refresh
REFRESH MATERIALIZED VIEW contact_category_counts;

-- Step 4: Add comment
COMMENT ON MATERIALIZED VIEW contact_category_counts IS 'Cached category counts per organization. soft_deleted=TRUE when all contacts in category are deleted/opted-out.';

-- ============================================================================
-- USAGE:
-- ============================================================================
-- Delete a list (removes category from contacts):
-- UPDATE contacts SET category = array_remove(category, 'ListName') WHERE 'ListName' = ANY(category);
-- Then refresh MV to mark the list as soft_deleted
--
-- Get active lists only:
-- SELECT category_name, SUM(contact_count) 
-- FROM contact_category_counts 
-- WHERE org_id = 'xxx' AND soft_deleted = FALSE
-- GROUP BY category_name;
-- ============================================================================

