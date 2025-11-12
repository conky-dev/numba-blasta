# 🎯 Railway Deployment - Complete Setup

Everything you need to deploy the SMS worker to Railway.

---

## 📦 What's Been Prepared

✅ **Worker code** (`workers/sms-worker.ts`)  
✅ **Start script** (`workers/start-worker.js`)  
✅ **Railway config** (`railway.toml`)  
✅ **Package script** (`npm run worker`)  
✅ **Environment detection** (auto-loads .env.local locally)  
✅ **Graceful shutdown** (SIGTERM/SIGINT handlers)  
✅ **Error handling** (automatic retries via BullMQ)  

---

## 🚀 Deployment Steps

### **1. Push to GitHub**

```bash
git add .
git commit -m "Add SMS queue worker for Railway"
git push
```

### **2. Create Railway Project**

Go to **https://railway.app** and:
1. Click **"Start a New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose `numba-blasta`
4. Wait for initial deploy

### **3. Add Environment Variables**

In Railway dashboard → **Variables** tab, add:

```bash
REDIS_URL=rediss://default:xxxxx@host.upstash.io:6379
DATABASE_URL=postgresql://postgres:xxxxx@db.xxx.supabase.co:5432/postgres
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_MESSAGING_SERVICE_SID=MGxxxxx
NODE_ENV=production
```

**📋 See `RAILWAY_ENV_VARS.md` for detailed instructions**

### **4. Verify Deployment**

Check **Deployments** tab, you should see:
```
🚀 Starting SMS Worker...
📦 Redis: host.upstash.io:6379
💾 Database: Supabase
[WORKER] SMS Worker started, waiting for jobs...
```

### **5. Test It!**

1. Send SMS from your app (Quick SMS page)
2. Check Railway logs
3. Should see job processing in real-time

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `railway.toml` | Railway deployment config |
| `.railwayignore` | Files to exclude from deploy |
| `RAILWAY_DEPLOYMENT.md` | Full deployment guide |
| `RAILWAY_ENV_VARS.md` | Environment variables reference |
| `RAILWAY_SETUP.md` | This file |

---

## 🎛️ How It Works

```
┌──────────────────────────────────────────────────────┐
│                     YOUR APP                          │
│                                                       │
│  Vercel (Next.js)                                    │
│  ├─ User sends SMS                                   │
│  ├─ API adds job to queue                           │
│  └─ Returns "queued" to user                        │
│                                                       │
└─────────────┬────────────────────────────────────────┘
              │
              ↓ Job added
┌─────────────────────────────────────────────────────┐
│           UPSTASH (Redis Queue)                      │
│  Jobs waiting to be processed...                     │
└─────────────┬───────────────────────────────────────┘
              │
              ↓ Worker polls
┌─────────────────────────────────────────────────────┐
│        RAILWAY (This Worker) ← YOU ARE HERE          │
│  ├─ Polls queue for jobs                            │
│  ├─ Processes 5 jobs concurrently                   │
│  ├─ Checks balance                                  │
│  ├─ Sends SMS (simulated for now)                   │
│  ├─ Deducts balance                                 │
│  ├─ Saves to database                               │
│  └─ Marks job complete                              │
│                                                       │
└─────────────┬───────────────────────────────────────┘
              │
              ↓ Saves data
┌─────────────────────────────────────────────────────┐
│          SUPABASE (PostgreSQL)                       │
│  ├─ sms_messages                                    │
│  ├─ billing_transactions                            │
│  └─ organizations (balance)                         │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 Monitoring

### **Live Logs**

Railway Dashboard → **Deployments** → **Logs**

**What you'll see:**
```bash
# Worker starts
🚀 Starting SMS Worker...
[WORKER] SMS Worker started, waiting for jobs...

# Job received
[WORKER] Processing job 1 for +1234567890
[WORKER] Simulating send to +1234567890

