import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';

/**
 * GET /api/invitations/:code
 * Validate invitation code (public, no auth required for validation)
 * Returns invitation details if valid
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { error: 'Invitation code is required' },
        { status: 400 }
      );
    }

    // Expire old invitations first
    await query(`SELECT expire_old_invitations()`);

    // Find invitation
    const result = await query(
      `SELECT 
        i.id,
        i.org_id,
        i.code,
        i.role,
        i.status,
        i.max_uses,
        i.uses_count,
        i.expires_at,
        i.email as invited_email,
        o.name as org_name,
        u.email as inviter_email
       FROM organization_invitations i
       JOIN organizations o ON i.org_id = o.id
       JOIN auth.users u ON i.invited_by = u.id
       WHERE i.code = $1`,
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid invitation code', valid: false },
        { status: 404 }
      );
    }

    const invitation = result.rows[0];

    // Check status
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { 
          error: `Invitation is ${invitation.status}`,
          valid: false 
        },
        { status: 400 }
      );
    }

    // Check uses
    if (invitation.max_uses !== -1 && invitation.uses_count >= invitation.max_uses) {
      return NextResponse.json(
        { error: 'Invitation has reached maximum uses', valid: false },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        code: invitation.code,
        orgName: invitation.org_name,
        role: invitation.role,
        inviterEmail: invitation.inviter_email,
        expiresAt: invitation.expires_at,
        invitedEmail: invitation.invited_email,
      },
    });
  } catch (error: any) {
    console.error('Validate invitation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to validate invitation', valid: false },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invitations/:code/accept
 * Accept invitation and join organization
 * Requires authentication but not org membership
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Authenticate but don't require org (user is joining their first/another org)
    const { userId, email } = await authenticateRequest(request, false);
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { error: 'Invitation code is required' },
        { status: 400 }
      );
    }

    // Expire old invitations first
    await query(`SELECT expire_old_invitations()`);

    // Find and validate invitation
    const inviteResult = await query(
      `SELECT 
        i.id,
        i.org_id,
        i.role,
        i.status,
        i.max_uses,
        i.uses_count,
        i.email as invited_email,
        o.name as org_name
       FROM organization_invitations i
       JOIN organizations o ON i.org_id = o.id
       WHERE i.code = $1
       FOR UPDATE`, // Lock row for update
      [code.toUpperCase()]
    );

    if (inviteResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid invitation code' },
        { status: 404 }
      );
    }

    const invitation = inviteResult.rows[0];

    // Validate invitation
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `Invitation is ${invitation.status}` },
        { status: 400 }
      );
    }

    if (invitation.max_uses !== -1 && invitation.uses_count >= invitation.max_uses) {
      return NextResponse.json(
        { error: 'Invitation has reached maximum uses' },
        { status: 400 }
      );
    }

    // If invitation is for specific email, validate it matches
    if (invitation.invited_email && invitation.invited_email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation is for a different email address' },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const memberCheck = await query(
      `SELECT id FROM organization_members 
       WHERE org_id = $1 AND user_id = $2`,
      [invitation.org_id, userId]
    );

    if (memberCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'You are already a member of this organization' },
        { status: 400 }
      );
    }

    // Add user to organization
    await query(
      `INSERT INTO organization_members (org_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [invitation.org_id, userId, invitation.role]
    );

    // Update invitation uses
    const updateResult = await query(
      `UPDATE organization_invitations
       SET uses_count = uses_count + 1,
           status = CASE 
             WHEN max_uses != -1 AND uses_count + 1 >= max_uses THEN 'accepted'
             ELSE status
           END
       WHERE id = $1
       RETURNING status, uses_count`,
      [invitation.id]
    );

    console.log(`✅ User ${email} joined org ${invitation.org_name} via code ${code}`);

    return NextResponse.json({
      success: true,
      organization: {
        id: invitation.org_id,
        name: invitation.org_name,
        role: invitation.role,
      },
      message: `Successfully joined ${invitation.org_name}`,
    });
  } catch (error: any) {
    console.error('Accept invitation error:', error);

    if (error.message?.includes('token') || 
        error.message?.includes('authentication')) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: error.message 
      }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}

