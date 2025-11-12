# 🚂 Deploying Worker to Railway

Quick guide to deploy your SMS worker to Railway.

---

## 🚀 Quick Setup (5 minutes)

### **Step 1: Push to GitHub**

Make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "Add SMS queue worker"
git push
```

---

### **Step 2: Create Railway Project**

1. Go to **https://railway.app**
2. Click **"Start a New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository: `numba-blasta`
5. Railway will detect it's a Node.js project

---

### **Step 3: Configure Environment Variables**

In Railway dashboard, go to **Variables** tab and add:

```bash
# Required
REDIS_URL=rediss://default:YOUR_PASSWORD@host.upstash.io:6379
DATABASE_URL=postgresql://postgres:...@db.xxx.supabase.co:5432/postgres

# Twilio (for when you enable real sending)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_MESSAGING_SERVICE_SID=MGxxxxx

# Optional
NODE_ENV=production
```

**💡 Tip:** Copy these from your `.env.local` file!

---

### **Step 4: Deploy!**

Railway will automatically:
1. ✅ Install dependencies (`npm install`)
2. ✅ Start worker (`npm run worker`)
3. ✅ Keep it running 24/7

Check the **Deployments** tab - you should see it building!

---

## 📊 Verify It's Working

### **1. Check Logs**

In Railway dashboard:
- Go to **Deployments** tab
- Click latest deployment
- View logs

You should see:
```
🚀 Starting SMS Worker...
📦 Redis: host.upstash.io:6379
💾 Database: Supabase
[WORKER] SMS Worker started, waiting for jobs...
```

### **2. Send a Test SMS**

From your Vercel app (or local):
1. Go to `/sms/quick`
2. Send a message
3. Check Railway logs

You should see:
```
[WORKER] Processing job 1 for +1234567890
[WORKER] Simulating send to +1234567890
[WORKER] ✅ Job 1 completed successfully
```

---

## 🎛️ Railway Dashboard Overview

```
Your Project
├─ Deployments      (View logs, redeploy)
├─ Variables        (Environment variables)
├─ Settings         
│   ├─ Start Command: npm run worker
│   └─ Auto-deploy: ON
├─ Metrics          (CPU, Memory usage)
└─ Logs             (Real-time worker output)
```

---

## 💰 Pricing

**Free Trial:**
- $5 credit (lasts 1-2 months for worker)
- No credit card required

**After Free Trial:**
- ~$5-10/month for worker
- Pay-as-you-go
- Can pause anytime

---

## 🔧 Common Issues

### **Worker Not Starting**

**Error:** `Cannot find module 'tsx'`

**Fix:** Make sure `tsx` is in `devDependencies`:
```json
"devDependencies": {
  "tsx": "^4.20.6"
}
```

### **Redis Connection Failed**

**Error:** `ECONNREFUSED`

**Fix:** Check `REDIS_URL` in Railway variables:
- Should start with `rediss://` (double 's')
- Copy from Upstash dashboard

### **Database Connection Failed**

**Error:** `Connection terminated unexpectedly`

**Fix:** Check `DATABASE_URL`:
- Should be full Supabase connection string
- Include password and port

---

## 📈 Monitoring

### **Check Worker Health**

```bash
# View logs
railway logs

# Or in Railway dashboard:
Deployments → Latest → Logs
```

### **What to Look For**

✅ **Healthy:**
```
[WORKER] SMS Worker started, waiting for jobs...
[WORKER] Processing job 123...
[WORKER] ✅ Job 123 completed
```

❌ **Problems:**
```
Error: ECONNREFUSED     → Redis issue
Error: authentication   → Database issue
Exited with code 1      → Check logs for error
```

---

## 🔄 Updates & Redeployment

### **Auto-Deploy (Recommended)**

Railway auto-deploys when you push to GitHub:

```bash
git add .
git commit -m "Update worker"
git push
# Railway automatically redeploys! 🎉
```

### **Manual Deploy**

In Railway dashboard:
1. Go to **Deployments**
2. Click **"Deploy"** button
3. Select branch/commit

---

## 🎯 Architecture Overview

```
┌─────────────┐
│   Vercel    │  (Next.js App)
│  (Web/API)  │
└──────┬──────┘
       │ Queues jobs
       ↓
┌─────────────┐
│   Upstash   │  (Redis Queue)
│   (Redis)   │
└──────┬──────┘
       │ Jobs stored
       ↓
┌─────────────┐
│   Railway   │  (Worker Process)
│  (Worker)   │  ← YOU ARE HERE
└──────┬──────┘
       │ Processes jobs
       ↓
┌─────────────┐
│  Supabase   │  (Database)
│    (DB)     │
└─────────────┘
```

---

## 🚦 Quick Checklist

Before deploying, make sure:

- [x] Code pushed to GitHub
- [x] `railway.toml` exists
- [x] `npm run worker` works locally
- [x] REDIS_URL ready from Upstash
- [x] DATABASE_URL ready from Supabase
- [x] Railway account created

---

## 🆘 Need Help?

**Check Logs:**
```bash
# Install Railway CLI (optional)
npm install -g @railway/cli

# Login
railway login

# View logs
railway logs
```

**Common Commands:**
```bash
railway status        # Check deployment status
railway logs          # View logs
railway variables     # List env variables
railway open          # Open dashboard
```

---

## 🎉 Success!

Once you see this in Railway logs:
```
[WORKER] SMS Worker started, waiting for jobs...
```

**You're live!** 🚀

Your worker is now running 24/7, processing SMS jobs from your queue!

---

## 📝 Next Steps

1. ✅ Worker deployed to Railway
2. ⏭️ Test sending SMS from Vercel app
3. ⏭️ Monitor Railway logs
4. ⏭️ When ready: Enable real Twilio sending in worker
5. ⏭️ Scale up: Add more workers if needed

**The foundation is solid!** 🎊

