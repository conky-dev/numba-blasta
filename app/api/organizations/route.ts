import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';

/**
 * POST /api/organizations
 * Create a new organization (onboarding flow - user has no org yet)
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate but don't require org (user is creating their first org)
    const { userId, email } = await authenticateRequest(request, false);

    const body = await request.json();
    const { name, phone } = body;

    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Organization name must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Check if user already has an org
    const existingOrgCheck = await query(
      `SELECT om.org_id 
       FROM organization_members om 
       WHERE om.user_id = $1 
       LIMIT 1`,
      [userId]
    );

    if (existingOrgCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'User already belongs to an organization' },
        { status: 400 }
      );
    }

    // Create organization
    const orgResult = await query(
      `INSERT INTO organizations (name, email, phone)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, phone, balance_cents, created_at`,
      [name.trim(), email, phone?.trim() || null]
    );

    const org = orgResult.rows[0];

    // Add user as owner
    await query(
      `INSERT INTO organization_members (org_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [org.id, userId, 'owner']
    );

    console.log(`✅ Organization created: ${org.name} (${org.id}) by user ${userId}`);

    return NextResponse.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        email: org.email,
        phone: org.phone,
        balance: org.balance_cents / 100,
        role: 'owner',
        createdAt: org.created_at,
      },
    });
  } catch (error: any) {
    console.error('Create organization error:', error);

    if (error.message?.includes('token') || 
        error.message?.includes('authentication')) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: error.message 
      }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create organization' },
      { status: 500 }
    );
  }
}

