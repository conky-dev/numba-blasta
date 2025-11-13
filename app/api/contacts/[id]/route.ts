import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';

/**
 * GET /api/contacts/:id
 * Get a single contact
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(request);
    const { orgId } = authResult;
    const { id: contactId } = await params;

    // Get contact
    const result = await query(
      `SELECT id, org_id, phone, first_name, last_name, email, category,
              opted_out_at, created_at, updated_at
       FROM contacts
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [contactId, orgId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({
      contact: result.rows[0],
    });
  } catch (error: any) {
    console.error('Get contact error:', error);
    
    if (error.message?.includes('token') || 
        error.message?.includes('authentication') ||
        error.message?.includes('organization')) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: error.message 
      }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contacts/:id
 * Update a contact
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(request);
    const { orgId } = authResult;
    const { id: contactId } = await params;
    const body = await request.json();
    const { firstName, lastName, phone, email, category } = body;

    // Verify contact exists and belongs to org
    const existingContact = await query(
      `SELECT id FROM contacts 
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [contactId, orgId]
    );

    if (existingContact.rows.length === 0) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // If phone is being updated, validate and check for duplicates
    if (phone) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phone)) {
        return NextResponse.json(
          { error: 'Invalid phone number format. Use E.164 format (+1234567890)' },
          { status: 400 }
        );
      }

      // Check for duplicate phone number (excluding current contact)
      const duplicateCheck = await query(
        `SELECT id FROM contacts 
         WHERE org_id = $1 AND phone = $2 AND id != $3 AND deleted_at IS NULL`,
        [orgId, phone, contactId]
      );

      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'Another contact with this phone number already exists' },
          { status: 409 }
        );
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (firstName !== undefined) {
      updates.push(`first_name = $${paramIndex}`);
      queryParams.push(firstName || null);
      paramIndex++;
    }
    if (lastName !== undefined) {
      updates.push(`last_name = $${paramIndex}`);
      queryParams.push(lastName || null);
      paramIndex++;
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      queryParams.push(phone);
      paramIndex++;
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      queryParams.push(email || null);
      paramIndex++;
    }
    if (category !== undefined) {
      // Normalize category to array
      let categoryArray: string[];
      if (Array.isArray(category)) {
        categoryArray = category.filter(c => c && c.trim().length > 0);
      } else if (category && typeof category === 'string') {
        categoryArray = [category];
      } else {
        categoryArray = ['Other'];
      }
      
      // Ensure at least one category
      if (categoryArray.length === 0) {
        categoryArray = ['Other'];
      }
      
      updates.push(`category = $${paramIndex}`);
      queryParams.push(categoryArray);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    queryParams.push(contactId, orgId);

    const result = await query(
      `UPDATE contacts
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}
       RETURNING id, org_id, phone, first_name, last_name, email, category,
                 opted_out_at, created_at, updated_at`,
      queryParams
    );

    return NextResponse.json({
      message: 'Contact updated successfully',
      contact: result.rows[0],
    });
  } catch (error: any) {
    console.error('Update contact error:', error);
    
    if (error.message?.includes('token') || 
        error.message?.includes('authentication') ||
        error.message?.includes('organization')) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: error.message 
      }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contacts/:id
 * Soft delete a contact
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(request);
    const { orgId } = authResult;
    const { id: contactId } = await params;

    // Soft delete contact
    const result = await query(
      `UPDATE contacts
       SET deleted_at = NOW()
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [contactId, orgId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Contact deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete contact error:', error);
    
    if (error.message?.includes('token') || 
        error.message?.includes('authentication') ||
        error.message?.includes('organization')) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: error.message 
      }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

