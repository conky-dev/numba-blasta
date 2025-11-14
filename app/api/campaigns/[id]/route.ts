import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';

/**
 * GET /api/campaigns/:id
 * Get a single campaign by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { id: campaignId } = await params;

    const result = await query(
      `SELECT 
        c.id, 
        c.name, 
        c.message,
        c.template_id,
        t.name as template_name,
        t.content as template_content,
        c.list_id,
        c.status,
        c.schedule_at,
        c.started_at,
        c.completed_at,
        c.total_recipients,
        c.sent_count,
        c.delivered_count,
        c.failed_count,
        c.replied_count,
        c.created_by,
        c.created_at,
        c.updated_at
      FROM sms_campaigns c
      LEFT JOIN sms_templates t ON c.template_id = t.id
      WHERE c.id = $1 AND c.org_id = $2 AND c.deleted_at IS NULL`,
      [campaignId, auth.orgId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const campaign = result.rows[0];

    // Calculate metrics
    const deliveryRate = campaign.sent_count > 0 
      ? ((campaign.delivered_count / campaign.sent_count) * 100).toFixed(2)
      : '0';
    const failRate = campaign.sent_count > 0 
      ? ((campaign.failed_count / campaign.sent_count) * 100).toFixed(2)
      : '0';
    const replyRate = campaign.delivered_count > 0 
      ? ((campaign.replied_count / campaign.delivered_count) * 100).toFixed(2)
      : '0';

    return NextResponse.json({
      campaign: {
        ...campaign,
        metrics: {
          sent: campaign.sent_count,
          delivered: campaign.delivered_count,
          failed: campaign.failed_count,
          replied: campaign.replied_count,
          deliveryRate: parseFloat(deliveryRate),
          failRate: parseFloat(failRate),
          replyRate: parseFloat(replyRate),
        }
      },
    });
  } catch (error: any) {
    console.error('Get campaign error:', error);
    
    if (error.message.includes('token') || error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to get campaign' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/campaigns/:id
 * Update a campaign (only if draft, scheduled, or paused)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { id: campaignId } = await params;
    const { name, message, templateId, listId, scheduleAt } = await request.json();

    // Validation
    if (!name && !message && !templateId && !listId && scheduleAt === undefined) {
      return NextResponse.json(
        { error: 'At least one field is required' },
        { status: 422 }
      );
    }

    // Check campaign exists and is editable
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
    if (!['draft', 'scheduled', 'paused'].includes(currentStatus)) {
      return NextResponse.json(
        { error: `Cannot edit campaign with status: ${currentStatus}` },
        { status: 422 }
      );
    }

    // Validate template exists if provided
    if (templateId) {
      const templateCheck = await query(
        'SELECT id FROM sms_templates WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL',
        [templateId, auth.orgId]
      );

      if (templateCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (name) {
      updates.push(`name = $${paramIndex++}`);
      queryParams.push(name);
    }

    if (message !== undefined) {
      updates.push(`message = $${paramIndex++}`);
      queryParams.push(message);
    }

    if (templateId !== undefined) {
      updates.push(`template_id = $${paramIndex++}`);
      queryParams.push(templateId);
    }

    if (listId !== undefined) {
      updates.push(`list_id = $${paramIndex++}`);
      queryParams.push(listId);
    }

    if (scheduleAt !== undefined) {
      updates.push(`schedule_at = $${paramIndex++}`);
      queryParams.push(scheduleAt);
      
      // Update status if scheduling
      if (scheduleAt && new Date(scheduleAt) > new Date()) {
        updates.push(`status = 'scheduled'`);
      }
    }

    queryParams.push(campaignId, auth.orgId);

    const result = await query(
      `UPDATE sms_campaigns
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex++} AND org_id = $${paramIndex++}
       RETURNING 
        id, name, message, template_id, list_id, status, 
        schedule_at, created_at, updated_at`,
      queryParams
    );

    const campaign = result.rows[0];

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (error: any) {
    console.error('Update campaign error:', error);
    
    if (error.message.includes('token') || error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/campaigns/:id
 * Soft delete a campaign (only if not running)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { id: campaignId } = await params;

    // Check campaign exists and is not running
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

    if (campaignCheck.rows[0].status === 'running') {
      return NextResponse.json(
        { error: 'Cannot delete a running campaign' },
        { status: 422 }
      );
    }

    // Soft delete
    await query(
      `UPDATE sms_campaigns
       SET deleted_at = NOW()
       WHERE id = $1 AND org_id = $2`,
      [campaignId, auth.orgId]
    );

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete campaign error:', error);
    
    if (error.message.includes('token') || error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}

