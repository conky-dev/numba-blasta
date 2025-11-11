-- Quick Setup: Assign Your User to an Organization
-- Run this in Supabase SQL Editor to fix the "Unauthorized" error

-- Step 1: Check your current user info
SELECT 
  u.id as user_id,
  u.email,
  u.created_at,
  o.id as org_id,
  o.name as org_name,
  om.role
FROM auth.users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.org_id = o.id
ORDER BY u.created_at DESC
LIMIT 5;

-- If you see NULL for org_id, run Step 2 below
-- Replace YOUR_EMAIL_HERE with your actual email address

-- Step 2: Auto-setup organization for your user
DO $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_org_id UUID;
BEGIN
  -- Get your user (CHANGE THIS EMAIL!)
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users
  WHERE email = 'YOUR_EMAIL_HERE'  -- ⚠️ CHANGE THIS!
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found! Check your email address.';
  END IF;

  -- Check if user already has an organization
  SELECT org_id INTO v_org_id
  FROM organization_members
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    RAISE NOTICE 'User already has an organization: %', v_org_id;
  ELSE
    -- Create organization for this user
    INSERT INTO organizations (name, email)
    VALUES (v_user_email || '''s Organization', v_user_email)
    RETURNING id INTO v_org_id;

    -- Add user as organization owner
    INSERT INTO organization_members (org_id, user_id, role)
    VALUES (v_org_id, v_user_id, 'owner');

    -- Make user a super admin (optional but helpful)
    INSERT INTO admins (user_id, role, permissions, granted_by)
    VALUES (
      v_user_id,
      'super_admin',
      '["all"]'::jsonb,
      v_user_id
    )
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE '✅ Success! Organization created: %', v_org_id;
    RAISE NOTICE '✅ User added as owner';
    RAISE NOTICE '✅ User granted super_admin role';
  END IF;
END $$;

-- Step 3: Verify setup
SELECT 
  u.id as user_id,
  u.email,
  o.id as org_id,
  o.name as org_name,
  om.role as org_role,
  a.role as admin_role
FROM auth.users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.org_id = o.id
LEFT JOIN admins a ON u.id = a.user_id
WHERE u.email = 'YOUR_EMAIL_HERE'  -- ⚠️ CHANGE THIS!
LIMIT 1;

-- You should now see:
-- ✅ org_id: (a UUID)
-- ✅ org_name: "your@email.com's Organization"
-- ✅ org_role: owner
-- ✅ admin_role: super_admin

-- After running this:
-- 1. Log out of the app
-- 2. Log back in
-- 3. Try editing a contact again - should work now! 🎉

