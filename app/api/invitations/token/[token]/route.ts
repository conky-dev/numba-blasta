import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';

/**
 * GET /api/invitations/token/:token
 * Get invitation details by token (public, for email invite links)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    console.log('🔍 [GET /api/invitations/token/:token] Token:', token);

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required', valid: false },
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
        i.token,
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
       WHERE i.token = $1`,
      [token]
    );

    console.log('📊 Query result rows:', result.rows.length);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid invitation token', valid: false },
        { status: 404 }
      );
    }

    const invitation = result.rows[0];

    console.log('📋 Invitation status:', invitation.status);

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

    console.log('✅ Invitation valid for org:', invitation.org_name);

    return NextResponse.json({
      valid: true,
      invitation: {
        code: invitation.code,
        token: invitation.token,
        orgName: invitation.org_name,
        role: invitation.role,
        inviterEmail: invitation.inviter_email,
        expiresAt: invitation.expires_at,
        invitedEmail: invitation.invited_email,
      },
    });
  } catch (error: any) {
    console.error('❌ [GET /api/invitations/token/:token] Error:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to validate invitation', valid: false },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invitations/token/:token/accept
 * Accept invitation via token (requires auth but not org)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Authenticate but don't require org
    const { userId, email } = await authenticateRequest(request, false);
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
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
       WHERE i.token = $1
       FOR UPDATE`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    const invitation = inviteResult.rows[0];

    console.log('👤 User email:', email);
    console.log('📧 Invited email:', invitation.invited_email);
    console.log('📋 Invitation:', {
      status: invitation.status,
      max_uses: invitation.max_uses,
      uses_count: invitation.uses_count,
      org_name: invitation.org_name,
      role: invitation.role
    });

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
    if (invitation.invited_email) {
      const invitedEmailLower = invitation.invited_email.toLowerCase().trim();
      const userEmailLower = email.toLowerCase().trim();
      
      console.log('🔍 Email comparison:');
      console.log('  Invited:', JSON.stringify(invitedEmailLower));
      console.log('  User:', JSON.stringify(userEmailLower));
      console.log('  Match:', invitedEmailLower === userEmailLower);
      
      if (invitedEmailLower !== userEmailLower) {
        return NextResponse.json(
          { 
            error: 'This invitation is for a different email address',
            details: `Invitation is for ${invitation.invited_email}, but you are logged in as ${email}`
          },
          { status: 403 }
        );
      }
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
    await query(
      `UPDATE organization_invitations
       SET uses_count = uses_count + 1,
           status = CASE 
             WHEN max_uses != -1 AND uses_count + 1 >= max_uses THEN 'accepted'
             ELSE status
           END
       WHERE id = $1`,
      [invitation.id]
    );

    console.log(`✅ User ${email} joined org ${invitation.org_name} via token`);

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
    console.error('Accept invitation token error:', error);

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