# Job completed
[WORKER] ✅ Job 1 completed successfully
```

### **Via CLI**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# View logs
railway logs --follow

# Check status
railway status
```

---

## 💰 Costs

**Free Trial:**
- $5 credit included
- Lasts 1-2 months for a worker
- No credit card needed

**After Free Trial:**
- ~$5-10/month
- Pay only for what you use
- Can pause/delete anytime

**Cost breakdown:**
- Worker: ~$0.01/hour × 730 hours = ~$7/month
- Network: Usually free for small apps

---

## 🛠️ Troubleshooting

### **Worker Not Starting**

**Symptom:** Deploy succeeds but worker exits immediately

**Check:**
1. Railway logs for error messages
2. Environment variables are set
3. `REDIS_URL` starts with `rediss://` (double 's')

**Fix:**
```bash
railway variables list
# Verify all required vars are set
```

### **Redis Connection Error**

**Error:** `ECONNREFUSED` or `Connection timeout`

**Fix:**
1. Check Upstash is online
2. Verify `REDIS_URL` is correct
3. Make sure it's the **TLS** connection string (rediss://)

### **Database Error**

**Error:** `Connection terminated` or `authentication failed`

**Fix:**
1. Check `DATABASE_URL` has password filled in
2. Verify Supabase database is accessible
3. Check IP whitelist (Supabase usually allows all by default)

### **Jobs Not Processing**

**Symptom:** Worker running but no jobs processed

**Check:**
1. Is your Vercel app queuing jobs? (Check API logs)
2. Are both apps using the SAME Redis URL?
3. Are jobs in the queue? (Check Upstash dashboard)

**Debug:**
```typescript
// In your app, check queue status
import { smsQueue } from '@/lib/sms-queue';
const jobCounts = await smsQueue.getJobCounts();
console.log(jobCounts); // { waiting: 5, active: 2, completed: 100 }
```

---

## 🔄 Updates

Railway auto-deploys when you push to GitHub:

```bash
# Make changes to worker
vim workers/sms-worker.ts

# Commit and push
git add .
git commit -m "Update worker logic"
git push

# Railway automatically redeploys! 🎉
```

**Zero downtime:** Railway deploys new version before shutting down old one.

---

## 📈 Scaling

### **Handle More Jobs**

**Increase concurrency** in `sms-worker.ts`:

```typescript
{
  connection,
  concurrency: 10, // Process 10 at once (was 5)
}
```

### **Add More Workers**

In Railway, duplicate your service:
1. Settings → Duplicate Service
2. Both workers share same queue
3. 2x throughput! 🚀

**Cost:** ~$10-15/month for 2 workers

---

## ✅ Success Checklist

Before going live:

- [x] Code pushed to GitHub
- [ ] Railway project created
- [ ] Environment variables added
- [ ] Worker deployment successful
- [ ] Logs show "Worker started"
- [ ] Test SMS sent successfully
- [ ] Job appears in Railway logs
- [ ] Message saved to database
- [ ] Balance deducted correctly

---

## 🎉 You're Ready!

Once everything above is checked, you have:

✅ **Scalable SMS queue system**  
✅ **Background job processing**  
✅ **Automatic retries on failure**  
✅ **Real-time logging**  
✅ **Graceful shutdowns**  
✅ **Production-ready worker**  

**Next step:** Enable real Twilio sending when ready! 🚀

---

## 📚 Additional Resources

- **Railway Docs:** https://docs.railway.app/
- **BullMQ Docs:** https://docs.bullmq.io/
- **Upstash Redis:** https://docs.upstash.com/redis
- **Twilio SMS:** https://www.twilio.com/docs/sms

---

## 🆘 Need Help?

**Common issues solved in:**
- `RAILWAY_DEPLOYMENT.md` - Full deployment walkthrough
- `RAILWAY_ENV_VARS.md` - Environment variable help
- `QUEUE_SETUP.md` - Queue architecture explanation

**Still stuck?** Check Railway logs first - they usually tell you exactly what's wrong!

