/**
 * Worker Utility Functions
 * Shared helper functions for SMS and campaign workers
 */

import { Pool } from 'pg';

// =================================================================
// Database Query Helper
// =================================================================

export async function query(dbPool: Pool, sql: string, params?: any[]) {
  const client = await dbPool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

// =================================================================
// Error Handling Helpers
// =================================================================

/**
 * Charge for invalid attempt (invalid number, region not enabled, etc.)
 */
export async function chargeInvalidAttempt(
  dbPool: Pool,
  orgId: string,
  invalidAttemptCost: number,
  campaignId: string | null,
  to: string
): Promise<void> {
  if (invalidAttemptCost > 0) {
    const deductResult = await query(
      dbPool,
      `SELECT deduct_credits($1, $2, $3, $4, $5, $6, $7) as transaction_id`,
      [
        orgId,
        invalidAttemptCost,
        1,
        invalidAttemptCost,
        null,
        campaignId || null,
        `Invalid attempt to ${to}`
      ]
    );
    console.log(`[WORKER] 💰 Charged $${invalidAttemptCost} (tx: ${deductResult.rows[0]?.transaction_id})`);
  } else {
    console.warn(`[WORKER] ⚠️  No pricing found for invalid_number_attempt`);
  }
}

/**
 * Soft delete a contact (sets deleted_at timestamp)
 */
export async function softDeleteContact(
  dbPool: Pool,
  orgId: string,
  to: string
): Promise<void> {
  const deleteResult = await query(
    dbPool,
    `UPDATE contacts
     SET deleted_at = NOW(),
         updated_at = NOW()
     WHERE org_id = $1 
       AND (phone = $2 OR phone = $3)
       AND deleted_at IS NULL`,
    [orgId, to, to.replace(/^\+1/, '')]
  );
  
  if (deleteResult.rowCount && deleteResult.rowCount > 0) {
    console.log(`[WORKER] 🗑️ Marked ${deleteResult.rowCount} contact(s) as deleted`);
  } else {
    console.warn(`[WORKER] ⚠️  No contact found to mark as deleted for ${to}`);
  }
}

/**
 * Mark contact as opted out (sets opted_out_at timestamp)
 */
export async function markContactOptedOut(
  dbPool: Pool,
  orgId: string,
  to: string
): Promise<void> {
  const optOutResult = await query(
    dbPool,
    `UPDATE contacts
     SET opted_out_at = NOW(),
         updated_at = NOW()
     WHERE org_id = $1 
       AND (phone = $2 OR phone = $3)
       AND opted_out_at IS NULL`,
    [orgId, to, to.replace(/^\+1/, '')]
  );
  
  if (optOutResult.rowCount && optOutResult.rowCount > 0) {
    console.log(`[WORKER] 🛑 Marked ${optOutResult.rowCount} contact(s) as opted out`);
  } else {
    console.warn(`[WORKER] ⚠️  No contact found to mark as opted out for ${to}`);
  }
}

/**
 * Refresh the contact_category_counts materialized view
 */
export async function refreshMaterializedView(dbPool: Pool): Promise<void> {
  try {
    await query(dbPool, 'REFRESH MATERIALIZED VIEW CONCURRENTLY contact_category_counts');
  } catch (err) {
    console.warn('[WORKER] Failed to refresh view:', err);
  }
}

/**
 * Save a failed message record to the database
 */
export async function saveFailedMessage(
  dbPool: Pool,
  orgId: string,
  campaignId: string | null,
  to: string,
  fromPhoneNumber: string | null,
  finalMessage: string,
  errorMessage: string,
  segments: number,
  priceCents: number
): Promise<void> {
  await query(
    dbPool,
    `INSERT INTO sms_messages 
     (org_id, campaign_id, to_number, from_number, body, direction, status, error_message, segments, price_cents, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
    [
      orgId,
      campaignId || null,
      to,
      fromPhoneNumber || null,
      finalMessage,
      'outbound',
      'failed',
      errorMessage,
      segments,
      priceCents
    ]
  );
  console.log(`[WORKER] 📝 Saved failed message record: ${errorMessage}`);
}

