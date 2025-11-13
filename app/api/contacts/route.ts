import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';

/**
 * GET /api/contacts
 * List all contacts for the organization with search and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(request);
    const { userId, orgId } = authResult;
    const { searchParams } = new URL(request.url);
    
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '20'); // Default 20 per page
    const offset = parseInt(searchParams.get('offset') || '0'); // Default offset 0
    const cursor = searchParams.get('cursor'); // Legacy cursor support

    // Validate limit (max 100)
    const validLimit = Math.min(Math.max(limit, 1), 100);
    const validOffset = Math.max(offset, 0);

    // Build query
    let sqlQuery = `
      SELECT id, org_id, phone, first_name, last_name, email, 
             category, opted_out_at, created_at, updated_at
      FROM contacts
      WHERE org_id = $1 AND deleted_at IS NULL
    `;
    
    const params: any[] = [orgId];
    let paramIndex = 2;

    // Search filter
    if (search) {
      sqlQuery += ` AND (
        first_name ILIKE $${paramIndex} OR
        last_name ILIKE $${paramIndex} OR
        phone ILIKE $${paramIndex} OR
        email ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Use offset-based pagination if offset is provided, otherwise use cursor
    if (cursor && !searchParams.has('offset')) {
      // Legacy cursor pagination (using created_at and id for stable sorting)
      sqlQuery += ` AND (created_at, id) < (
        SELECT created_at, id FROM contacts WHERE id = $${paramIndex} AND org_id = $1
      )`;
      params.push(cursor);
      paramIndex++;
      
      // Order and limit - fetch one extra to determine if there are more
      sqlQuery += ` ORDER BY created_at DESC, id DESC LIMIT $${paramIndex}`;
      params.push(validLimit + 1);
    } else {
      // Offset-based pagination
      sqlQuery += ` ORDER BY created_at DESC, id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(validLimit, validOffset);
      paramIndex += 2;
    }

    const result = await query(sqlQuery, params);

    // For cursor pagination, check if there are more results
    let hasMore = false;
    let contacts = result.rows;
    let nextCursor = null;

    if (cursor && !searchParams.has('offset')) {
      hasMore = result.rows.length > validLimit;
      contacts = hasMore ? result.rows.slice(0, validLimit) : result.rows;
      nextCursor = hasMore && contacts.length > 0 
        ? contacts[contacts.length - 1].id 
        : null;
    }

    // Get total count for this org (for offset-based pagination)
    const countResult = await query(
      `SELECT COUNT(*)::integer as total
       FROM contacts
       WHERE org_id = $1 AND deleted_at IS NULL
       ${search ? `AND (
         first_name ILIKE $2 OR
         last_name ILIKE $2 OR
         phone ILIKE $2 OR
         email ILIKE $2
       )` : ''}`,
      search ? [orgId, `%${search}%`] : [orgId]
    );

    return NextResponse.json({
      contacts,
      pagination: {
        total: countResult.rows[0]?.total || 0,
        limit: validLimit,
        hasMore,
        nextCursor,
      }
    });
  } catch (error: any) {
    console.error('List contacts error:', error);
    
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
 * POST /api/contacts
 * Create a new contact
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(request);
    const { userId, orgId } = authResult;
    const body = await request.json();
    const { firstName, lastName, phone, email, category } = body;

    // Validation
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

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

    // TODO: Normalize phone to E.164 format using libphonenumber-js
    // For now, just basic validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use E.164 format (+1234567890)' },
        { status: 400 }
      );
    }

    // Check for duplicate phone number in org
    const duplicateCheck = await query(
      `SELECT id FROM contacts 
       WHERE org_id = $1 AND phone = $2 AND deleted_at IS NULL`,
      [orgId, phone]
    );

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'Contact with this phone number already exists' },
        { status: 409 }
      );
    }

    // Create contact
    const result = await query(
      `INSERT INTO contacts (org_id, phone, first_name, last_name, email, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, org_id, phone, first_name, last_name, email, category,
                 opted_out_at, created_at, updated_at`,
      [orgId, phone, firstName || null, lastName || null, email || null, categoryArray]
    );

    return NextResponse.json({
      message: 'Contact created successfully',
      contact: result.rows[0],
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create contact error:', error);
    
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

