import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';

/**
 * POST /api/campaigns/:id/send
 * Sends a campaign immediately (changes status from draft → running)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate request
    const { userId, orgId } = await authenticateRequest(request);
    const { id: campaignId } = await params;

    // Get campaign and verify ownership & status
    const campaignResult = await query(
      `SELECT id, org_id, status, list_id, message, template_id
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

    // TODO: Validate list_id has contacts when contact lists are implemented
    // if (!campaign.list_id) {
    //   return NextResponse.json(
    //     { error: 'Campaign must have a contact list' },
    //     { status: 400 }
    //   );
    // }

    // Update campaign status to 'running' and set started_at
    const updateResult = await query(
      `UPDATE sms_campaigns
       SET status = 'running',
           started_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND org_id = $2
       RETURNING id, name, status, started_at`,
      [campaignId, orgId]
    );

    // TODO: In production, this would:
    // 1. Enqueue a background job to process the campaign
    // 2. Fetch contacts from the contact list
    // 3. Send SMS messages in batches
    // 4. Update metrics as messages are sent
    // 5. Change status to 'done' when complete
    
    // For now, we'll just mark it as running
    console.log(`Campaign ${campaignId} marked as running. Background job would be enqueued here.`);

    return NextResponse.json({
      message: 'Campaign started successfully',
      campaign: updateResult.rows[0],
    });
  } catch (error: any) {
    console.error('Send campaign error:', error);
    
    if (error.message.includes('token') || error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

