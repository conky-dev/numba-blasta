-- ============================================================================
-- SELECT CONTACTS BY CATEGORY
-- ============================================================================
-- Query to select contacts where category array contains "Beast Picks"
-- Uses PostgreSQL array overlap operator (&&) for efficient matching
-- ============================================================================

-- Basic query: Select all contacts with "Beast Picks" category
SELECT *
FROM contacts
WHERE category && ARRAY['Beast Picks']::TEXT[]
  AND deleted_at IS NULL;

-- With organization filter (recommended for multi-tenant)
SELECT *
FROM contacts
WHERE org_id = 'your-org-id-here'::UUID
  AND category && ARRAY['Beast Picks']::TEXT[]
  AND deleted_at IS NULL
  AND opted_out_at IS NULL;  -- Exclude opted-out contacts

-- Count contacts with "Beast Picks" category
SELECT COUNT(*) as contact_count
FROM contacts
WHERE category && ARRAY['Beast Picks']::TEXT[]
  AND deleted_at IS NULL;

-- Select specific columns with "Beast Picks" category
SELECT 
  id,
  first_name,
  last_name,
  phone,
  email,
  category,
  created_at
FROM contacts
WHERE category && ARRAY['Beast Picks']::TEXT[]
  AND deleted_at IS NULL
ORDER BY created_at DESC;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- The && operator checks if arrays have any elements in common (overlap)
-- This works because contacts can have multiple categories in the array
-- 
-- Alternative operators:
--   @>  : Left array contains all elements of right array
--   <@  : Left array is contained by right array
--   &&  : Arrays have elements in common (overlap) - RECOMMENDED
-- ============================================================================

