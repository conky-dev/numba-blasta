import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';

/**
 * GET /api/campaigns/:id/metrics
 * Get detailed metrics for a campaign
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { id: campaignId } = await params;

    // Get campaign metrics using helper function
    const result = await query(
      `SELECT * FROM get_campaign_metrics($1)`,
      [campaignId]
    );

    if (result.rows.length === 0) {
      // Campaign doesn't exist or doesn't belong to org
      const campaignCheck = await query(
        `SELECT id FROM sms_campaigns 
         WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
        [campaignId, auth.orgId]
      );

      if (campaignCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        );
      }
    }

    const metrics = result.rows[0];

    return NextResponse.json({
      metrics: {
        sent: metrics.sent,
        delivered: metrics.delivered,
        failed: metrics.failed,
        replied: metrics.replied,
        deliveryRate: parseFloat(metrics.delivery_rate),
        failRate: parseFloat(metrics.fail_rate),
        replyRate: parseFloat(metrics.reply_rate),
      },
    });
  } catch (error: any) {
    console.error('Get campaign metrics error:', error);
    
    if (error.message.includes('token') || error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to get campaign metrics' },
      { status: 500 }
    );
  }
}

