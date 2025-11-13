import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requireAdmin, requireOwner } from '@/lib/auth-utils';
import { query } from '@/lib/db';

/**
 * PATCH /api/organizations/members/:id
 * Update a member's role (owner only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId, role } = await authenticateRequest(request);
    requireOwner({ userId, email: '', orgId, role });
    
    const { id: membershipId } = await params;
    const { role: newRole } = await request.json();

    console.log('🔄 Attempting to change member role:', membershipId, 'to', newRole);

    // Validate new role
    if (!['admin', 'member'].includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin" or "member"' },
        { status: 400 }
      );
    }

    // Get the member details
    const memberResult = await query(
      `SELECT om.user_id, om.role, om.org_id, up.full_name, au.email
       FROM organization_members om
       JOIN auth.users au ON om.user_id = au.id
       LEFT JOIN user_profiles up ON au.id = up.user_id
       WHERE om.id = $1`,
      [membershipId]
    );

    if (memberResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    const member = memberResult.rows[0];

    // Verify the member belongs to the same organization
    if (member.org_id !== orgId) {
      return NextResponse.json(
        { error: 'Member does not belong to your organization' },
        { status: 403 }
      );
    }

    // Cannot change owner role
    if (member.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot change the role of the organization owner' },
        { status: 400 }
      );
    }

    // Cannot change your own role
    if (member.user_id === userId) {
      return NextResponse.json(
        { error: 'You cannot change your own role' },
        { status: 400 }
      );
    }

    // Update the member's role
    await query(
      `UPDATE organization_members SET role = $1 WHERE id = $2`,
      [newRole, membershipId]
    );

    console.log('✅ Changed role for:', member.email, 'to', newRole);

    return NextResponse.json({
      success: true,
      message: `Successfully changed ${member.full_name || member.email}'s role to ${newRole}`,
    });
  } catch (error: any) {
    console.error('❌ Change role error:', error);
    if (error.message?.includes('token') || 
        error.message?.includes('authentication') || 
        error.message?.includes('organization') ||
        error.message?.includes('access')) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: error.message 
      }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to change member role' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/members/:id
 * Remove a member from the organization (owner/admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId, role } = await authenticateRequest(request);
    requireAdmin({ userId, email: '', orgId, role });
    
    const { id: membershipId } = await params;

    console.log('🗑️ Attempting to remove member:', membershipId);

    // Get the member details
    const memberResult = await query(
      `SELECT om.user_id, om.role, om.org_id, up.full_name, au.email
       FROM organization_members om
       JOIN auth.users au ON om.user_id = au.id
       LEFT JOIN user_profiles up ON au.id = up.user_id
       WHERE om.id = $1`,
      [membershipId]
    );

    if (memberResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    const member = memberResult.rows[0];

    // Verify the member belongs to the same organization
    if (member.org_id !== orgId) {
      return NextResponse.json(
        { error: 'Member does not belong to your organization' },
        { status: 403 }
      );
    }

    // Prevent removing the owner
    if (member.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove the organization owner' },
        { status: 400 }
      );
    }

    // Non-owners cannot remove admins
    if (role !== 'owner' && member.role === 'admin') {
      return NextResponse.json(
        { error: 'Only the owner can remove admins' },
        { status: 403 }
      );
    }

    // Prevent removing yourself
    if (member.user_id === userId) {
      return NextResponse.json(
        { error: 'You cannot remove yourself from the organization' },
        { status: 400 }
      );
    }

    // Remove the member
    await query(
      `DELETE FROM organization_members WHERE id = $1`,
      [membershipId]
    );

    console.log('✅ Removed member:', member.email);

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${member.full_name || member.email} from the organization`,
    });
  } catch (error: any) {
    console.error('❌ Remove member error:', error);
    if (error.message?.includes('token') || 
        error.message?.includes('authentication') || 
        error.message?.includes('organization') ||
        error.message?.includes('access')) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: error.message 
      }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to remove member' },
      { status: 500 }
    );
  }
}

