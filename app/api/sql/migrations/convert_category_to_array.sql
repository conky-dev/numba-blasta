-- ============================================================================
-- CONVERT CATEGORY TO ARRAY (Multi-Category Support)
-- ============================================================================
-- Converts single category VARCHAR to TEXT[] array for multi-category support
-- Adds GIN index for fast array searches at scale (50k+ contacts)
-- ============================================================================

-- Step 1: Add temporary array column
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS category_array TEXT[];

-- Step 2: Migrate existing data (convert single string to array)
UPDATE contacts 
SET category_array = CASE 
  WHEN category IS NOT NULL AND category != '' 
  THEN ARRAY[category]::TEXT[]
  ELSE ARRAY['General']::TEXT[]
END
WHERE category_array IS NULL;

-- Step 3: Drop old column
ALTER TABLE contacts 
DROP COLUMN IF EXISTS category;

-- Step 4: Rename new column to 'category'
ALTER TABLE contacts 
RENAME COLUMN category_array TO category;

-- Step 5: Set NOT NULL and default
ALTER TABLE contacts 
ALTER COLUMN category SET NOT NULL;

ALTER TABLE contacts 
ALTER COLUMN category SET DEFAULT ARRAY['General']::TEXT[];

-- Step 6: Create GIN index for fast array searches
-- This makes queries like "WHERE category && ARRAY['Seller Lead']" very fast
CREATE INDEX IF NOT EXISTS idx_contacts_category_gin 
ON contacts USING GIN (category);

-- Step 7: Drop old B-tree index if it exists
DROP INDEX IF EXISTS idx_contacts_category;

-- Step 8: Create composite index for common query pattern (org + category)
CREATE INDEX IF NOT EXISTS idx_contacts_org_category 
ON contacts (org_id, deleted_at, opted_out_at) 
WHERE deleted_at IS NULL AND opted_out_at IS NULL;

-- Step 9: Create materialized view for fast category counts
CREATE MATERIALIZED VIEW IF NOT EXISTS contact_category_counts AS
SELECT 
  org_id,
  unnest(category) AS category_name,
  COUNT(*) AS contact_count
FROM contacts
WHERE deleted_at IS NULL AND opted_out_at IS NULL
GROUP BY org_id, unnest(category);

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_category_counts_org 
ON contact_category_counts (org_id, category_name);

-- Step 10: Add helpful comments
COMMENT ON COLUMN contacts.category IS 'Array of categories for flexible contact segmentation. Uses GIN index for fast searches.';
COMMENT ON INDEX idx_contacts_category_gin IS 'GIN index for fast array overlap/contains operations on category column';
COMMENT ON MATERIALIZED VIEW contact_category_counts IS 'Cached category counts per organization. Refresh after bulk imports for performance.';

-- ============================================================================
-- USAGE EXAMPLES:
-- ============================================================================

-- Find contacts with specific category:
-- SELECT * FROM contacts WHERE 'Seller Lead' = ANY(category);

-- Find contacts with ANY of these categories (OR):
-- SELECT * FROM contacts WHERE category && ARRAY['Seller Lead', 'Investor'];

-- Find contacts with ALL of these categories (AND):
-- SELECT * FROM contacts WHERE category @> ARRAY['Seller Lead', 'Motivated Seller'];

-- Get category counts (fast):
-- SELECT category_name, SUM(contact_count) FROM contact_category_counts 
-- WHERE org_id = 'your-org-id' GROUP BY category_name;

-- Refresh counts after bulk import:
-- REFRESH MATERIALIZED VIEW contact_category_counts;

-- ============================================================================

