/**
 * Contact Import Queue
 * Manages contact CSV import jobs
 */

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export interface ContactImportJobData {
  orgId: string;
  userId: string;
  csvData: string; // Raw CSV content
  category: string[]; // Categories to assign
  mapping?: Record<string, string>; // Column mapping
}

export interface ContactImportJobProgress {
  total: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// Create Redis connection for queue
const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

// Create contact import queue
export const contactImportQueue = new Queue<ContactImportJobData>('contact-import', {
  connection,
  defaultJobOptions: {
    attempts: 1, // Don't retry on failure (CSV imports are idempotent but could cause duplicates)
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 100,
    },
    removeOnFail: {
      age: 7200, // Keep failed jobs for 2 hours
      count: 50,
    },
  },
});

/**
 * Add a contact import job to the queue
 */
export async function queueContactImport(data: ContactImportJobData): Promise<string> {
  const job = await contactImportQueue.add('import-csv', data);
  if (!job.id) {
    throw new Error('Failed to create job - no job ID returned');
  }
  return job.id;
}

/**
 * Get job status and progress
 */
export async function getImportJobStatus(jobId: string) {
  const job = await contactImportQueue.getJob(jobId);
  
  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = (job.progress as ContactImportJobProgress) || {
    total: 0,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  return {
    id: job.id,
    state, // 'waiting', 'active', 'completed', 'failed'
    progress,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason,
  };
}

