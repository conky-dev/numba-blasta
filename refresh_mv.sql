-- Refresh the contact_category_counts materialized view
-- This updates the cached counts of contacts per category

REFRESH MATERIALIZED VIEW CONCURRENTLY contact_category_counts;

-- Verify the refresh
SELECT 
  category,
  contact_count,
  last_refreshed
FROM contact_category_counts
ORDER BY contact_count DESC;

