import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';

/**
 * PATCH /api/campaigns/:id/pause
 * Pause a running campaign
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { id: campaignId } = await params;

    // Check campaign exists and is running
    const campaignCheck = await query(
      `SELECT id, status FROM sms_campaigns 
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [campaignId, auth.orgId]
    );

    if (campaignCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const currentStatus = campaignCheck.rows[0].status;
    if (currentStatus !== 'running') {
      return NextResponse.json(
        { error: `Cannot pause campaign with status: ${currentStatus}` },
        { status: 422 }
      );
    }

    // Update status to paused
    const result = await query(
      `UPDATE sms_campaigns
       SET status = 'paused', updated_at = NOW()
       WHERE id = $1 AND org_id = $2
       RETURNING id, name, status, updated_at`,
      [campaignId, auth.orgId]
    );

    return NextResponse.json({
      success: true,
      campaign: result.rows[0],
      message: 'Campaign paused successfully',
    });
  } catch (error: any) {
    console.error('Pause campaign error:', error);
    
    if (error.message.includes('token') || error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to pause campaign' },
      { status: 500 }
    );
  }
}

