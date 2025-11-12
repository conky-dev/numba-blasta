/**
 * SMS Worker
 * Processes SMS jobs from the queue
 */

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { Pool } from 'pg';
import { SMSJobData } from '@/lib/sms-queue';

// Create dedicated database pool for worker with proper SSL config
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: {
    rejectUnauthorized: false, // Accept Supabase's certificates
  },
});

dbPool.on('error', (err) => {
  console.error('[DB] Pool error:', err);
});

// Helper function for queries
async function query(sql: string, params?: any[]) {
  const client = await dbPool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

// Connect to Redis with keepalive to prevent connection drops
const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false,
  keepAlive: 30000, // Send keepalive every 30s
  family: 0, // Use IPv4 and IPv6
});

// Create worker
export const smsWorker = new Worker(
  'sms',
  async (job: Job<SMSJobData>) => {
    console.log(`[WORKER] Processing job ${job.id} for ${job.data.to}`);
    
    const { to, message, orgId, userId, contactId, campaignId, templateId } = job.data;
    
    try {
      // Step 1: Check balance
      const balanceCheck = await query(
        'SELECT sms_balance FROM organizations WHERE id = $1',
        [orgId]
      );
      
      const balance = parseFloat(balanceCheck.rows[0]?.sms_balance || '0');
      const cost = 0.01; // $0.01 per message
      
      if (balance < cost) {
        throw new Error(`Insufficient balance: $${balance} (need $${cost})`);
      }
      
      // Step 2: Simulate sending (we'll add real Twilio later)
      console.log(`[WORKER] Simulating send to ${to}`);
      console.log(`[WORKER] Message: ${message.substring(0, 50)}...`);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Step 3: Deduct balance and save message
      await query('BEGIN');
      
      try {
        // Deduct balance
        await query(
          `SELECT deduct_credits($1, $2, $3, $4, $5, $6, $7)`,
          [
            orgId,              // p_org_id
            cost,               // p_amount
            1,                  // p_sms_count
            cost,               // p_cost_per_sms
            null,               // p_message_id (will set after insert)
            campaignId || null, // p_campaign_id
            `SMS to ${to}`      // p_description
          ]
        );
        
        // Save message record
        await query(
          `INSERT INTO sms_messages (
            org_id, contact_id, to_number, body,
            direction, status, segments, price_cents,
            campaign_id, template_id, created_by,
            sent_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
          [
            orgId,
            contactId || null,
            to,
            message,
            'outbound',
            'sent', // Mark as sent (will be 'delivered' later with webhooks)
            1, // Calculate segments later
            1, // Cost in cents
            campaignId || null,
            templateId || null,
            userId,
          ]
        );
        
        await query('COMMIT');
        
        console.log(`[WORKER] ✅ Job ${job.id} completed successfully`);
        
        return { success: true, to, status: 'sent' };
        
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
      
    } catch (error: any) {
      console.error(`[WORKER] ❌ Job ${job.id} failed:`, error.message);
      throw error; // BullMQ will retry
    }
  },
  {
    connection,
    concurrency: 5, // Process 5 messages at a time
  }
);

// Worker event listeners
smsWorker.on('completed', (job) => {
  console.log(`[WORKER] Job ${job.id} completed`);
});

smsWorker.on('failed', (job, error) => {
  console.error(`[WORKER] Job ${job?.id} failed:`, error.message);
});

smsWorker.on('error', (error) => {
  console.error('[WORKER] Worker error:', error);
});

console.log('[WORKER] SMS Worker started, waiting for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[WORKER] Shutting down...');
  await smsWorker.close();
  await connection.quit();
  await dbPool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[WORKER] Shutting down...');
  await smsWorker.close();
  await connection.quit();
  await dbPool.end();
  process.exit(0);
});

