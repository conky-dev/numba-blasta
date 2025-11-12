# 🏠 Running SMS Queue System Locally

Quick guide to run the worker and test the queue system on your local machine.

---

## 🚀 Quick Start

### **Step 1: Make Sure Environment Variables are Set**

Check your `.env.local` file has these:

```bash
# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxx.supabase.co:5432/postgres

# Redis (from Upstash)
REDIS_URL=rediss://default:YOUR_PASSWORD@host.upstash.io:6379

# Twilio (optional for now - worker simulates sending)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_MESSAGING_SERVICE_SID=MGxxxxx

# Auth
JWT_SECRET=your-secret-key-here
```

---

### **Step 2: Open Two Terminals**

You need to run **two processes** simultaneously:

#### **Terminal 1: Next.js App** (Web + API)

```bash
cd /Users/lucas/Documents/GitHub/numba-blasta
npm run dev
```

You should see:
```
✓ Ready in 2.5s
○ Local: http://localhost:3000
```

#### **Terminal 2: SMS Worker** (Background Job Processor)

```bash
cd /Users/lucas/Documents/GitHub/numba-blasta
npm run worker
```

You should see:
```
🚀 Starting SMS Worker...
📦 Redis: host.upstash.io:6379
💾 Database: Supabase

[WORKER] SMS Worker started, waiting for jobs...
```

---

### **Step 3: Test It!**

1. **Open your browser:** http://localhost:3000
2. **Login** to your account
3. **Go to Quick SMS:** `/sms/quick`
4. **Fill in:**
   - Phone number: `+1234567890` (or your whitelisted number)
   - Message: `Test message from local queue!`
5. **Click Send Now**

---

### **Step 4: Watch the Magic! ✨**

#### **In Your Browser:**
You should see a success message: "SMS queued successfully!"

#### **In Terminal 2 (Worker):**
You should see:
```bash
[WORKER] Processing job 1 for +1234567890
[WORKER] Simulating send to +1234567890
[WORKER] Message: Test message from local queue!...
[WORKER] ✅ Job 1 completed successfully
[WORKER] Job 1 completed
```

#### **In Your Database (Supabase):**
Check `sms_messages` table - you should see the new message!

Check `billing_transactions` table - balance should be deducted!

---

## 🔍 What's Happening?

```
┌─────────────────────────────────────────────┐
│  Terminal 1: Next.js (localhost:3000)      │
│  ├─ User clicks "Send"                      │
│  ├─ API validates request                   │
│  ├─ Checks balance                          │
│  └─ Adds job to Redis queue                │
└────────────────┬────────────────────────────┘
                 │
                 ↓ Job added to Redis
┌────────────────────────────────────────────┐
│         Upstash Redis (Cloud)              │
│  Job stored in queue, waiting...           │
└────────────────┬───────────────────────────┘
                 │
                 ↓ Worker polls for jobs
┌────────────────────────────────────────────┐
│  Terminal 2: Worker (background)          │
│  ├─ Picks up job from queue                │
│  ├─ Checks balance again                   │
│  ├─ Simulates sending SMS                  │
│  ├─ Deducts balance                        │
│  ├─ Saves to sms_messages table            │
│  └─ Marks job complete                     │
└────────────────┬───────────────────────────┘
                 │
                 ↓ Saves data
┌────────────────────────────────────────────┐
│         Supabase (PostgreSQL)              │
│  ├─ sms_messages (new row)                 │
│  ├─ billing_transactions (deduction)       │
│  └─ organizations (balance updated)        │
└────────────────────────────────────────────┘
```

---

## 🛠️ Troubleshooting

### **Problem: Worker won't start**

**Error:** `REDIS_URL is not set`

**Fix:**
```bash
# Check your .env.local file exists
cat .env.local | grep REDIS_URL

# Make sure it's set
echo $REDIS_URL  # Should show nothing (it's only loaded in Node)
```

---

### **Problem: Jobs not being processed**

**Check Terminal 2** - is the worker running?

```bash
# You should see:
[WORKER] SMS Worker started, waiting for jobs...

# If not running, restart it:
npm run worker
```

---

### **Problem: "Insufficient balance" error**

**Fix:** Add credits to your organization

```sql
-- In Supabase SQL Editor:
UPDATE organizations 
SET sms_balance = 100.00 
WHERE id = 'your-org-id';
```

Or use the app:
- Go to Billing tab
- Click "Add Funds"
- Add $10 or $100

---

### **Problem: Worker crashes immediately**

**Check for errors in Terminal 2:**

