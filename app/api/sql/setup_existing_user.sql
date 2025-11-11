-- Script to set up existing user with organization and admin access
-- User: Lucas McQuiston
-- User ID: 78771644-d115-4214-ba3b-e8295e338ce7
-- Organization: Tech Toad

-- Step 1: Create the "Tech Toad" organization
INSERT INTO organizations (name, email, balance_cents, currency, status)
VALUES (
  'Tech Toad',
  (SELECT email FROM auth.users WHERE id = '78771644-d115-4214-ba3b-e8295e338ce7'),
  0,
  'USD',
  'active'
)
ON CONFLICT DO NOTHING
RETURNING id;

-- Get the org_id (you'll need to note this for the next steps)
-- If the above INSERT already existed, run this to get the org_id:
-- SELECT id FROM organizations WHERE name = 'Tech Toad';

-- Step 2: Add user as owner of the organization
-- Replace YOUR_ORG_ID_HERE with the actual UUID from Step 1
INSERT INTO organization_members (org_id, user_id, role)
VALUES (
  (SELECT id FROM organizations WHERE name = 'Tech Toad' LIMIT 1),
  '78771644-d115-4214-ba3b-e8295e338ce7',
  'owner'
)
ON CONFLICT (org_id, user_id) DO UPDATE
  SET role = 'owner';

-- Step 3: Make user a super admin
INSERT INTO admins (user_id, role, permissions, granted_by)
VALUES (
  '78771644-d115-4214-ba3b-e8295e338ce7',
  'super_admin',
  '{"full_access": true}'::jsonb,
  '78771644-d115-4214-ba3b-e8295e338ce7' -- Self-granted for first admin
)
ON CONFLICT (user_id) DO UPDATE
  SET role = 'super_admin',
      permissions = '{"full_access": true}'::jsonb;

-- Verification queries
SELECT 
  u.id as user_id,
  u.email,
  up.full_name,
  o.id as org_id,
  o.name as org_name,
  om.role as org_role,
  a.role as admin_role
FROM auth.users u
LEFT JOIN user_profiles up ON up.user_id = u.id
LEFT JOIN organization_members om ON om.user_id = u.id
LEFT JOIN organizations o ON o.id = om.org_id
LEFT JOIN admins a ON a.user_id = u.id
WHERE u.id = '78771644-d115-4214-ba3b-e8295e338ce7';

-- Expected output:
-- user_id: 78771644-d115-4214-ba3b-e8295e338ce7
-- email: (user's email)
-- full_name: Lucas McQuiston
-- org_id: (new UUID)
-- org_name: Tech Toad
-- org_role: owner
-- admin_role: super_admin

