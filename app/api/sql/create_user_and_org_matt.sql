-- ============================================================================
-- CREATE USER AND ORGANIZATION FOR MATT
-- ============================================================================
-- Creates a new user with email: Soles4christ@gmail.com
-- Password: dummy
-- Organization: Matt
-- 
-- NOTE: This script uses PostgreSQL's crypt() function which should be
-- compatible with bcryptjs. However, for exact compatibility with the app,
-- consider using the Node.js script instead: tsx scripts/create-user-matt.ts
-- ============================================================================

-- Enable pgcrypto extension for password hashing (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Generate user ID
DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_hashed_password TEXT;
  v_email TEXT := 'soles4christ@gmail.com';
  v_org_name TEXT := 'Matt';
BEGIN
  -- Hash the password using bcrypt (10 rounds)
  -- Note: crypt() with 'bf' (blowfish) produces bcrypt-compatible hashes
  -- This should work with bcryptjs.compare() used in the app
  v_hashed_password := crypt('dummy', gen_salt('bf', 10));

  -- Step 1: Check if user already exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  -- Step 2: Create or update user in auth.users
  IF v_user_id IS NULL THEN
    -- User doesn't exist, create new one
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      raw_user_meta_data,
      email_confirmed_at,
      aud,
      role,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id,
      v_email,
      v_hashed_password,
      '{"full_name": ""}'::jsonb,
      NOW(), -- Auto-confirm email so they can login immediately
      'authenticated',
      'authenticated',
      NOW(),
      NOW()
    );
  ELSE
    -- User exists, update password and confirm email
    UPDATE auth.users
    SET
      encrypted_password = v_hashed_password,
      email_confirmed_at = NOW(),
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  RAISE NOTICE 'User created/updated: % (ID: %)', v_email, v_user_id;

  -- Step 3: Wait a moment for trigger to create user_profiles
  PERFORM pg_sleep(0.2);

  -- Step 4: Ensure user_profiles exists (trigger should create it, but just in case)
  INSERT INTO user_profiles (user_id, full_name, sms_balance)
  VALUES (v_user_id, '', 0.00)
  ON CONFLICT (user_id) DO NOTHING;

  -- Step 5: Create organization (check if exists first)
  SELECT id INTO v_org_id
  FROM organizations
  WHERE name = v_org_name
  LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO organizations (name, email, status, balance_cents, currency)
    VALUES (
      v_org_name,
      v_email,
      'active',
      0,
      'USD'
    )
    RETURNING id INTO v_org_id;
  END IF;

  RAISE NOTICE 'Organization created/found: % (ID: %)', v_org_name, v_org_id;

  -- Step 6: Link user to organization as owner
  INSERT INTO organization_members (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'owner')
  ON CONFLICT (org_id, user_id) DO UPDATE
  SET role = 'owner';

  RAISE NOTICE 'User linked to organization as owner';

  -- Step 7: Verification - Display created records
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SETUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User Email: %', v_email;
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Organization: %', v_org_name;
  RAISE NOTICE 'Organization ID: %', v_org_id;
  RAISE NOTICE 'Password: dummy';
  RAISE NOTICE '========================================';
END $$;

-- Verification query
SELECT 
  u.id as user_id,
  u.email,
  u.email_confirmed_at,
  up.full_name,
  o.id as org_id,
  o.name as org_name,
  om.role as org_role
FROM auth.users u
LEFT JOIN user_profiles up ON up.user_id = u.id
LEFT JOIN organization_members om ON om.user_id = u.id
LEFT JOIN organizations o ON o.id = om.org_id
WHERE u.email = 'soles4christ@gmail.com';

