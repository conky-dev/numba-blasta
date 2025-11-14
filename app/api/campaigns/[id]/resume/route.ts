import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';

/**
 * PATCH /api/campaigns/:id/resume
 * Resume a paused campaign
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { id: campaignId } = await params;

    // Check campaign exists and is paused
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
    if (currentStatus !== 'paused') {
      return NextResponse.json(
        { error: `Cannot resume campaign with status: ${currentStatus}` },
        { status: 422 }
      );
    }

    // Update status to running
    const result = await query(
      `UPDATE sms_campaigns
       SET status = 'running', updated_at = NOW()
       WHERE id = $1 AND org_id = $2
       RETURNING id, name, status, updated_at`,
      [campaignId, auth.orgId]
    );

    return NextResponse.json({
      success: true,
      campaign: result.rows[0],
      message: 'Campaign resumed successfully',
    });
  } catch (error: any) {
    console.error('Resume campaign error:', error);
    
    if (error.message.includes('token') || error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to resume campaign' },
      { status: 500 }
    );
  }
}

