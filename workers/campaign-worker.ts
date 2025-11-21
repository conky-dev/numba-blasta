/**
 * Campaign Worker
 * Handles SMS campaign processing and message queuing
 */

import { Worker, Job, Queue } from 'bullmq';
import { redisConnection, dbPool, query } from './worker-setup';

console.log('[CAMPAIGN] Creating worker...');

export const campaignWorker = new Worker(
  'campaigns',
  async (job: Job) => {
    console.log(`[CAMPAIGN] Processing campaign job ${job.id}`);
    
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
        // Filter by categories
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
      
      const smsQueue = new Queue('sms', { connection: redisConnection });
      
      let queuedCount = 0;
      const batchSize = 100; // Queue in batches
      
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        
        for (const contact of batch) {
          // Render message with contact data
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
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`[CAMPAIGN] ✅ Campaign ${campaignId} queued ${queuedCount} messages`);
      
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
    connection: redisConnection,
    concurrency: 2,
  }
);

console.log('[CAMPAIGN] ✅ Worker created successfully');

