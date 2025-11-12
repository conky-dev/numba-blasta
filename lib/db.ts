import { Pool, QueryResult, QueryResultRow } from 'pg';

let pool: Pool | null = null;

// Force pool recreation (useful for workers)
export function resetPool() {
  if (pool) {
    pool.end();
    pool = null;
  }
}

function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set.');
    
    // Supabase SSL configuration - simplified for compatibility
    // Accept Supabase's certificates without strict validation
    const sslConfig = {
      rejectUnauthorized: false, // Accept self-signed certs from Supabase
    };
    
    console.log('[DB] Creating new connection pool with SSL config');
    
    try {
      pool = new Pool({ 
        connectionString: url, 
        ssl: sslConfig
      });
      
      pool.on('error', (err) => {
        console.error('[DB] Unexpected pool error:', err);
      });
      
    } catch (error: any) {
      console.error('Failed to create database pool:', error.message);
      throw error;
    }
  }
  return pool;
}

export async function query<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      const res = await client.query(sql, params);
      return res;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Database query failed:', {
      error: error.message,
      code: error.code,
      sql: sql?.substring(0, 100) + '...',
      stack: error.stack?.split('\n')[0]
    });
    throw error;
  }
}

