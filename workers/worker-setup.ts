/**
 * Shared Worker Setup
 * Common configuration and connections for all workers
 */

import IORedis from 'ioredis';
import { Pool } from 'pg';
import twilio from 'twilio';

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
  console.error('⚠️  WARNING: Twilio credentials not set - SMS sending will be simulated');
}

// Initialize Twilio client
export const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Create dedicated database pool for worker with proper SSL config
export const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: {
    rejectUnauthorized: false,
  },
});

dbPool.on('error', (err) => {
  console.error('[DB] Pool error:', err);
});

// Helper function for queries (uses dbPool by default)
export async function query(sql: string, params?: any[]): Promise<any>;
export async function query(pool: Pool, sql: string, params?: any[]): Promise<any>;
export async function query(poolOrSql: Pool | string, sqlOrParams?: string | any[], params?: any[]): Promise<any> {
  let pool: Pool;
  let sql: string;
  let queryParams: any[] | undefined;

  if (typeof poolOrSql === 'string') {
    // Called as: query(sql, params)
    pool = dbPool;
    sql = poolOrSql;
    queryParams = sqlOrParams as any[];
  } else {
    // Called as: query(pool, sql, params)
    pool = poolOrSql;
    sql = sqlOrParams as string;
    queryParams = params;
  }

  const client = await pool.connect();
  try {
    return await client.query(sql, queryParams);
  } finally {
    client.release();
  }
}

// Connect to Redis with keepalive to prevent connection drops
console.log('[REDIS] Connecting to Redis...');
export const redisConnection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false,
  keepAlive: 30000, // Send keepalive every 30s
  family: 0, // Use IPv4 and IPv6
});

redisConnection.on('connect', () => {
  console.log('[REDIS] ✅ Connected to Redis successfully');
});

redisConnection.on('error', (err) => {
  console.error('[REDIS] ❌ Error:', err.message);
});

redisConnection.on('close', () => {
  console.log('[REDIS] Connection closed');
});

