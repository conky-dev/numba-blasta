import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';

/**
 * POST /api/campaigns/:id/duplicate
 * Duplicate a campaign (creates a new draft copy)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { id: campaignId } = await params;

    // Get original campaign
    const result = await query(
      `SELECT name, message, template_id, list_id
       FROM sms_campaigns 
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [campaignId, auth.orgId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const original = result.rows[0];

    // Create duplicate with "(Copy)" suffix
    const newName = `${original.name} (Copy)`;
    
    const duplicateResult = await query(
      `INSERT INTO sms_campaigns (
        org_id, name, message, template_id, list_id, status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, 'draft', $6)
      RETURNING 
        id, name, message, template_id, list_id, status, 
        created_at, updated_at`,
      [
        auth.orgId,
        newName,
        original.message,
        original.template_id,
        original.list_id,
        auth.userId
      ]
    );

    const campaign = duplicateResult.rows[0];

    return NextResponse.json({
      success: true,
      campaign,
      message: 'Campaign duplicated successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Duplicate campaign error:', error);
    
    if (error.message.includes('token') || error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to duplicate campaign' },
      { status: 500 }
    );
  }
}

