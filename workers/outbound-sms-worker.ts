/**
 * Outbound SMS Worker
 * Handles individual SMS message sending
 */

import { Worker, Job } from 'bullmq';
import { SMSJobData } from '@/app/api/_lib/sms-queue';
import { calculateSMSSegments } from '@/app/api/_lib/twilio-utils';
import { redisConnection, twilioClient, dbPool, query } from './worker-setup';
import {
  chargeInvalidAttempt,
  softDeleteContact,
  markContactOptedOut,
  refreshMaterializedView,
  saveFailedMessage
} from './worker-utils';

console.log('[OUTBOUND-SMS] Creating worker...');

export const outboundSMSWorker = new Worker(
  'sms',
  async (job: Job<SMSJobData>) => {
    console.log(`[OUTBOUND-SMS] Processing job ${job.id} for ${job.data.to}`);
    
    const { to, message, orgId, userId, contactId, campaignId, templateId, fromNumber } = job.data;
    
    try {
      // Step 1: Decide message body (append STOP text on first send to contact)
      let finalMessage = message;

      if (contactId) {
        try {
          const noticeResult = await query(
            dbPool,
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
            console.log(`[OUTBOUND-SMS] Appended STOP verbiage for first outbound to contact ${contactId}`);
          }
        } catch (checkError: any) {
          console.warn('[OUTBOUND-SMS] Failed to check first-outbound status; sending original message:', checkError?.message || checkError);
        }
      }

      // Step 2: Calculate cost based on message segments and pricing
      const segments = calculateSMSSegments(finalMessage);
      console.log(`[OUTBOUND-SMS] Message segments: ${segments}`);

      // Fetch all pricing upfront
      let costPerSegment = 0;
      let invalidAttemptCost = 0;

      try {
        // Check for custom rates
        const customRateResult = await query(
          dbPool,
          `SELECT custom_rate_outbound_message FROM organizations WHERE id = $1`,
          [orgId]
        );

        if (customRateResult.rows.length > 0 && customRateResult.rows[0]) {
          const customRate = customRateResult.rows[0].custom_rate_outbound_message;
          if (customRate !== null && customRate !== undefined) {
            costPerSegment = parseFloat(customRate.toString());
            console.log(`[OUTBOUND-SMS] Using custom rate: $${costPerSegment}/segment`);
          }
        }

        // Fetch pricing from table
        const pricingResult = await query(
          dbPool,
          `SELECT service_type, price_per_unit 
           FROM pricing 
           WHERE service_type IN ('outbound_message', 'invalid_number_attempt')
             AND is_active = true`,
          []
        );

        const pricingMap: Record<string, number> = {};
        for (const row of pricingResult.rows) {
          pricingMap[row.service_type] = parseFloat(row.price_per_unit.toString());
        }

        if (costPerSegment === 0) {
          if (pricingMap['outbound_message']) {
            costPerSegment = pricingMap['outbound_message'];
            console.log(`[OUTBOUND-SMS] Using pricing table rate: $${costPerSegment}/segment`);
          } else {
            throw new Error('Pricing not found in database. Please configure pricing in the pricing table.');
          }
        }

        invalidAttemptCost = pricingMap['invalid_number_attempt'] || 0.0015;
      } catch (pricingError: any) {
        console.error(`[OUTBOUND-SMS] Error fetching pricing:`, pricingError.message);
        throw new Error(`Failed to fetch pricing: ${pricingError.message}`);
      }

      const cost = costPerSegment * segments;
      console.log(`[OUTBOUND-SMS] Total cost: $${cost.toFixed(4)} (${segments} segments × $${costPerSegment.toFixed(4)}/segment)`);

      // Step 3: Check balance
      const balanceCheck = await query(
        dbPool,
        'SELECT sms_balance FROM organizations WHERE id = $1',
        [orgId]
      );
      
      const balance = parseFloat(balanceCheck.rows[0]?.sms_balance || '0');
      
      if (balance < cost) {
        throw new Error(`Insufficient balance: $${balance.toFixed(4)} (need $${cost.toFixed(4)})`);
      }

      // Step 4: Check rate limit
      const fromPhoneNumber = fromNumber || null;
      
      if (fromPhoneNumber) {
        console.log(`[OUTBOUND-SMS] Checking rate limit for ${fromPhoneNumber}`);
        
        const rateLimitCheck = await query(
          `SELECT check_phone_rate_limit($1) as can_send`,
          [fromPhoneNumber]
        );
        
        const canSend = rateLimitCheck.rows[0]?.can_send;
        
        if (!canSend) {
          const remainingCheck = await query(
            `SELECT 
               get_phone_remaining_messages($1) as remaining,
               rate_limit_window_start,
               rate_limit_window_hours
             FROM phone_numbers
             WHERE phone_number = $1`,
            [fromPhoneNumber]
          );
          
          const windowStart = remainingCheck.rows[0]?.rate_limit_window_start;
          const windowHours = remainingCheck.rows[0]?.rate_limit_window_hours || 24;
          
          if (windowStart) {
            const resetTime = new Date(new Date(windowStart).getTime() + windowHours * 60 * 60 * 1000);
            throw new Error(`Rate limit reached for ${fromPhoneNumber}. Window resets at ${resetTime.toISOString()}`);
          } else {
            throw new Error(`Rate limit reached for ${fromPhoneNumber}`);
          }
        }
        
        console.log(`[OUTBOUND-SMS] ✅ Rate limit check passed for ${fromPhoneNumber}`);
      }

      // Step 5: Send SMS via Twilio
      let twilioSid: string | null = null;
      let twilioStatus: string = 'sent';
      
      if (twilioClient && process.env.TWILIO_MESSAGING_SERVICE_SID) {
        console.log(`[OUTBOUND-SMS] 📤 Sending SMS to ${to} via Twilio`);
        
        try {
          const effectiveTo = to;
          const statusCallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/webhook/sms`;
          const messageOptions: any = {
            body: finalMessage,
            to: effectiveTo,
            statusCallback: statusCallbackUrl,
          };
          
          if (fromNumber) {
            messageOptions.from = fromNumber;
          } else if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
            messageOptions.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
          } else {
            throw new Error('Either fromNumber or TWILIO_MESSAGING_SERVICE_SID must be provided');
          }
          
          const twilioMessage = await twilioClient.messages.create(messageOptions);
          
          twilioSid = twilioMessage.sid;
          twilioStatus = twilioMessage.status === 'accepted' || twilioMessage.status === 'sending' 
            ? 'sent' 
            : twilioMessage.status;
          
          console.log(`[OUTBOUND-SMS] ✅ Twilio sent: ${twilioSid} (${twilioMessage.status} -> ${twilioStatus})`);
          
          // Increment rate limit counter
          if (fromPhoneNumber) {
            try {
              const incrementResult = await query(
                `SELECT increment_phone_rate_limit($1, 1) as success`,
                [fromPhoneNumber]
              );
              
              if (incrementResult.rows[0]?.success) {
                console.log(`[OUTBOUND-SMS] ✅ Rate limit incremented for ${fromPhoneNumber}`);
              }
            } catch (rateLimitError: any) {
              console.error(`[OUTBOUND-SMS] ❌ Failed to increment rate limit:`, rateLimitError.message);
            }
          }
        } catch (twilioError: any) {
          console.error(`[OUTBOUND-SMS] ❌ Twilio error:`, twilioError.message);
          
          // Handle different Twilio errors
          
          // 1. Invalid phone number
          if (twilioError.code === 21211 || twilioError.message.includes("Invalid 'To' Phone Number")) {
            console.log(`[OUTBOUND-SMS] 🗑️ Invalid phone number detected: ${to}`);
            
            try {
              await chargeInvalidAttempt(dbPool, orgId, invalidAttemptCost, campaignId || null, to);
              await softDeleteContact(dbPool, orgId, to);
              await refreshMaterializedView(dbPool);
              await saveFailedMessage(
                dbPool, orgId, campaignId || null, to, fromPhoneNumber || null,
                finalMessage, 'Invalid phone number', segments,
                Math.round(invalidAttemptCost * 100)
              );
            } catch (err: any) {
              console.error(`[OUTBOUND-SMS] ❌ Error handling invalid number:`, err.message);
            }
            
            console.log(`[OUTBOUND-SMS] ✅ Job completed - invalid number handled gracefully`);
            return;
          }
          
          // 2. Region not enabled
          if (twilioError.message.includes("Permission to send an SMS has not been enabled for the region")) {
            console.log(`[OUTBOUND-SMS] 🌍 Region not enabled for: ${to}`);
            
            try {
              await chargeInvalidAttempt(dbPool, orgId, invalidAttemptCost, campaignId || null, to);
              await softDeleteContact(dbPool, orgId, to);
              await refreshMaterializedView(dbPool);
              await saveFailedMessage(
                dbPool, orgId, campaignId || null, to, fromPhoneNumber || null,
                finalMessage, 'Region not enabled', segments,
                Math.round(invalidAttemptCost * 100)
              );
            } catch (err: any) {
              console.error(`[OUTBOUND-SMS] ❌ Error handling region not enabled:`, err.message);
            }
            
            console.log(`[OUTBOUND-SMS] ✅ Job completed - region not enabled handled gracefully`);
            return;
          }
          
          // 3. Opted out
          if (twilioError.message.includes("Attempt to send to unsubscribed recipient")) {
            console.log(`[OUTBOUND-SMS] 🛑 Contact opted out via Twilio: ${to}`);
            
            try {
              await markContactOptedOut(dbPool, orgId, to);
              await refreshMaterializedView(dbPool);
              await saveFailedMessage(
                dbPool, orgId, campaignId || null, to, fromPhoneNumber || null,
                finalMessage, 'Contact opted out via Twilio', segments,
                0
              );
            } catch (err: any) {
              console.error(`[OUTBOUND-SMS] ❌ Error handling opted out contact:`, err.message);
            }
            
            console.log(`[OUTBOUND-SMS] ✅ Job completed - opted out contact handled gracefully`);
            return;
          }
          
          // For other errors, throw to retry
          throw new Error(`Twilio failed: ${twilioError.message}`);
        }
      } else {
        // Simulation mode
        console.log(`[OUTBOUND-SMS] 🔧 SIMULATION MODE: Would send to ${to}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        twilioSid = `SIM${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Step 6: Deduct balance and save message
      await query('BEGIN');
      
      try {
        // Deduct balance
        console.log(`[OUTBOUND-SMS] Deducting $${cost.toFixed(4)} credits for org ${orgId}`);
        await query(
          `SELECT deduct_credits($1, $2, $3, $4, $5, $6, $7)`,
          [
            orgId,
            cost,
            segments,
            costPerSegment,
            null,
            campaignId || null,
            `SMS to ${to} (${segments} segment(s) @ $${costPerSegment.toFixed(4)}/seg)`
          ]
        );
        
        // Save message record
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
            twilioStatus,
            segments,
            Math.round(cost * 100),
            campaignId || null,
            templateId || null,
            userId,
            twilioSid,
            twilioStatus,
          ]
        );
        
        console.log(`[OUTBOUND-SMS] Message saved with ID: ${insertResult.rows[0]?.id}`);
        
        // If campaign, check if complete
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
          
          if (stats && stats.status === 'running' && stats.messages_sent >= stats.total_recipients) {
            console.log(`[OUTBOUND-SMS] 🎉 Campaign ${campaignId} complete!`);
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
        console.log(`[OUTBOUND-SMS] ✅ Job ${job.id} completed successfully`);
        
        return { success: true, to, status: 'sent' };
        
      } catch (error: any) {
        console.error(`[OUTBOUND-SMS] ❌ Transaction error:`, error.message);
        await query('ROLLBACK');
        
        // If Twilio send succeeded, don't throw (prevents duplicate sends)
        if (twilioSid) {
          console.warn(`[OUTBOUND-SMS] ⚠️  DB save failed but Twilio send succeeded (${twilioSid})`);
          return { success: true, twilioSid, warning: 'DB save failed but SMS sent' };
        }
        
        throw error;
      }
      
    } catch (error: any) {
      console.error(`[OUTBOUND-SMS] ❌ Job ${job.id} failed:`, error.message);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

console.log('[OUTBOUND-SMS] ✅ Worker created successfully');

