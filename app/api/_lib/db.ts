import { Pool, QueryResult, QueryResultRow } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set.');
    
    if (!process.env.SUPABASE_CA_PEM) {
      throw new Error('SUPABASE_CA_PEM environment variable is required for secure database connections.');
    }
    
    // Clean up the PEM certificate
    const cleanPEM = process.env.SUPABASE_CA_PEM
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\\n/g, '\n') // Convert escaped newlines to actual newlines
      .trim();
    
    // Supabase SSL configuration
    const sslConfig = {
      rejectUnauthorized: true,
      ca: cleanPEM,
      checkServerIdentity: (host: string, cert: any) => {
        // Supabase pooler certificates are valid for *.pooler.supabase.com
        if (host.endsWith('.pooler.supabase.com')) {
          return undefined;
        }
        // For direct connections, allow *.supabase.co
        if (host.endsWith('.supabase.co')) {
          return undefined;
        }
        throw new Error(`Hostname ${host} does not match certificate`);
      }
    };
    
    try {
      pool = new Pool({ 
        connectionString: url, 
        ssl: sslConfig
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

