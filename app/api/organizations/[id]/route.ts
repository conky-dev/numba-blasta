import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';

/**
 * GET /api/organizations/:id
 * Get organization details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await authenticateRequest(request);
    const { id } = await params;

    // Check if user has access to this org
    if (orgId !== id) {
      return NextResponse.json(
        { error: 'Unauthorized - you do not have access to this organization' },
        { status: 403 }
      );
    }

    // Get organization details
    const result = await query(
      `SELECT 
        id,
        name,
        email,
        phone,
        balance_cents,
        status,
        created_at
       FROM organizations
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const org = result.rows[0];

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        email: org.email,
        phone: org.phone,
        balance: org.balance_cents / 100,
        status: org.status,
        createdAt: org.created_at,
      },
    });
  } catch (error: any) {
    console.error('Get organization error:', error);

    if (error.message?.includes('token') || 
        error.message?.includes('authentication') ||
        error.message?.includes('organization')) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: error.message 
      }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

