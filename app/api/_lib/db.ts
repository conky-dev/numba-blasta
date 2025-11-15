import { Pool, QueryResult, QueryResultRow } from 'pg';

let pool: Pool | null = null;

// Get or create database connection pool (API-layer only)
export function getPool(): Pool {
  if (!pool) {
    // Option 1: Use individual connection parameters (supports special chars in password)
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT;
    const database = process.env.DB_NAME;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    
    // Option 2: Use connection string URL (requires URL-encoded password)
    const url = process.env.DATABASE_URL;
    
    // SSL configuration for Supabase
    const sslConfig = {
      rejectUnauthorized: false, // Accept self-signed certs from Supabase
    };
    
    // Prefer individual parameters if all are set (easier with special chars)
    if (host && user && password && database) {
      console.log('[DB] ℹ️  Using individual connection parameters');
      console.log('[DB] ℹ️  Connection info:', {
        host,
        port: port || '5432',
        database,
        user,
        hasPassword: !!password,
      });
      
      try {
        pool = new Pool({
          host,
          port: parseInt(port || '5432'),
          database,
          user,
          password, // No encoding needed!
          ssl: sslConfig,
          // Serverless-optimized settings
          max: 1, // Use only 1 connection per Lambda (Vercel serverless)
          idleTimeoutMillis: 10000, // Close idle connections after 10s
          connectionTimeoutMillis: 5000, // Fail fast if can't connect
        });
        
        pool.on('error', (err) => {
          console.error('[DB] Unexpected pool error:', err);
          // Reset pool on error so next request creates fresh connection
          pool = null;
        });
        
        console.log('[DB] ✅ Pool created with individual parameters');
      } catch (error: any) {
        console.error('[DB] ❌ Failed to create database pool:', error.message);
        throw error;
      }
    }
    // Fall back to connection string
    else if (url) {
      console.log('[DB] ℹ️  Using DATABASE_URL connection string');
      
      // Validate DATABASE_URL format
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
        console.log('[DB] ℹ️  Database connection info:', {
          protocol: parsedUrl.protocol,
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || '(default)',
          database: parsedUrl.pathname?.substring(1) || '(none)',
          hasUsername: !!parsedUrl.username,
          hasPassword: !!parsedUrl.password,
        });
        
        // Check if password contains special characters that need encoding
        if (parsedUrl.password) {
          const needsEncoding = /[@&:\/\?#\[\]@!$'()*+,;=]/.test(parsedUrl.password);
          if (needsEncoding) {
            console.log('[DB] ⚠️  Password contains special characters - ensure proper URL encoding');
          }
        }
        
      } catch (urlError: any) {
        console.error('[DB] ❌ Invalid DATABASE_URL format:', urlError.message);
        console.error('[DB] ❌ DATABASE_URL starts with:', url.substring(0, 50));
        console.error('[DB] 💡 TIP: If your password has special characters like @ & : / ?');
        console.error('[DB] 💡      Option 1: URL-encode them (e.g., @ becomes %40, & becomes %26)');
        console.error('[DB] 💡      Option 2: Use separate env vars: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT');
        throw new Error('DATABASE_URL is not a valid connection string. Please check your Vercel environment variables.');
      }
      
      try {
        pool = new Pool({ 
          connectionString: url, 
          ssl: sslConfig,
          // Serverless-optimized settings
          max: 1, // Use only 1 connection per Lambda (Vercel serverless)
          idleTimeoutMillis: 10000, // Close idle connections after 10s
          connectionTimeoutMillis: 5000, // Fail fast if can't connect
        });
        
        pool.on('error', (err) => {
          console.error('[DB] Unexpected pool error:', err);
          // Reset pool on error so next request creates fresh connection
          pool = null;
        });
        
        console.log('[DB] ✅ Pool created with connection string');
      } catch (error: any) {
        console.error('[DB] ❌ Failed to create database pool:', error.message);
        throw error;
      }
    }
    else {
      console.error('[DB] ❌ No database connection configuration found!');
      console.error('[DB] 💡 Set either DATABASE_URL or (DB_HOST + DB_USER + DB_PASSWORD + DB_NAME)');
      throw new Error('Database connection not configured. Please set DATABASE_URL or individual DB_* environment variables.');
    }
  }
  return pool;
}

// Force pool recreation (useful for workers / tests)
export function resetPool() {
  if (pool) {
    pool.end();
    pool = null;
  }
}

/**
 * Execute a database query
 * This function should ONLY be used within API routes
 * Includes retry logic for "Connection terminated unexpectedly" errors
 */
export async function query<T extends QueryResultRow = any>(
  sql: string,
  params?: any[]
): Promise<QueryResult<T>> {
  let lastError: any;
  
  // Retry up to 2 times on connection termination
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const currentPool = getPool();
      const client = await currentPool.connect();
      try {
        const res = await client.query(sql, params);
        return res;
      } finally {
        client.release();
      }
    } catch (error: any) {
      lastError = error;
      
      // If connection terminated, reset pool and retry once
      if (error.message?.includes('Connection terminated unexpectedly') && attempt === 1) {
        console.warn(`[DB] ⚠️  Connection terminated, resetting pool and retrying (attempt ${attempt}/2)`);
        pool = null; // Force recreation on next getPool()
        continue;
      }
      
      // Otherwise, log and rethrow
      console.error('[DB] ❌ Database query failed:', {
        error: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        sql: sql?.substring(0, 100) + '...',
        stack: error.stack?.split('\n')[0],
        attempt
      });
      
      // Add helpful error message for common issues
      if (error.code === 'ENOTFOUND') {
        console.error('[DB] 🔴 ENOTFOUND error means the database hostname cannot be resolved.');
        console.error('[DB] 🔴 Please check your DATABASE_URL environment variable in Vercel.');
        console.error('[DB] 🔴 It should look like: postgresql://user:pass@host.supabase.co:5432/postgres');
      }
      
      throw error;
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw lastError;
}

