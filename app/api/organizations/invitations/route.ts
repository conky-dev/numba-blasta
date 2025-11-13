import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requireAdmin } from '@/lib/auth-utils';
import { query } from '@/lib/db';

/**
 * POST /api/organizations/invitations
 * Create an invitation (owner/admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await authenticateRequest(request);
    const { orgId, userId } = authContext;
    
    // Require admin or owner
    requireAdmin(authContext);

    const body = await request.json();
    const { email, role, maxUses, expiresInDays } = body;

    // Validation
    if (role && !['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be either admin or member' },
        { status: 400 }
      );
    }

    const inviteRole = role || 'member';
    const inviteMaxUses = maxUses || 1;
    const inviteExpiresInDays = expiresInDays || 7;

    // Generate unique code
    let code = '';
    let codeExists = true;
    while (codeExists) {
      const codeResult = await query('SELECT generate_invitation_code() as code');
      code = codeResult.rows[0].code;
      
      // Check if code already exists
      const checkCode = await query(
        'SELECT id FROM organization_invitations WHERE code = $1',
        [code]
      );
      codeExists = checkCode.rows.length > 0;
    }

    // Generate unique token (UUID)
    const tokenResult = await query('SELECT uuid_generate_v4() as token');
    const token = tokenResult.rows[0].token;

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + inviteExpiresInDays);

    // Create invitation
    const result = await query(
      `INSERT INTO organization_invitations (
        org_id,
        email,
        code,
        token,
        role,
        invited_by,
        max_uses,
        expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, code, token, role, max_uses, expires_at, created_at`,
      [orgId, email || null, code, token, inviteRole, userId, inviteMaxUses, expiresAt]
    );

    const invitation = result.rows[0];

    console.log(`✅ Invitation created: ${code} for org ${orgId} by user ${userId}`);

    // Generate invite URL
    const inviteUrl = `${request.headers.get('origin') || 'http://localhost:3000'}/accept-invite?token=${token}`;

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        code: invitation.code,
        token: invitation.token,
        url: inviteUrl,
        role: invitation.role,
        maxUses: invitation.max_uses,
        email: email || null,
        expiresAt: invitation.expires_at,
        createdAt: invitation.created_at,
      },
    });
  } catch (error: any) {
    console.error('Create invitation error:', error);

    if (error.message?.includes('required') || 
        error.message?.includes('Admin')) {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 403 });
    }

    if (error.message?.includes('token') || 
        error.message?.includes('authentication') ||
        error.message?.includes('organization')) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: error.message 
      }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create invitation' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/organizations/invitations
 * List organization invitations
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status') || 'pending';

    // Expire old invitations first
    await query('SELECT expire_old_invitations()');

    // Get invitations
    const result = await query(
      `SELECT 
        i.id,
        i.code,
        i.token,
        i.email,
        i.role,
        i.status,
        i.max_uses,
        i.uses_count,
        i.expires_at,
        i.created_at,
        u.email as invited_by_email
       FROM organization_invitations i
       JOIN auth.users u ON i.invited_by = u.id
       WHERE i.org_id = $1 AND i.status = $2
       ORDER BY i.created_at DESC`,
      [orgId, status]
    );

    return NextResponse.json({
      invitations: result.rows.map(row => ({
        id: row.id,
        code: row.code,
        token: row.token,
        email: row.email,
        role: row.role,
        status: row.status,
        maxUses: row.max_uses,
        usesCount: row.uses_count,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        invitedBy: row.invited_by_email,
      })),
    });
  } catch (error: any) {
    console.error('List invitations error:', error);

    if (error.message?.includes('token') || 
        error.message?.includes('authentication') ||
        error.message?.includes('organization')) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: error.message 
      }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

