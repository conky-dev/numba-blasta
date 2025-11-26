/**
 * SMS Queue Setup
 * Simple job queue for sending SMS messages
 */

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Connect to Redis with keepalive to prevent connection drops
const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false,
  keepAlive: 30000, // Send keepalive every 30s
  family: 0, // Use IPv4 and IPv6
});

// Create SMS queue
export const smsQueue = new Queue('sms', {
  connection,
  defaultJobOptions: {
    attempts: 1, // NEVER retry - SMS is not idempotent, retries cause duplicates
    removeOnComplete: {
      age: 3600, // Remove completed jobs after 1 hour
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 86400, // Remove failed jobs after 24 hours
      count: 5000, // Keep last 5000 failed jobs
    },
  },
});

// Job data type
export interface SMSJobData {
  // Message details
  to: string;
  message: string;
  
  // Organization & user
  orgId: string;
  userId: string;
  contactId?: string;
  
  // Optional
  templateId?: string;
  campaignId?: string;
  variables?: Record<string, any>;
  fromNumber?: string; // Specific phone number to send from
  isMessengerReply?: boolean; // True for 1-on-1 messenger replies (no opt-out needed)
}

// Add job to queue
export async function queueSMS(data: SMSJobData) {
  const job = await smsQueue.add('send-sms', data, {
    // Optional: Add priority (higher = more important)
    // priority: data.campaignId ? 5 : 10,
  });
  
  console.log(`[QUEUE] Added job ${job.id} for ${data.to}`);
  return job;
}

// Get queue stats
export async function getQueueStats() {
  const counts = await smsQueue.getJobCounts();
  return counts;
}

// Graceful shutdown
export async function closeQueue() {
  await smsQueue.close();
  await connection.quit();
}

