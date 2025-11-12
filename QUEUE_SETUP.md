# SMS Queue System - Quick Start

Simple job queue for sending SMS messages using BullMQ + Redis.

## 🎯 How It Works

```
User sends SMS
    ↓
API queues job (instant response)
    ↓
Worker picks up job
    ↓
Marks as "sent" (simulated for now)
    ↓
Saves to database
```

## 🚀 Quick Start

### 1. Make sure REDIS_URL is in your .env.local

```bash
# .env.local
REDIS_URL=rediss://default:PASSWORD@host.upstash.io:6379
```

### 2. Start the worker in one terminal

```bash
npm run worker
```

You should see:
```
🚀 Starting SMS Worker...
📦 Redis: host.upstash.io:6379
💾 Database: Supabase
[WORKER] SMS Worker started, waiting for jobs...
```

### 3. Start your Next.js app in another terminal

```bash
npm run dev
```

### 4. Send an SMS from the app

Go to `/sms/quick` and send a message. You'll see:

**In the app:**
```json
{
  "success": true,
  "message": {
    "id": "1234",
    "to": "+1234567890",
    "status": "queued",
    "queuedAt": "2025-11-12..."
  }
}
```

**In the worker terminal:**
```
[WORKER] Processing job 1234 for +1234567890
[WORKER] Simulating send to +1234567890
[WORKER] Message: Hello, this is a test...
[WORKER] ✅ Job 1234 completed successfully
```

## 📁 Files Created

```
lib/
  sms-queue.ts          # Queue setup & add jobs
  
workers/
  sms-worker.ts         # Worker that processes jobs
  start-worker.js       # Startup script

app/api/sms/send/
  route.ts              # Updated to use queue
```

## 🔍 What's Happening

### 1. API Route (`/api/sms/send`)
- Validates phone number
- Checks balance
- **Queues the job** (doesn't send yet)
- Returns immediately

### 2. Worker (`workers/sms-worker.ts`)
- Picks up jobs from queue
- Checks balance again
- **Simulates sending** (no Twilio yet)
- Deducts balance
- Saves to `sms_messages` table
- Marks as "sent"

### 3. Queue (`lib/sms-queue.ts`)
- Stores jobs in Redis
- Retries failed jobs 3 times
- Auto-cleans completed jobs

## 📊 View Queue Stats

You can check queue status:

```typescript
import { getQueueStats } from '@/lib/sms-queue';

const stats = await getQueueStats();
console.log(stats);
// {
//   waiting: 10,
//   active: 2,
//   completed: 150,
//   failed: 3
// }
```

## 🎛️ Configuration

### Worker Concurrency

In `workers/sms-worker.ts`:
```typescript
concurrency: 5, // Process 5 jobs at once
```

### Job Retries

In `lib/sms-queue.ts`:
```typescript
attempts: 3,                    // Retry 3 times
backoff: {
  type: 'exponential',          // Wait 2s, 4s, 8s
  delay: 2000,
}
```

### Auto-Cleanup

```typescript
removeOnComplete: {
  age: 3600,      // Remove after 1 hour
  count: 1000,    // Keep last 1000
}
```

## 🧪 Testing

### 1. Check if worker is running
```bash
# Should see worker output
npm run worker
```

### 2. Send a test SMS
Use the Quick SMS page at `/sms/quick`

### 3. Check the database
```sql
SELECT * FROM sms_messages 
ORDER BY created_at DESC 
LIMIT 10;
```

You should see messages with `status = 'sent'`

## 🔄 Next Steps

When you're ready to actually send SMS:

1. Uncomment Twilio code in `workers/sms-worker.ts`
2. Replace simulation with real `sendSMS()` call
3. Worker will send real messages!

The queue infrastructure is already done!

## 🐛 Troubleshooting

### Worker won't start
```
Error: connect ECONNREFUSED
```
→ Check REDIS_URL is correct in .env.local

### Jobs not processing
```
Worker running but no output
```
→ Check Redis connection
→ Try sending a message from the app

### Database errors
```
Error: relation "sms_messages" does not exist
```
→ Run the SQL migration: `app/api/sql/09_sms_messages.sql`

## 📚 Learn More

- BullMQ Docs: https://docs.bullmq.io
- Upstash Redis: https://upstash.com

