import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';

/**
 * GET /api/campaigns
 * List all campaigns for the authenticated user's org
 * Query params: status, search, limit, cursor (pagination)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status'); // draft, scheduled, running, paused, done, failed
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const cursor = searchParams.get('cursor'); // UUID for pagination
    
    let sqlQuery = `
      SELECT 
        c.id, 
        c.name, 
        c.message,
        c.template_id,
        t.name as template_name,
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
      WHERE c.org_id = $1 AND c.deleted_at IS NULL
    `;
    const params: any[] = [auth.orgId];
    let paramIndex = 2;

    // Add status filter
    if (status) {
      sqlQuery += ` AND c.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Add search filter
    if (search) {
      sqlQuery += ` AND c.name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add cursor-based pagination
    if (cursor) {
      sqlQuery += ` AND c.id < $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    sqlQuery += ` ORDER BY c.created_at DESC, c.id DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query(sqlQuery, params);

    // Calculate rates for each campaign
    const campaigns = result.rows.map(campaign => {
      const deliveryRate = campaign.sent_count > 0 
        ? ((campaign.delivered_count / campaign.sent_count) * 100).toFixed(2)
        : 0;
      const failRate = campaign.sent_count > 0 
        ? ((campaign.failed_count / campaign.sent_count) * 100).toFixed(2)
        : 0;
      const replyRate = campaign.delivered_count > 0 
        ? ((campaign.replied_count / campaign.delivered_count) * 100).toFixed(2)
        : 0;

      return {
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
      };
    });

    return NextResponse.json({
      campaigns,
      hasMore: campaigns.length === limit,
      nextCursor: campaigns.length > 0 ? campaigns[campaigns.length - 1].id : null,
    });
  } catch (error: any) {
    console.error('List campaigns error:', error);
    
    if (error.message.includes('token') || error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to list campaigns' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaigns
 * Create a new SMS campaign
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const { name, message, templateId, listId, scheduleAt } = await request.json();

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: 'Campaign name is required' },
        { status: 422 }
      );
    }

    // Must have either message or templateId
    if (!message && !templateId) {
      return NextResponse.json(
        { error: 'Either message or templateId is required' },
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

    // Determine status based on scheduleAt
    let status = 'draft';
    if (scheduleAt) {
      const scheduleDate = new Date(scheduleAt);
      if (scheduleDate > new Date()) {
        status = 'scheduled';
      }
    }

    // Create campaign
    const result = await query(
      `INSERT INTO sms_campaigns (
        org_id, name, message, template_id, list_id, status, schedule_at, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id, name, message, template_id, list_id, status, 
        schedule_at, created_at, updated_at`,
      [auth.orgId, name, message || null, templateId || null, listId || null, status, scheduleAt || null, auth.userId]
    );

    const campaign = result.rows[0];

    return NextResponse.json({
      success: true,
      campaign,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create campaign error:', error);
    
    if (error.message.includes('token') || error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create campaign' },
      { status: 500 }
    );
  }
}

