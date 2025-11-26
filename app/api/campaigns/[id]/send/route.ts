import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Initialize Redis connection for BullMQ
const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

// Create campaign queue
const campaignQueue = new Queue('campaigns', { connection });

/**
 * POST /api/campaigns/:id/send
 * Sends or schedules a campaign
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate request
    const { userId, orgId } = await authenticateRequest(request);
    const { id: campaignId } = await params;
    
    // Get optional scheduledAt from request body
    const body = await request.json().catch(() => ({}));
    const { scheduledAt } = body;

    // Get campaign and verify ownership & status
    const campaignResult = await query(
      `SELECT id, org_id, status, list_id, message, template_id, schedule_at
       FROM sms_campaigns 
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [campaignId, orgId]
    );

    if (campaignResult.rows.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const campaign = campaignResult.rows[0];

    // Only draft or scheduled campaigns can be sent
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return NextResponse.json(
        { error: `Cannot send campaign with status: ${campaign.status}` },
        { status: 400 }
      );
    }

    // Validate campaign has required fields
    if (!campaign.message && !campaign.template_id) {
      return NextResponse.json(
        { error: 'Campaign must have a message or template' },
        { status: 400 }
      );
    }

    // Check if organization has a phone number and if it's verified
    const phoneResult = await query(
      `SELECT id, status FROM phone_numbers 
       WHERE org_id = $1 AND is_primary = true`,
      [orgId]
    );

    if (phoneResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No phone number configured for this organization' },
        { status: 422 }
      );
    }

    const phoneStatus = phoneResult.rows[0].status;
    if (phoneStatus === 'awaiting_verification') {
      return NextResponse.json(
        { error: 'Cannot send campaign while phone number is awaiting verification. Please complete the verification process first.' },
        { status: 422 }
      );
    }

    // Determine if this is scheduled or immediate
    const scheduleTime = scheduledAt || campaign.schedule_at;
    const isScheduled = !!scheduleTime;
    
    if (isScheduled) {
      // Scheduled campaign
      const scheduledDate = new Date(scheduleTime);
      const now = new Date();
      
      // Validate scheduled time is in the future
      if (scheduledDate <= now) {
        return NextResponse.json(
          { error: 'Scheduled time must be in the future' },
          { status: 400 }
        );
      }
      
      const delay = scheduledDate.getTime() - now.getTime();
      
      console.log(`📅 Scheduling campaign ${campaignId} for ${scheduledDate.toISOString()}`);
      console.log(`⏰ Delay: ${Math.round(delay / 1000 / 60)} minutes from now`);
      
      // Update campaign status to 'scheduled'
      await query(
        `UPDATE sms_campaigns
         SET status = 'scheduled',
             schedule_at = $1,
             updated_at = NOW()
         WHERE id = $2 AND org_id = $3`,
        [scheduledDate, campaignId, orgId]
      );
      
      // Queue the campaign job with delay
      await campaignQueue.add(
        'send-campaign',
        {
          campaignId,
          orgId,
          userId,
        },
        {
          delay, // Wait until scheduled time
          jobId: `campaign-${campaignId}`, // Prevents duplicate jobs
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
      
      return NextResponse.json({
        message: `Campaign scheduled for ${scheduledDate.toLocaleString()}`,
        campaign: {
          id: campaignId,
          status: 'scheduled',
          schedule_at: scheduledDate,
        },
      });
    } else {
      // Immediate send
      console.log(`🚀 Sending campaign ${campaignId} immediately`);
      
      // Update campaign status to 'running'
      await query(
        `UPDATE sms_campaigns
         SET status = 'running',
             started_at = NOW(),
             updated_at = NOW()
         WHERE id = $1 AND org_id = $2`,
        [campaignId, orgId]
      );
      
      // Queue the campaign job immediately
      await campaignQueue.add(
        'send-campaign',
        {
          campaignId,
          orgId,
          userId,
        },
        {
          jobId: `campaign-${campaignId}`,
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
      
      return NextResponse.json({
        message: 'Campaign started successfully',
        campaign: {
          id: campaignId,
          status: 'running',
          started_at: new Date(),
        },
      });
    }
  } catch (error: any) {
    console.error('❌ Send campaign error:', error);
    
    if (error.message.includes('token') || error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

