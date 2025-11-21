-- ============================================================================
-- REMOVE SOFT_DELETED COLUMN FROM CONTACTS (IF EXISTS)
-- ============================================================================
-- This script removes the soft_deleted column from contacts table if it was
-- accidentally added during earlier testing/implementation
-- ============================================================================

-- Remove the column if it exists
ALTER TABLE contacts 
DROP COLUMN IF EXISTS soft_deleted;

-- Remove the index if it exists
DROP INDEX IF EXISTS idx_contacts_soft_deleted;

-- Done!
SELECT 'soft_deleted column and index removed from contacts table (if they existed)' as result;

