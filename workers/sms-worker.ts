/**
 * SMS Worker
 * Processes SMS jobs from the queue
 */

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { Pool } from 'pg';
import { SMSJobData } from '@/app/api/_lib/sms-queue';
import { ContactImportJobData, ContactImportJobProgress } from '@/app/api/_lib/contact-import-queue';
import { calculateSMSSegments } from '@/app/api/_lib/twilio-utils';
import twilio from 'twilio';
import Papa from 'papaparse';

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
// Create contact import worker
let contactImportWorker: Worker<ContactImportJobData>;

try {
  // SMS Worker (existing)
  smsWorker = new Worker(
  'sms',
  async (job: Job<SMSJobData>) => {
    console.log(`[SMS-WORKER] Processing job ${job.id} for ${job.data.to}`);
    
    const { to, message, orgId, userId, contactId, campaignId, templateId, fromNumber } = job.data;
    
    try {
      // Step 1: Decide message body (append STOP text on first send to contact)
      // We need to do this first to calculate the correct cost
      let finalMessage = message;

      if (contactId) {
        try {
          // Atomically mark that we've sent the opt-out notice if this is the first time.
          // Only the first concurrent update will get a row back.
          const noticeResult = await query(
            `UPDATE contacts
             SET opt_out_notice_sent_at = NOW(),
                 updated_at = NOW()
             WHERE id = $1
               AND opt_out_notice_sent_at IS NULL
             RETURNING opt_out_notice_sent_at`,
            [contactId]
          );

          const isFirstOutbound = noticeResult.rows.length > 0;

          if (isFirstOutbound && !/stop to unsubscribe/i.test(message)) {
            finalMessage = `${message.trim()}\n\nReply STOP to unsubscribe.`;
            console.log(
              `[WORKER] Appended STOP verbiage for first outbound to contact ${contactId}`
            );
          }
        } catch (checkError: any) {
          console.warn(
            '[WORKER] Failed to check first-outbound status; sending original message:',
            checkError?.message || checkError
          );
        }
      }

      // Step 2: Calculate cost based on message segments and pricing
      // Use improved segment calculation that handles GSM-7 and UCS-2 encoding
      const segments = calculateSMSSegments(finalMessage);

      console.log(`[WORKER] Message segments: ${segments}`);

      // Fetch pricing - check for custom rates first, then fall back to pricing table
      let costPerSegment = 0;

      try {
        // Check for custom rates from organizations table
        const customRateResult = await query(
          `SELECT custom_rate_outbound_message
          FROM organizations
          WHERE id = $1`,
          [orgId]
        );

        if (customRateResult.rows.length > 0 && customRateResult.rows[0]) {
          const customRate = customRateResult.rows[0].custom_rate_outbound_message;
          
          if (customRate !== null && customRate !== undefined) {
            costPerSegment = parseFloat(customRate.toString());
            console.log(`[WORKER] Using custom rate: $${costPerSegment}/segment`);
          }
        }

        // If no custom rate, fetch from pricing table
        if (costPerSegment === 0) {
          const pricingResult = await query(
            `SELECT price_per_unit 
             FROM pricing 
             WHERE service_type = 'outbound_message'
               AND is_active = true 
             LIMIT 1`,
            []
          );

          if (pricingResult.rows.length > 0) {
            costPerSegment = parseFloat(pricingResult.rows[0].price_per_unit.toString());
            console.log(`[WORKER] Using pricing table rate: $${costPerSegment}/segment`);
          } else {
            throw new Error('Pricing not found in database. Please configure pricing in the pricing table.');
          }
        }
      } catch (pricingError: any) {
        console.error(`[WORKER] Error fetching pricing:`, pricingError.message);
        throw new Error(`Failed to fetch pricing: ${pricingError.message}`);
      }

      // Total cost = cost per segment × number of segments
      const cost = costPerSegment * segments;
      console.log(`[WORKER] Total cost: $${cost.toFixed(4)} (${segments} segments × $${costPerSegment.toFixed(4)}/segment)`);


      // Step 3: Check balance
      const balanceCheck = await query(
        'SELECT sms_balance FROM organizations WHERE id = $1',
        [orgId]
      );
      
      const balance = parseFloat(balanceCheck.rows[0]?.sms_balance || '0');
      
      if (balance < cost) {
        throw new Error(`Insufficient balance: $${balance.toFixed(4)} (need $${cost.toFixed(4)})`);
      }

      // Step 4: Send SMS via Twilio (or simulate if not configured)
      let twilioSid: string | null = null;
      let twilioStatus: string = 'sent';
      
      if (twilioClient && process.env.TWILIO_MESSAGING_SERVICE_SID) {
        // Real Twilio send
        console.log(`[WORKER] 📤 Sending SMS to ${to} via Twilio`);
        
        try {
          // 🧪 TESTING (DISABLED):
          // If you ever need to force all outbound traffic to a single safe test number again,
          // you can temporarily uncomment this block. Do NOT use in production.
          //
          // const testTo = '+18777804236';
          // console.log(`[WORKER] 🧪 TEST MODE: Overriding recipient`);
          // console.log(`[WORKER] Original: To ${to}`);
          // console.log(`[WORKER] Testing:  To ${testTo}`);
          //
          // const effectiveTo = testTo;
          //
          // For production, always send to the actual recipient:
          const effectiveTo = to;
          
          // Use specific fromNumber if provided, otherwise use Messaging Service
          const messageOptions: any = {
            body: finalMessage,
            to: effectiveTo,
          };
          
          if (fromNumber) {
            messageOptions.from = fromNumber;
            console.log(`[WORKER] Using specific from number: ${fromNumber}`);
          } else if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
            messageOptions.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
            console.log(`[WORKER] Using Messaging Service`);
          } else {
            throw new Error('Either fromNumber or TWILIO_MESSAGING_SERVICE_SID must be provided');
          }
          
          const twilioMessage = await twilioClient.messages.create(messageOptions);
          
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
          
          // Handle invalid phone number error (21211)
          if (twilioError.code === 21211 || twilioError.message.includes("Invalid 'To' Phone Number")) {
            console.log(`[WORKER] 🗑️ Invalid phone number detected: ${to}. Marking contact for deletion.`);
            
            // Soft delete the contact
            // We use the normalized phone number or the original input to find the contact
            await query(
              `UPDATE contacts
               SET deleted_at = NOW(),
                   updated_at = NOW()
               WHERE phone = $1 OR phone = $2`,
              [to, to.replace(/^\+1/, '')] 
            );
            
            // Refresh the category counts view
            try {
              await query('REFRESH MATERIALIZED VIEW CONCURRENTLY contact_category_counts');
            } catch (err) {
              console.warn('[WORKER] Failed to refresh view after contact deletion:', err);
            }
          }
          
          throw new Error(`Twilio failed: ${twilioError.message}`);
        }
      } else {
        // Simulation mode (for testing without Twilio)
        console.log(`[WORKER] 🔧 SIMULATION MODE: Would send to ${to}`);
        console.log(`[WORKER] Message: ${finalMessage.substring(0, 50)}...`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
        twilioSid = `SIM${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Step 5: Deduct balance and save message
      await query('BEGIN');
      
      try {
        // Deduct balance
        console.log(`[WORKER] Deducting $${cost.toFixed(4)} credits for org ${orgId} (${segments} segment(s), $${costPerSegment.toFixed(4)}/segment)`);
        await query(
          `SELECT deduct_credits($1, $2, $3, $4, $5, $6, $7)`,
          [
            orgId,              // p_org_id
            cost,               // p_amount (total cost)
            segments,           // p_sms_count (number of segments)
            costPerSegment,     // p_cost_per_sms (cost per segment)
            null,               // p_message_id (will set after insert)
            campaignId || null, // p_campaign_id
            `SMS to ${to} (${segments} segment(s) @ $${costPerSegment.toFixed(4)}/seg)`  // p_description
          ]
        );
        console.log(`[WORKER] Credits deducted successfully`);
        
        // Save message record
        console.log(`[WORKER] Saving message to database:`, {
          orgId,
          to,
          messageLength: finalMessage.length,
          messagePreview: finalMessage.substring(0, 20)
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
            finalMessage,
            'outbound',
            twilioStatus, // Use Twilio status or 'sent'
            segments, // Actual calculated segments
            Math.round(cost * 100), // Cost in cents
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
          // Only check opted_out_at - if it's NULL, they haven't opted out; if NOT NULL, they have opted out
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
          // Only check opted_out_at - if it's NULL, they haven't opted out; if NOT NULL, they have opted out
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

  // Contact Import Worker (new)
  contactImportWorker = new Worker<ContactImportJobData>(
    'contact-import',
    async (job: Job<ContactImportJobData>) => {
      console.log(`[IMPORT-WORKER] Processing job ${job.id} - ${job.data.csvData.length} bytes`);
      
      const { orgId, userId, csvData, category, mapping = {} } = job.data;

      interface CSVRow {
        [key: string]: string | undefined;
      }

      // Helper to get field value from row
      const getFieldValue = (
        row: CSVRow,
        targetField: string,
        fallbackKeys: string[]
      ): string | undefined => {
        const header = Object.keys(mapping).find((h) => mapping[h] === targetField);
        if (header && row[header] != null) {
          return row[header]!.toString().trim();
        }
        for (const key of fallbackKeys) {
          if (row[key] != null) {
            return row[key]!.toString().trim();
          }
        }
        return undefined;
      };

      // Parse CSV
      const parseResult = Papa.parse<CSVRow>(csvData, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => {
          return header.toLowerCase().trim().replace(/\s+/g, '_');
        },
      });

      const rows = parseResult.data as CSVRow[];

      // Initialize progress
      const progress: ContactImportJobProgress = {
        total: rows.length,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
      };

      await job.updateProgress(progress);

      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      const BATCH_SIZE = 500;

      // Process in batches
      for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, rows.length);
        const batch = rows.slice(batchStart, batchEnd);

        // Build multi-row upsert
        const values: any[] = [];
        const valuePlaceholders: string[] = [];
        let paramIndex = 1;

        for (let i = 0; i < batch.length; i++) {
          const row = batch[i];
          const phone = getFieldValue(row, 'phone', ['phone', 'phone_number', 'mobile']) || '';

          // Skip rows without phone or invalid format
          if (!phone || !phoneRegex.test(phone)) {
            progress.skipped++;
            if (!phone) {
              progress.errors.push(`Row ${batchStart + i + 2}: Missing phone number`);
            } else {
              progress.errors.push(`Row ${batchStart + i + 2}: Invalid phone format: ${phone}`);
            }
            continue;
          }

          const firstName = getFieldValue(row, 'first_name', ['first_name', 'firstname', 'first']) || null;
          const lastName = getFieldValue(row, 'last_name', ['last_name', 'lastname', 'last']) || null;
          const email = getFieldValue(row, 'email', ['email', 'email_address']) || null;

          // Add to batch
          valuePlaceholders.push(
            `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, NULL)`
          );
          values.push(orgId, phone, firstName, lastName, email, category);
          paramIndex += 6;
        }

        // Execute batch upsert if we have values
        if (valuePlaceholders.length > 0) {
          try {
            const upsertResult = await query(
              `INSERT INTO contacts (org_id, phone, first_name, last_name, email, category, deleted_at)
               VALUES ${valuePlaceholders.join(', ')}
               ON CONFLICT (org_id, phone, deleted_at)
               DO UPDATE SET
                 first_name = COALESCE(EXCLUDED.first_name, contacts.first_name),
                 last_name = COALESCE(EXCLUDED.last_name, contacts.last_name),
                 email = COALESCE(EXCLUDED.email, contacts.email),
                 category = array(SELECT DISTINCT unnest(contacts.category || EXCLUDED.category)),
                 updated_at = NOW()
               RETURNING (xmax = 0) AS inserted`,
              values
            );

            // Count inserts vs updates
            for (const row of upsertResult.rows) {
              if (row.inserted) {
                progress.created++;
              } else {
                progress.updated++;
              }
            }
          } catch (error: any) {
            console.error(`[IMPORT-WORKER] Batch error:`, error);
            progress.skipped += valuePlaceholders.length;
            progress.errors.push(`Batch ${batchStart}-${batchEnd}: ${error.message}`);
          }
        }

        progress.processed = batchEnd;
        await job.updateProgress(progress);

        // Log progress every 1000 contacts
        if (progress.processed % 1000 === 0) {
          console.log(
            `[IMPORT-WORKER] Progress: ${progress.processed}/${progress.total} ` +
            `(created: ${progress.created}, updated: ${progress.updated}, skipped: ${progress.skipped})`
          );
        }
      }

      // Refresh materialized view for category counts
      try {
        await query('REFRESH MATERIALIZED VIEW CONCURRENTLY contact_category_counts');
        console.log('[IMPORT-WORKER] ✅ Refreshed category counts view');
      } catch (error) {
        console.warn('[IMPORT-WORKER] Failed to refresh category counts view:', error);
      }

      console.log(
        `[IMPORT-WORKER] ✅ Completed job ${job.id}: ` +
        `${progress.created} created, ${progress.updated} updated, ${progress.skipped} skipped`
      );

      return progress;
    },
    {
      connection: connection.duplicate(),
      concurrency: 2, // Process 2 imports at a time
    }
  );

  contactImportWorker.on('completed', (job, result) => {
    const progress = result as ContactImportJobProgress;
    console.log(
      `[IMPORT-WORKER] ✅ Job ${job.id} completed: ` +
      `${progress.created} created, ${progress.updated} updated, ${progress.skipped} skipped`
    );
  });

  contactImportWorker.on('failed', (job, err) => {
    console.error(`[IMPORT-WORKER] ❌ Job ${job?.id} failed:`, err.message);
  });

  console.log('[WORKER] ✅ Contact Import Worker created successfully');
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
  await contactImportWorker.close();
  await connection.quit();
  await dbPool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[WORKER] Shutting down...');
  await smsWorker.close();
  await campaignWorker.close();
  await contactImportWorker.close();
  await connection.quit();
  await dbPool.end();
  process.exit(0);
});

