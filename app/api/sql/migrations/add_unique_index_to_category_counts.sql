-- Add unique index to contact_category_counts materialized view
-- This allows us to use REFRESH MATERIALIZED VIEW CONCURRENTLY for faster updates

-- Drop existing non-unique index
DROP INDEX IF EXISTS idx_category_counts_org;

-- Create unique index (required for CONCURRENTLY refresh)
-- This is safe because the combination of org_id and category_name is unique in the view
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_counts_org_unique
ON contact_category_counts (org_id, category_name);

-- Initial refresh to populate the view
REFRESH MATERIALIZED VIEW contact_category_counts;

