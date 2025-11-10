# SMSblast - Twilio SMS Management Platform

A white-labeled SMS platform built on Next.js, React, and Supabase, allowing clients to manage SMS campaigns, contacts, and messaging.

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with JWT
- **Email**: Postmark (for verification & password resets)
- **SMS**: Twilio (with subaccounts, A2P 10DLC compliance)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory (use `env.example` as a template):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Postmark Configuration (for email verification & password resets)
POSTMARK_API_KEY=your-postmark-api-key
POSTMARK_FROM_EMAIL=noreply@yourdomain.com

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret-key
```

### 3. Set Up Supabase Database

1. Create a new Supabase project at https://supabase.com
2. Go to the SQL Editor in your Supabase dashboard
3. Run the SQL files in order from `/app/api/sql/`:
   - `01_user_profiles.sql`
   - `02_audit_logs.sql`
   - `03_admins.sql`

### 4. Create Your First Admin User

After running the SQL migrations, you need to:

1. Sign up through the app (http://localhost:3000/signup)
2. Get your user UUID from Supabase Auth dashboard
3. Run this SQL in Supabase SQL Editor:

```sql
INSERT INTO admins (user_id, role, permissions)
VALUES ('your-user-uuid-here', 'super_admin', '{"full_access": true}'::jsonb);
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
/app
  /(dashboard)          # Protected dashboard routes
  /api                  # API routes
    /auth               # Authentication endpoints
    /sql                # Database schema files
  /signup               # Signup page
  /page.tsx             # Login page
/components
  /modals               # Reusable modal components
/lib
  /supabase.ts          # Client-side Supabase client
  /supabase-server.ts   # Server-side Supabase admin client
```

## Features

### Authentication
- ✅ Email/password signup and login
- ✅ JWT-based session management
- ✅ Automatic user profile creation
- ⏳ Email verification (coming soon)
- ⏳ Password reset (coming soon)

### SMS Management
- ⏳ Quick SMS sending
- ⏳ Campaign management
- ⏳ Template library
- ⏳ Message history
- ⏳ In-app messenger

### Contacts
- ⏳ Contact management
- ⏳ CSV import
- ⏳ Contact groups

### Admin
- ✅ Role-based access control
- ✅ Audit logging
- ⏳ User management dashboard

## Architecture Guidelines

- All API keys and secrets must be behind `/api` routes
- Use `/lib` folder within `/api` for functions using environment keys
- All API endpoints must validate user permissions
- Use Supabase managed password store (never roll your own)
- Use Postmark for email validation/password resets
- Use Twilio webhooks for message reading/status updates

## Development Notes

- **No Emojis**: Use `react-icons` library instead
- **No Alerts**: Use `AlertModal` and `ConfirmModal` components
- **Mobile First**: All pages must be mobile-responsive
- **RLS Enabled**: All database tables use Row Level Security

## License

Proprietary

