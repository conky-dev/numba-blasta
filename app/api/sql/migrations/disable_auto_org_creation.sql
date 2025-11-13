-- ============================================================================
-- DISABLE AUTO-ORG CREATION ON SIGNUP
-- ============================================================================
-- This migration removes the trigger that automatically creates an org
-- when a user signs up. Users will now choose to CREATE or JOIN an org
-- via the onboarding flow.
-- ============================================================================

-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS create_user_organization();

-- ============================================================================
-- NOTES:
-- - Existing users keep their orgs (no data changes)
-- - New users (after this migration) must go through onboarding
-- - Users without an org will be redirected to /onboarding
-- ============================================================================

