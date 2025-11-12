#!/usr/bin/env node

/**
 * Start the SMS worker
 * This script starts the worker that processes SMS jobs from the queue
 * 
 * Usage:
 *   npm run worker
 *   node workers/start-worker.js
 */

// Load environment variables (only needed for local dev)
// Railway/production provides env vars automatically
if (!process.env.RAILWAY_ENVIRONMENT) {
  const dotenv = require('dotenv');
  const fs = require('fs');
  const path = require('path');
  let str = "cheese2";
  
  // Try .env.local first, then .env
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  const envPath = path.join(__dirname, '..', '.env');
  
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
    console.log('📄 Loaded environment from .env.local');
  } else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('📄 Loaded environment from .env');
  } else {
    console.warn('⚠️  No .env or .env.local file found');
  }
}

// Check required environment variables
if (!process.env.REDIS_URL) {
  console.error('❌ ERROR: REDIS_URL is not set in environment variables');
  console.error('   Add REDIS_URL to your .env.local file');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set in environment variables');
  process.exit(1);
}

console.log('🚀 Starting SMS Worker...');
console.log('📦 Redis:', process.env.REDIS_URL?.split('@')[1] || 'connected');
console.log('💾 Database:', process.env.DATABASE_URL?.includes('supabase') ? 'Supabase' : 'PostgreSQL');
console.log('🔐 SSL Cert:', process.env.SUPABASE_CA_PEM ? 'Loaded' : '❌ MISSING');
console.log('');

// Import and start worker using tsx
// tsx allows running TypeScript files directly
const { spawn } = require('child_process');
const path = require('path');

// Use tsx to run the TypeScript worker
const tsxBin = path.join(__dirname, '..', 'node_modules', '.bin', 'tsx');
const workerPath = path.join(__dirname, 'sms-worker.ts');

const worker = spawn(tsxBin, [workerPath], {
  stdio: 'inherit',
  env: process.env
});

worker.on('exit', (code) => {
  console.log(`[WORKER] Process exited with code ${code}`);
  process.exit(code);
});

// Handle shutdown signals
process.on('SIGINT', () => {
  console.log('\n[WORKER] Received SIGINT, shutting down...');
  worker.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n[WORKER] Received SIGTERM, shutting down...');
  worker.kill('SIGTERM');
});

