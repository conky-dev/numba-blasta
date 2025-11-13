import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Initialize Redis connection for BullMQ
const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

// Create campaign queue
const campaignQueue = new Queue('campaigns', { connection });

/**
 * POST /api/campaigns/:id/cancel
 * Cancels a scheduled campaign
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate request
    const { userId, orgId } = await authenticateRequest(request);
    const { id: campaignId } = await params;

    console.log(`🚫 Canceling campaign ${campaignId}`);

    // Get campaign details
    const campaignResult = await query(
      `SELECT id, name, status, org_id
       FROM sms_campaigns
       WHERE id = $1 AND deleted_at IS NULL`,
      [campaignId]
    );

    if (campaignResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const campaign = campaignResult.rows[0];

    // Verify ownership
    if (campaign.org_id !== orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Only scheduled campaigns can be cancelled
    if (campaign.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Only scheduled campaigns can be cancelled' },
        { status: 400 }
      );
    }

    // Remove the job from the queue
    try {
      const jobId = `campaign-${campaignId}`;
      const job = await campaignQueue.getJob(jobId);
      
      if (job) {
        await job.remove();
        console.log(`✅ Removed job ${jobId} from queue`);
      } else {
        console.warn(`⚠️  Job ${jobId} not found in queue (may have already processed)`);
      }
    } catch (queueError: any) {
      console.error('❌ Error removing job from queue:', queueError.message);
      // Continue anyway - update the status even if job removal fails
    }

    // Update campaign status to 'draft'
    await query(
      `UPDATE sms_campaigns
       SET status = 'draft',
           scheduled_at = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [campaignId]
    );

    console.log(`✅ Campaign ${campaignId} cancelled successfully`);

    return NextResponse.json({
      message: 'Campaign cancelled successfully',
      campaign: {
        id: campaignId,
        status: 'draft',
      },
    });
  } catch (error: any) {
    console.error('❌ Cancel campaign error:', error);
    
    if (error.message.includes('token') || error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

