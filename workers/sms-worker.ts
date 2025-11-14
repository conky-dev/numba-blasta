/**
 * SMS Worker
 * Processes SMS jobs from the queue
 */

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { Pool } from 'pg';
import { SMSJobData } from '@/app/api/_lib/sms-queue';
import twilio from 'twilio';

// Startup logging
console.log('🚀 Starting SMS Worker...');
console.log('📦 Redis:', process.env.REDIS_URL?.split('@')[1] || 'connecting...');
console.log('💾 Database:', process.env.DATABASE_URL?.includes('supabase') ? 'Supabase' : 'PostgreSQL');
console.log('📱 Twilio:', process.env.TWILIO_ACCOUNT_SID ? 'Configured' : '❌ NOT CONFIGURED');
console.log('🌍 Environment:', process.env.RAILWAY_ENVIRONMENT || 'local');
console.log('🔢 Node version:', process.version);
console.log('');

// Validate required environment variables
if (!process.env.REDIS_URL) {
  console.error('❌ FATAL: REDIS_URL not set');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ FATAL: DATABASE_URL not set');
  process.exit(1);
}

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.error('⚠️  WARNING : Twilio credentials not set - SMS sending will be simulated');
}

// Initialize Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Create dedicated database pool for worker with proper SSL config
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: {
    rejectUnauthorized: false,
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
console.log('[REDIS] Connecting to Redis...');
const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false,
  keepAlive: 30000, // Send keepalive every 30s
  family: 0, // Use IPv4 and IPv6
});

connection.on('connect', () => {
  console.log('[REDIS] ✅ Connected to Redis successfully');
});

connection.on('error', (err) => {
  console.error('[REDIS] ❌ Error:', err.message);
});

connection.on('close', () => {
  console.log('[REDIS] Connection closed');
});

console.log('[WORKER] Creating BullMQ workers...');

// Create SMS worker
let smsWorker: Worker<SMSJobData>;
// Create campaign worker
let campaignWorker: Worker;