```bash
# Common issues:

# Database connection failed
Error: authentication failed
→ Check DATABASE_URL in .env.local

# Redis connection failed
Error: ECONNREFUSED
→ Check REDIS_URL in .env.local
→ Make sure Upstash Redis is online

# Missing dependencies
Cannot find module 'bullmq'
→ Run: npm install
```

---

## 📊 Monitoring

### **View Queue Status**

Open a third terminal:

```bash
node --eval "
const IORedis = require('ioredis');
const { Queue } = require('bullmq');

const connection = new IORedis(process.env.REDIS_URL);
const queue = new Queue('sms', { connection });

queue.getJobCounts().then(counts => {
  console.log('Queue Status:', counts);
  process.exit(0);
});
" 
```

Output:
```json
Queue Status: {
  waiting: 0,
  active: 0,
  completed: 5,
  failed: 0,
  delayed: 0
}
```

---

### **View Recent Jobs**

```bash
node --eval "
const IORedis = require('ioredis');
const { Queue } = require('bullmq');

const connection = new IORedis(process.env.REDIS_URL);
const queue = new Queue('sms', { connection });

queue.getCompleted(0, 10).then(jobs => {
  console.log('Last 10 jobs:');
  jobs.forEach(job => {
    console.log(\`  Job \${job.id}: \${job.data.to}\`);
  });
  process.exit(0);
});
"
```

---

## 🎯 Testing Different Scenarios

### **Test 1: Single Message**

```
1. Quick SMS → Send to one number
2. Check worker logs
3. Verify in database
```

### **Test 2: Multiple Messages**

```bash
# Send 5 messages quickly
# Worker processes them concurrently (5 at a time)
```

### **Test 3: Insufficient Balance**

```sql
-- Set balance to $0
UPDATE organizations SET sms_balance = 0 WHERE id = 'your-org-id';

-- Try sending → Should get 402 error before queuing
```

### **Test 4: Worker Restart**

```bash
# Terminal 2: Ctrl+C to stop worker
# Send a message from app
# Message queues in Redis
# Restart worker: npm run worker
# Worker picks up queued job! ✨
```

---

## 🔄 Stopping Everything

### **Stop Next.js (Terminal 1):**
```bash
Ctrl + C
```

### **Stop Worker (Terminal 2):**
```bash
Ctrl + C
```

You should see:
```
[WORKER] Shutting down...
```

The worker gracefully shuts down, finishing any active jobs first.

---

## 💡 Pro Tips

### **Keep Worker Running**

Use `tmux` or `screen` to keep the worker running in the background:

```bash
# Using tmux
tmux new -s worker
npm run worker
# Press: Ctrl+B, then D to detach

# Reattach later:
tmux attach -t worker
```

### **Auto-restart on Changes**

The worker uses `tsx` which doesn't auto-reload. To restart automatically:

```bash
# Install nodemon
npm install -g nodemon

# Run worker with auto-restart
nodemon --exec "npm run worker"
```

### **View Logs**

```bash
# Save worker logs to file
npm run worker > worker.log 2>&1

# Tail logs in another terminal
tail -f worker.log
```

---

## 📝 Quick Command Reference

```bash
# Start Next.js
npm run dev

# Start Worker
npm run worker

# Install dependencies
npm install

# Check environment variables
cat .env.local

# View database
# Go to: https://supabase.com → Your Project → Table Editor

# View Redis
# Go to: https://console.upstash.com → Your Database → Data Browser
```

---

## ✅ Success Checklist

- [x] `.env.local` has all required variables
- [x] `npm install` completed successfully
- [x] Terminal 1 running: `npm run dev`
- [x] Terminal 2 running: `npm run worker`
- [x] Browser open: http://localhost:3000
- [x] Logged in and on Quick SMS page
- [x] Sent test message
- [x] Worker logs show job processing
- [x] Message appears in database

---

## 🎉 You're All Set!

Your local development environment is now running a **production-grade queue system**:

✅ **Next.js** handles web requests  
✅ **Redis** stores jobs  
✅ **Worker** processes jobs in background  
✅ **PostgreSQL** stores results  

**This is the exact same architecture that will run in production!** 🚀

---

## 🆘 Still Stuck?

**Check logs:**
- Terminal 1: Next.js API logs
- Terminal 2: Worker logs

**Common fixes:**
1. Restart both terminals
2. Check `.env.local` variables
3. Run `npm install` again
4. Check Upstash Redis is online
5. Check Supabase database is accessible

**Need more help?** Check:
- `QUEUE_SETUP.md` - Architecture details
- `RAILWAY_SETUP.md` - Deployment info (similar debugging steps)

