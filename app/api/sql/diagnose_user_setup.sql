-- Diagnostic Query: Check if user is properly set up
-- Run this in Supabase SQL Editor to check your setup

-- 1. Check if user exists in auth.users
SELECT 
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if user has an organization
SELECT 
  u.id as user_id,
  u.email,
  o.id as org_id,
  o.name as org_name,
  om.role
FROM auth.users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.org_id = o.id
ORDER BY u.created_at DESC
LIMIT 5;

-- 3. If you see NULL org_id above, run the setup script:
-- Replace 'YOUR_USER_ID' and 'YOUR_EMAIL' with values from query #1

-- DO $$
-- DECLARE
--   v_user_id UUID := 'YOUR_USER_ID';  -- From query #1
--   v_user_email TEXT := 'YOUR_EMAIL'; -- From query #1
--   v_org_id UUID;
-- BEGIN
--   -- Create organization
--   INSERT INTO organizations (name, email)
--   VALUES (v_user_email || '''s Organization', v_user_email)
--   RETURNING id INTO v_org_id;
  
--   -- Add user as owner
--   INSERT INTO organization_members (org_id, user_id, role)
--   VALUES (v_org_id, v_user_id, 'owner')
--   ON CONFLICT (org_id, user_id) DO NOTHING;
  
--   RAISE NOTICE 'Organization created: %', v_org_id;
-- END $$;

