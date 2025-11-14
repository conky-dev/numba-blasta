import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';
import { extractTemplateVariables } from '@/app/api/_lib/template-utils';

/**
 * GET /api/templates
 * List all templates for the authenticated user's org
 * Query params: search, limit, cursor (pagination)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const cursor = searchParams.get('cursor'); // UUID for pagination
    
    let sqlQuery = `
      SELECT id, name, content, created_by, created_at, updated_at
      FROM sms_templates
      WHERE org_id = $1 AND deleted_at IS NULL
    `;
    const params: any[] = [auth.orgId];
    let paramIndex = 2;

    // Add search filter
    if (search) {
      sqlQuery += ` AND (name ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add cursor-based pagination
    if (cursor) {
      sqlQuery += ` AND id < $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    sqlQuery += ` ORDER BY created_at DESC, id DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query(sqlQuery, params);

    // Add variable extraction to each template
    const templates = result.rows.map(template => ({
      ...template,
      variables: extractTemplateVariables(template.content),
    }));

    return NextResponse.json({
      templates,
      hasMore: templates.length === limit,
      nextCursor: templates.length > 0 ? templates[templates.length - 1].id : null,
    });
  } catch (error: any) {
    console.error('List templates error:', error);
    
    if (error.message.includes('token') || error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to list templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates
 * Create a new SMS template
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const { name, content } = await request.json();

    // Validation
    if (!name || !content) {
      return NextResponse.json(
        { error: 'Name and content are required' },
        { status: 422 }
      );
    }

    if (name.length > 255) {
      return NextResponse.json(
        { error: 'Name must be 255 characters or less' },
        { status: 422 }
      );
    }

    // Check for duplicate name in org
    const duplicateCheck = await query(
      `SELECT id FROM sms_templates 
       WHERE org_id = $1 AND name = $2 AND deleted_at IS NULL`,
      [auth.orgId, name]
    );

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'A template with this name already exists' },
        { status: 422 }
      );
    }

    // Create template
    const result = await query(
      `INSERT INTO sms_templates (org_id, name, content, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, content, created_by, created_at, updated_at`,
      [auth.orgId, name, content, auth.userId]
    );

    const template = result.rows[0];

    // Add extracted variables
    const variables = extractTemplateVariables(content);

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        variables,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create template error:', error);
    
    if (error.message.includes('token') || error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create template' },
      { status: 500 }
    );
  }
}

