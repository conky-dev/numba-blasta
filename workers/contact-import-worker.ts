/**
 * Contact Import Worker
 * Handles CSV contact imports with validation and deduplication
 */

import { Worker, Job } from 'bullmq';
import Papa from 'papaparse';
import { ContactImportJobData, ContactImportJobProgress } from '@/app/api/_lib/contact-import-queue';
import { redisConnection, dbPool, query } from './worker-setup';

console.log('[CONTACT-IMPORT] Creating worker...');

interface CSVRow {
  [key: string]: string | undefined;
}

// Helper to get field value from row
const getFieldValue = (
  row: CSVRow,
  targetField: string,
  fallbackKeys: string[],
  mapping: Record<string, string>
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

// Helper to normalize phone number
const normalizePhone = (phone: string): string => {
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // If it starts with +, keep it
  if (normalized.startsWith('+')) {
    return normalized;
  }
  
  // If it's 10 digits (US number without country code), add +1
  if (normalized.length === 10) {
    return `+1${normalized}`;
  }
  
  // If it's 11 digits starting with 1 (US number with country code but no +), add +
  if (normalized.length === 11 && normalized.startsWith('1')) {
    return `+${normalized}`;
  }
  
  // Otherwise, add + if not present
  return normalized.startsWith('+') ? normalized : `+${normalized}`;
};

export const contactImportWorker = new Worker<ContactImportJobData>(
  'contact-import',
  async (job: Job<ContactImportJobData>) => {
    console.log(`[CONTACT-IMPORT] Processing job ${job.id} - ${job.data.csvData.length} bytes`);
    
    const { orgId, userId, csvData, category, mapping = {} } = job.data;

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

      // Track unique phones in this batch to prevent duplicates within the CSV
      const seenPhonesInBatch = new Set<string>();

      // Build multi-row upsert
      const values: any[] = [];
      const valuePlaceholders: string[] = [];
      let paramIndex = 1;

      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        let phone = getFieldValue(row, 'phone', ['phone', 'phone_number', 'mobile'], mapping) || '';

        // Skip if no phone
        if (!phone) {
          progress.skipped++;
          progress.errors.push(`Row ${batchStart + i + 2}: Missing phone number`);
          continue;
        }

        // Normalize phone number
        phone = normalizePhone(phone);

        // Validate normalized phone
        if (!phoneRegex.test(phone)) {
          progress.skipped++;
          progress.errors.push(`Row ${batchStart + i + 2}: Invalid phone format after normalization: ${phone}`);
          continue;
        }

        // Check for duplicates within the CSV batch
        if (seenPhonesInBatch.has(phone)) {
          progress.skipped++;
          progress.errors.push(`Row ${batchStart + i + 2}: Duplicate phone number in CSV: ${phone}`);
          continue;
        }
        
        seenPhonesInBatch.add(phone);

        const firstName = getFieldValue(row, 'first_name', ['first_name', 'firstname', 'first'], mapping) || null;
        const lastName = getFieldValue(row, 'last_name', ['last_name', 'lastname', 'last'], mapping) || null;
        const email = getFieldValue(row, 'email', ['email', 'email_address'], mapping) || null;

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
          // Get phones to check
          const phonesToCheck = [];
          for (let i = 1; i < values.length; i += 6) {
            phonesToCheck.push(values[i]); // phone is at index 1, 7, 13, etc.
          }
          
          // Check for opted-out/deleted contacts AND contacts that already have this category
          const existingContactsResult = await query(
            `SELECT phone, opted_out_at, deleted_at, category
             FROM contacts
             WHERE org_id = $1
               AND phone = ANY($2)
               AND deleted_at IS NULL`,
            [orgId, phonesToCheck]
          );
          
          const excludedPhones = new Set<string>();
          const phonesWithCategory = new Set<string>();
          
          for (const row of existingContactsResult.rows) {
            // Exclude if opted out or deleted
            if (row.opted_out_at || row.deleted_at) {
              excludedPhones.add(row.phone);
            }
            // Check if contact already has ALL the categories we're trying to add
            if (row.category && Array.isArray(row.category)) {
              const hasAllCategories = category.every((cat: string) => row.category.includes(cat));
              if (hasAllCategories) {
                phonesWithCategory.add(row.phone);
              }
            }
          }
          
          // Filter out contacts that should be skipped
          const filteredValuePlaceholders: string[] = [];
          const filteredValues: any[] = [];
          let filteredParamIndex = 1;
          
          for (let i = 0; i < valuePlaceholders.length; i++) {
            const phoneIndex = i * 6 + 1; // phone is at positions 1, 7, 13, etc.
            const phone = values[phoneIndex];
            
            if (excludedPhones.has(phone)) {
              // Contact is opted out or deleted, skip completely
              progress.skipped++;
              progress.errors.push(`Row ${batchStart + i + 2}: Contact ${phone} is opted-out or deleted, skipping`);
            } else if (phonesWithCategory.has(phone)) {
              // Contact already has this category, skip to avoid duplicate
              progress.skipped++;
              progress.errors.push(`Row ${batchStart + i + 2}: Contact ${phone} already exists in this category, skipping`);
            } else {
              // Contact is clean, add to batch
              filteredValuePlaceholders.push(
                `($${filteredParamIndex}, $${filteredParamIndex + 1}, $${filteredParamIndex + 2}, $${filteredParamIndex + 3}, $${filteredParamIndex + 4}, $${filteredParamIndex + 5}, NULL)`
              );
              filteredValues.push(
                values[i * 6],     // org_id
                values[i * 6 + 1], // phone
                values[i * 6 + 2], // first_name
                values[i * 6 + 3], // last_name
                values[i * 6 + 4], // email
                values[i * 6 + 5]  // category
              );
              filteredParamIndex += 6;
            }
          }
          
          // Execute filtered batch upsert
          if (filteredValuePlaceholders.length > 0) {
            const upsertResult = await query(
              `INSERT INTO contacts (org_id, phone, first_name, last_name, email, category, deleted_at)
               VALUES ${filteredValuePlaceholders.join(', ')}
               ON CONFLICT (org_id, phone, deleted_at)
               DO UPDATE SET
                 first_name = COALESCE(EXCLUDED.first_name, contacts.first_name),
                 last_name = COALESCE(EXCLUDED.last_name, contacts.last_name),
                 email = COALESCE(EXCLUDED.email, contacts.email),
                 category = array(SELECT DISTINCT unnest(contacts.category || EXCLUDED.category)),
                 updated_at = NOW()
               RETURNING (xmax = 0) AS inserted`,
              filteredValues
            );

            // Count inserts vs updates
            for (const row of upsertResult.rows) {
              if (row.inserted) {
                progress.created++;
              } else {
                progress.updated++;
              }
            }
          }
        } catch (error: any) {
          console.error(`[CONTACT-IMPORT] Batch error:`, error);
          progress.skipped += valuePlaceholders.length;
          progress.errors.push(`Batch ${batchStart}-${batchEnd}: ${error.message}`);
        }
      }

      progress.processed = batchEnd;
      await job.updateProgress(progress);

      // Log progress every 1000 contacts
      if (progress.processed % 1000 === 0) {
        console.log(
          `[CONTACT-IMPORT] Progress: ${progress.processed}/${progress.total} ` +
          `(created: ${progress.created}, updated: ${progress.updated}, skipped: ${progress.skipped})`
        );
      }
    }

    // Refresh materialized view for category counts
    try {
      await query('REFRESH MATERIALIZED VIEW CONCURRENTLY contact_category_counts');
      console.log('[CONTACT-IMPORT] ✅ Refreshed category counts view');
    } catch (error) {
      console.warn('[CONTACT-IMPORT] Failed to refresh category counts view:', error);
    }

    console.log(
      `[CONTACT-IMPORT] ✅ Completed job ${job.id}: ` +
      `${progress.created} created, ${progress.updated} updated, ${progress.skipped} skipped`
    );

    return progress;
  },
  {
    connection: redisConnection.duplicate(),
    concurrency: 2,
  }
);

contactImportWorker.on('completed', (job, result) => {
  const progress = result as ContactImportJobProgress;
  console.log(
    `[CONTACT-IMPORT] ✅ Job ${job.id} completed: ` +
    `${progress.created} created, ${progress.updated} updated, ${progress.skipped} skipped`
  );
});

contactImportWorker.on('failed', (job, err) => {
  console.error(`[CONTACT-IMPORT] ❌ Job ${job?.id} failed:`, err.message);
});

console.log('[CONTACT-IMPORT] ✅ Worker created successfully');

