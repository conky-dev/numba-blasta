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

4. **04_organizations.sql** - Organization/account management
   - Core entity for multi-tenancy (all resources scoped to org)
   - Auto-creates org for each new user (1 user = 1 org for now)
   - Stores billing balance and Twilio credentials at org level
   - Organization members with roles (owner, admin, member)
   - Helper functions: `get_user_org_id()`, `is_org_owner()`, `is_org_admin()`

5. **05_sms_templates.sql** - SMS message templates
   - Reusable message templates with variable placeholders (e.g., `{{firstName}}`)
   - Org-scoped templates
   - Soft delete support
   - Full-text search on name and content
   - Tracks creator and timestamps

6. **06_sms_campaigns.sql** - SMS campaign management
   - Campaign configuration (name, message, template, schedule)
   - Status tracking (draft, scheduled, running, paused, done, failed)
   - Metrics caching (sent, delivered, failed, replied counts)
   - Links to templates and contact lists
   - Helper functions: `is_campaign_editable()`, `get_campaign_metrics()`

7. **07_contacts.sql** - Contact management
   - Store contacts with phone, name, email
   - Org-scoped with unique phone per org
   - Opt-out tracking
   - Soft delete support
   - Full-text search on name, email, phone

8. **08_billing_balance.sql** - Billing and balance management
   - SMS credit balance tracking (adds `sms_balance` to organizations)
   - Full transaction history (purchases, SMS sends, refunds)
   - Helper functions: `add_credits()`, `deduct_credits()`, `has_sufficient_balance()`
   - Prevents negative balance
   - Atomic transactions with row locking

## Setup Instructions

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run each file in order (01, 02, 03, 04, 05, 06, 07, 08)
4. Verify tables are created successfully
5. Use `setup_existing_user.sql` to assign your user to an org if needed

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