try {
  // SMS Worker (existing)
  smsWorker = new Worker(
  'sms',
  async (job: Job<SMSJobData>) => {
    console.log(`[SMS-WORKER] Processing job ${job.id} for ${job.data.to}`);
    
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
      
      // Step 2: Send SMS via Twilio (or simulate if not configured)
      let twilioSid: string | null = null;
      let twilioStatus: string = 'sent';
      
      if (twilioClient && process.env.TWILIO_MESSAGING_SERVICE_SID) {
        // Real Twilio send
        console.log(`[WORKER] 📤 Sending SMS to ${to} via Twilio`);
        
        try {
          // 🧪 TESTING: Hardcoded TO number for safe testing
          const testTo = '+18777804236';
          
          console.log(`[WORKER] 🧪 TEST MODE: Overriding recipient`);
          console.log(`[WORKER] Original: To ${to}`);
          console.log(`[WORKER] Testing:  To ${testTo}`);
          
          const twilioMessage = await twilioClient.messages.create({
            body: message,
            to: testTo,  // Hardcoded test TO number
            messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
          });
          
          twilioSid = twilioMessage.sid;
          // Map Twilio statuses to our DB statuses
          // Twilio: queued, sending, sent, failed, delivered, undelivered, receiving, received, accepted, scheduled, canceled
          // Our DB: queued, sent, delivered, failed, undelivered, received
          twilioStatus = twilioMessage.status === 'accepted' || twilioMessage.status === 'sending' 
            ? 'sent' 
            : twilioMessage.status;
          
          console.log(`[WORKER] ✅ Twilio sent: ${twilioSid} (${twilioMessage.status} -> ${twilioStatus})`);
        } catch (twilioError: any) {
          console.error(`[WORKER] ❌ Twilio error:`, twilioError.message);
          throw new Error(`Twilio failed: ${twilioError.message}`);
        }
      } else {
        // Simulation mode (for testing without Twilio)
        console.log(`[WORKER] 🔧 SIMULATION MODE: Would send to ${to}`);
        console.log(`[WORKER] Message: ${message.substring(0, 50)}...`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
        twilioSid = `SIM${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Step 3: Deduct balance and save message
      await query('BEGIN');
      
      try {
        // Deduct balance
        console.log(`[WORKER] Deducting ${cost} credits for org ${orgId}`);
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
        console.log(`[WORKER] Credits deducted successfully`);
        
        // Save message record
        console.log(`[WORKER] Saving message to database:`, {
          orgId,
          to,
          messageLength: message.length,
          messagePreview: message.substring(0, 20)
        });
        
        const insertResult = await query(
          `INSERT INTO sms_messages (
            org_id, contact_id, to_number, body,
            direction, status, segments, price_cents,
            campaign_id, template_id, created_by,
            provider_sid, provider_status,
            sent_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
          RETURNING id`,
          [
            orgId,
            contactId || null,
            to,
            message,
            'outbound',
            twilioStatus, // Use Twilio status or 'sent'
            1, // Calculate segments later
            1, // Cost in cents
            campaignId || null,
            templateId || null,
            userId,
            twilioSid, // Twilio MessageSid
            twilioStatus, // Twilio status
          ]
        );
        
        console.log(`[WORKER] Message saved with ID: ${insertResult.rows[0]?.id}`);
        
        // If this message is part of a campaign, check if campaign is complete
        if (campaignId) {
          const campaignStatsResult = await query(
            `SELECT 
              c.id,
              c.status,
              COUNT(DISTINCT co.id) as total_recipients,
              COUNT(m.id) as messages_sent
             FROM sms_campaigns c
             LEFT JOIN contacts co ON co.org_id = c.org_id AND co.deleted_at IS NULL AND co.opted_out_at IS NULL
             LEFT JOIN sms_messages m ON m.campaign_id = c.id
             WHERE c.id = $1
             GROUP BY c.id, c.status`,
            [campaignId]
          );
          
          const stats = campaignStatsResult.rows[0];
          
          // If all messages have been sent, mark campaign as done
          if (stats && stats.status === 'running' && stats.messages_sent >= stats.total_recipients) {
            console.log(`[WORKER] 🎉 Campaign ${campaignId} complete! (${stats.messages_sent}/${stats.total_recipients})`);
            await query(
              `UPDATE sms_campaigns
               SET status = 'done',
                   completed_at = NOW(),
                   updated_at = NOW()
               WHERE id = $1`,
              [campaignId]
            );
          }
        }
        
        await query('COMMIT');
        
        console.log(`[WORKER] ✅ Job ${job.id} completed successfully`);
        
        return { success: true, to, status: 'sent' };
        
      } catch (error: any) {
        console.error(`[WORKER] ❌ Transaction error:`, error.message);
        console.error(`[WORKER] ❌ Error stack:`, error.stack);
        await query('ROLLBACK');
        
        // CRITICAL: If Twilio send succeeded, don't throw
        // This prevents BullMQ from retrying and sending duplicate messages
        if (twilioSid) {
          console.warn(`[WORKER] ⚠️  DB save failed but Twilio send succeeded (${twilioSid})`);
          console.warn(`[WORKER] ⚠️  Marking job as complete to prevent duplicate send`);
          // Job completes successfully even though DB save failed
          // The message was sent to the user, which is what matters
          return { success: true, twilioSid, warning: 'DB save failed but SMS sent' };
        }
        
        // If Twilio send failed, it's safe to retry
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

  console.log('[WORKER] ✅ SMS Worker created successfully');
  
  // Campaign Worker (new)
  campaignWorker = new Worker(
    'campaigns',
    async (job: Job) => {
      console.log(`[CAMPAIGN-WORKER] Processing campaign job ${job.id}`);
      
      const { campaignId, orgId, userId } = job.data;
      
      try {
        // Step 1: Get campaign details
        console.log(`[CAMPAIGN] Fetching campaign ${campaignId}`);
        const campaignResult = await query(
          `SELECT id, name, message, template_id, org_id, status, target_categories
           FROM sms_campaigns
           WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
          [campaignId, orgId]
        );
        
        if (campaignResult.rows.length === 0) {
          throw new Error(`Campaign ${campaignId} not found`);
        }
        
        const campaign = campaignResult.rows[0];
        const targetCategories = campaign.target_categories;
        
        console.log(`[CAMPAIGN] Target categories:`, targetCategories || 'ALL CONTACTS');
        
        // Step 2: Update campaign status to 'running' if it was 'scheduled'
        if (campaign.status === 'scheduled') {
          await query(
            `UPDATE sms_campaigns
             SET status = 'running',
                 started_at = NOW(),
                 updated_at = NOW()
             WHERE id = $1`,
            [campaignId]
          );
          console.log(`[CAMPAIGN] Campaign ${campaignId} status updated to 'running'`);
        }
        
        // Step 3: Get contacts based on target categories
        console.log(`[CAMPAIGN] Fetching contacts for org ${orgId}`);
        
        let contactsQuery;
        let contactsParams;
        
        if (targetCategories && targetCategories.length > 0) {
          // Filter by categories using array overlap operator
          contactsQuery = `
            SELECT id, phone, first_name, last_name, email
            FROM contacts
            WHERE org_id = $1 
              AND deleted_at IS NULL 
              AND opted_out_at IS NULL
              AND category && $2
            ORDER BY id
          `;
          contactsParams = [orgId, targetCategories];
          console.log(`[CAMPAIGN] Filtering by categories:`, targetCategories);
        } else {
          // Send to all contacts
          contactsQuery = `
            SELECT id, phone, first_name, last_name, email
            FROM contacts
            WHERE org_id = $1 
              AND deleted_at IS NULL 
              AND opted_out_at IS NULL
            ORDER BY id
          `;
          contactsParams = [orgId];
          console.log(`[CAMPAIGN] No category filter - sending to all contacts`);
        }
        
        const contactsResult = await query(contactsQuery, contactsParams);
        
        const contacts = contactsResult.rows;
        console.log(`[CAMPAIGN] Found ${contacts.length} contacts`);
        
        if (contacts.length === 0) {
          console.warn(`[CAMPAIGN] No contacts found for campaign ${campaignId}`);
          await query(
            `UPDATE sms_campaigns
             SET status = 'done',
                 completed_at = NOW(),
                 updated_at = NOW()
             WHERE id = $1`,
            [campaignId]
          );
          return { success: true, sent: 0, message: 'No contacts to send to' };
        }
        
        // Step 4: Queue individual SMS jobs for each contact
        console.log(`[CAMPAIGN] Queueing ${contacts.length} SMS jobs...`);
        
        // Import Queue to add jobs to SMS queue
        const { Queue } = require('bullmq');
        const smsQueue = new Queue('sms', { connection });
        
        let queuedCount = 0;
        const batchSize = 100; // Queue in batches
        
        for (let i = 0; i < contacts.length; i += batchSize) {
          const batch = contacts.slice(i, i + batchSize);
          
          for (const contact of batch) {
            // Render message with contact data (simple mustache-like replacement)
            let renderedMessage = campaign.message;
            renderedMessage = renderedMessage.replace(/\{\{firstName\}\}/g, contact.first_name || '');
            renderedMessage = renderedMessage.replace(/\{\{lastName\}\}/g, contact.last_name || '');
            renderedMessage = renderedMessage.replace(/\{\{email\}\}/g, contact.email || '');
            
            await smsQueue.add('send-sms', {
              to: contact.phone,
              message: renderedMessage,
              orgId,
              userId,
              contactId: contact.id,
              campaignId,
              templateId: campaign.template_id,
            });
            
            queuedCount++;
          }
          
          console.log(`[CAMPAIGN] Queued ${Math.min((i + batchSize), contacts.length)}/${contacts.length} messages`);
          
          // Small delay between batches to avoid overwhelming the queue
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`[CAMPAIGN] ✅ Campaign ${campaignId} queued ${queuedCount} messages`);
        
        // Note: We don't update status to 'completed' here
        // That should be done when all messages are actually sent
        // For now, it stays in 'running' state
        
        return { success: true, sent: queuedCount };
        
      } catch (error: any) {
        console.error(`[CAMPAIGN] ❌ Campaign ${campaignId} failed:`, error.message);
        
        // Update campaign status to 'failed'
        try {
          await query(
            `UPDATE sms_campaigns
             SET status = 'failed',
                 updated_at = NOW()
             WHERE id = $1`,
            [campaignId]
          );
        } catch (updateError: any) {
          console.error(`[CAMPAIGN] Failed to update campaign status:`, updateError.message);
        }
        
        throw error;
      }
    },
    {
      connection,
      concurrency: 2, // Process 2 campaigns at a time
    }
  );

  console.log('[WORKER] ✅ Campaign Worker created successfully');
} catch (error: any) {
  console.error('[WORKER] ❌ FATAL: Failed to create workers:', error);
  console.error('[WORKER] Error stack:', error.stack);
  process.exit(1);
}

// Worker event listeners
smsWorker.on('completed', (job) => {
  console.log(`[SMS-WORKER] Job ${job.id} completed`);
});

smsWorker.on('failed', (job, error) => {
  console.error(`[SMS-WORKER] Job ${job?.id} failed:`, error.message);
});

smsWorker.on('error', (error) => {
  console.error('[SMS-WORKER] Worker error:', error);
});

campaignWorker.on('completed', (job) => {
  console.log(`[CAMPAIGN-WORKER] Job ${job.id} completed`);
});

campaignWorker.on('failed', (job, error) => {
  console.error(`[CAMPAIGN-WORKER] Job ${job?.id} failed:`, error.message);
});

campaignWorker.on('error', (error) => {
  console.error('[CAMPAIGN-WORKER] Worker error:', error);
});

console.log('[WORKER] All workers started, waiting for jobs...');

// Keep process alive with setInterval
setInterval(() => {
  // This keeps the Node.js event loop running
}, 60000); // Every 60 seconds

// Keep process alive
process.on('uncaughtException', (error) => {
  console.error('[ERROR] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERROR] Unhandled rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[WORKER] Shutting down...');
  await smsWorker.close();
  await campaignWorker.close();
  await connection.quit();
  await dbPool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[WORKER] Shutting down...');
  await smsWorker.close();
  await campaignWorker.close();
  await connection.quit();
  await dbPool.end();
  process.exit(0);
});

