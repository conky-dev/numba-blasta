# 🚂 Railway Quick Start

**5-minute setup guide for deploying the SMS worker**

---

## ⚡ TL;DR

```bash
# 1. Push code
git add . && git commit -m "Add worker" && git push

# 2. Deploy to Railway
# → Go to railway.app
# → Deploy from GitHub
# → Add env vars (see below)
# → Done! ✅
```

---

## 📝 Environment Variables Needed

Copy these from your `.env.local`:

```bash
REDIS_URL=rediss://...
DATABASE_URL=postgresql://...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_MESSAGING_SERVICE_SID=MG...
```

**Where to find them:**
- `REDIS_URL` → Upstash dashboard
- `DATABASE_URL` → Supabase settings
- Twilio vars → Twilio console

---

## ✅ Verify It's Working

**In Railway logs, you should see:**
```
🚀 Starting SMS Worker...
[WORKER] SMS Worker started, waiting for jobs...
```

**Send a test SMS from your app:**
```
[WORKER] Processing job 1 for +1234567890
[WORKER] ✅ Job 1 completed successfully
```

---

## 📚 Full Documentation

Need more details? See:

- **`RAILWAY_SETUP.md`** → Complete setup guide
- **`RAILWAY_DEPLOYMENT.md`** → Step-by-step walkthrough  
- **`RAILWAY_ENV_VARS.md`** → Environment variables help
- **`QUEUE_SETUP.md`** → How the queue system works

---

## 🎯 Architecture

```
Vercel (App) → Upstash (Queue) → Railway (Worker) → Supabase (DB)
```

**Each piece:**
- **Vercel**: Hosts your Next.js app (API + Frontend)
- **Upstash**: Stores SMS jobs in Redis queue
- **Railway**: Runs this worker 24/7 to process jobs
- **Supabase**: Stores messages, balance, etc.

---

## 💰 Cost

- **Free tier**: $5 credit (~1-2 months)
- **After**: ~$5-10/month
- **Cancel anytime**

---

## 🆘 Issues?

**Worker not starting?**
→ Check Railway logs for errors
→ Verify environment variables

**Jobs not processing?**
→ Make sure Vercel app has same `REDIS_URL`
→ Check Upstash dashboard for queued jobs

**Need help?**
→ Read `RAILWAY_SETUP.md` for troubleshooting

---

## 🎉 That's It!

Once deployed, your SMS system is fully functional:
- ✅ Queue-based sending
- ✅ Automatic retries
- ✅ Concurrent processing
- ✅ Production ready

**Happy deploying! 🚀**

