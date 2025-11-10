# SQL Database Schema

This directory contains the SQL schema files for the SMSblast application. These files should be run in order in your Supabase SQL editor.

## Files

1. **01_user_profiles.sql** - User profile data extending Supabase Auth
   - Basic user info (name, phone)
   - SMS balance tracking
   - Twilio subaccount credentials
   - Auto-creates profile on user signup

2. **02_audit_logs.sql** - Audit logging for security and debugging
   - Tracks important user actions
   - Immutable logs for compliance
   - Users can only view their own logs

3. **03_admins.sql** - Admin privilege management
   - Tracks which users have admin access
   - Role-based permissions (admin, super_admin)
   - Helper functions: `is_admin()` and `is_super_admin()`
   - Only admins can view, only super admins can modify

## Setup Instructions

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run each file in order (01, 02, 03)
4. Verify tables are created successfully
5. Manually insert your first super admin:
   ```sql
   INSERT INTO admins (user_id, role, permissions)
   VALUES ('your-user-uuid-here', 'super_admin', '{"full_access": true}'::jsonb);
   ```

## Admin Roles

- **admin** - Basic admin privileges (view users, manage campaigns, etc.)
- **super_admin** - Full privileges (can grant/revoke admin access, system config, etc.)

## Helper Functions

- `is_admin(user_id)` - Returns true if user is any type of admin
- `is_super_admin(user_id)` - Returns true if user is a super admin

Use these in your API endpoints to check permissions:
```typescript
const isAdmin = await supabase.rpc('is_admin', { check_user_id: userId });
```

## Notes

- All tables use Row Level Security (RLS)
- Supabase Auth (`auth.users`) is the source of truth for authentication
- Email verification and sessions are handled natively by Supabase
- The `user_profiles` table extends user data with app-specific fields
- Audit logs are insert-only for security and compliance
- Admin table tracks who granted admin privileges for accountability
