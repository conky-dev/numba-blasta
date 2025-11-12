# 🔐 Environment Variables for Railway Worker

Copy these environment variables to your Railway project.

## Required Variables

```bash
# Redis (from Upstash)
REDIS_URL=rediss://default:YOUR_PASSWORD@host.upstash.io:6379

# Database (from Supabase)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxx.supabase.co:5432/postgres

# Twilio (for SMS sending)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Optional Variables

```bash
# Environment
NODE_ENV=production

# Logging
LOG_LEVEL=info
```

---

## 📋 Where to Find Each Value

### **REDIS_URL** (Upstash)
1. Go to https://console.upstash.com/
2. Select your Redis database
3. Scroll to **"Connect your database"**
4. Copy the **TLS (Node)** connection string
5. Should start with `rediss://` (double 's')

### **DATABASE_URL** (Supabase)
1. Go to your Supabase project
2. Settings → Database
3. Copy **Connection string** → **URI**
4. Replace `[YOUR-PASSWORD]` with your actual password

### **TWILIO_ACCOUNT_SID** (Twilio)
1. Go to https://console.twilio.com/
2. Copy from dashboard home page
3. Starts with `AC`

### **TWILIO_AUTH_TOKEN** (Twilio)
1. Same page as Account SID
2. Click "Show" to reveal
3. 32 character string

### **TWILIO_MESSAGING_SERVICE_SID** (Twilio)
1. Go to Messaging → Services
2. Select your messaging service
3. Copy the Service SID
4. Starts with `MG`

---

## ✅ Quick Check

Make sure:
- [x] All URLs have no extra spaces
- [x] REDIS_URL has `rediss://` (double 's')
- [x] DATABASE_URL has password filled in
- [x] Twilio SIDs start with correct prefix (AC, MG)
- [x] No quotes around values in Railway

---

## 🎯 How to Add in Railway

### **Via Dashboard:**
1. Open your Railway project
2. Click **"Variables"** tab
3. Click **"New Variable"**
4. Paste variable name (e.g., `REDIS_URL`)
5. Paste value
6. Click **"Add"**
7. Repeat for each variable

### **Via CLI:**
```bash
railway variables set REDIS_URL="rediss://..."
railway variables set DATABASE_URL="postgresql://..."
railway variables set TWILIO_ACCOUNT_SID="AC..."
railway variables set TWILIO_AUTH_TOKEN="..."
railway variables set TWILIO_MESSAGING_SERVICE_SID="MG..."
```

---

## 🔒 Security Note

**Never commit these values to Git!**

✅ Store in:
- Railway Variables
- Vercel Environment Variables
- Local `.env.local` (gitignored)

❌ Never in:
- Source code
- README files
- Public repositories

