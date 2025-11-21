/**
 * Main Worker Entry Point
 * Starts all workers (SMS, Campaign, Contact Import)
 */

console.log('🚀 Starting Workers...');
console.log('📦 Redis:', process.env.REDIS_URL?.split('@')[1] || 'connecting...');
console.log('💾 Database:', process.env.DATABASE_URL?.includes('supabase') ? 'Supabase' : 'PostgreSQL');
console.log('📱 Twilio:', process.env.TWILIO_ACCOUNT_SID ? 'Configured' : '❌ NOT CONFIGURED');
console.log('🌍 Environment:', process.env.RAILWAY_ENVIRONMENT || 'local');
console.log('🔢 Node version:', process.version);
console.log('');

// Import all workers
import { outboundSMSWorker } from './outbound-sms-worker';
import { campaignWorker } from './campaign-worker';
import { contactImportWorker } from './contact-import-worker';
import { redisConnection, dbPool } from './worker-setup';

// Worker event listeners
outboundSMSWorker.on('completed', (job) => {
  console.log(`[OUTBOUND-SMS] Job ${job.id} completed`);
});

outboundSMSWorker.on('failed', (job, error) => {
  console.error(`[OUTBOUND-SMS] Job ${job?.id} failed:`, error.message);
});

outboundSMSWorker.on('error', (error) => {
  console.error('[OUTBOUND-SMS] Worker error:', error);
});

campaignWorker.on('completed', (job) => {
  console.log(`[CAMPAIGN] Job ${job.id} completed`);
});

campaignWorker.on('failed', (job, error) => {
  console.error(`[CAMPAIGN] Job ${job?.id} failed:`, error.message);
});

campaignWorker.on('error', (error) => {
  console.error('[CAMPAIGN] Worker error:', error);
});

console.log('');
console.log('✅ All workers started successfully');
console.log('🎯 Ready to process jobs...');
console.log('');

// Keep process alive
setInterval(() => {
  // This keeps the Node.js event loop running
}, 60000);

// Error handlers
process.on('uncaughtException', (error) => {
  console.error('[ERROR] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERROR] Unhandled rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\n[WORKER] Shutting down...');
  
  try {
    await outboundSMSWorker.close();
    await campaignWorker.close();
    await contactImportWorker.close();
    await redisConnection.quit();
    await dbPool.end();
    
    console.log('[WORKER] ✅ All workers shut down successfully');
    process.exit(0);
  } catch (error) {
    console.error('[WORKER] ❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);


