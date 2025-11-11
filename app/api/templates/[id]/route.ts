import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';
import { extractTemplateVariables } from '@/lib/template-utils';

/**
 * GET /api/templates/:id
 * Get a single template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { id: templateId } = await params;

    const result = await query(
      `SELECT id, name, content, created_by, created_at, updated_at
       FROM sms_templates
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [templateId, auth.orgId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const template = result.rows[0];
    const variables = extractTemplateVariables(template.content);

    return NextResponse.json({
      template: {
        ...template,
        variables,
      },
    });
  } catch (error: any) {
    console.error('Get template error:', error);
    
    if (error.message.includes('token') || error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to get template' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/templates/:id
 * Update a template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { id: templateId } = await params;
    const { name, content } = await request.json();

    // Validation
    if (!name && !content) {
      return NextResponse.json(
        { error: 'At least one field (name or content) is required' },
        { status: 422 }
      );
    }

    if (name && name.length > 255) {
      return NextResponse.json(
        { error: 'Name must be 255 characters or less' },
        { status: 422 }
      );
    }

    // Check template exists and belongs to org
    const templateCheck = await query(
      `SELECT id FROM sms_templates 
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [templateId, auth.orgId]
    );

    if (templateCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check for duplicate name if changing name
    if (name) {
      const duplicateCheck = await query(
        `SELECT id FROM sms_templates 
         WHERE org_id = $1 AND name = $2 AND id != $3 AND deleted_at IS NULL`,
        [auth.orgId, name, templateId]
      );

      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'A template with this name already exists' },
          { status: 422 }
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

    if (content) {
      updates.push(`content = $${paramIndex++}`);
      queryParams.push(content);
    }

    queryParams.push(templateId, auth.orgId);

    const result = await query(
      `UPDATE sms_templates
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex++} AND org_id = $${paramIndex++}
       RETURNING id, name, content, created_by, created_at, updated_at`,
      queryParams
    );

    const template = result.rows[0];
    const variables = extractTemplateVariables(template.content);

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        variables,
      },
    });
  } catch (error: any) {
    console.error('Update template error:', error);
    
    if (error.message.includes('token') || error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to update template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates/:id
 * Soft delete a template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    const { id: templateId } = await params;

    // Check template exists and belongs to org
    const templateCheck = await query(
      `SELECT id FROM sms_templates 
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [templateId, auth.orgId]
    );

    if (templateCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Soft delete
    await query(
      `UPDATE sms_templates
       SET deleted_at = NOW()
       WHERE id = $1 AND org_id = $2`,
      [templateId, auth.orgId]
    );

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete template error:', error);
    
    if (error.message.includes('token') || error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to delete template' },
      { status: 500 }
    );
  }
}

