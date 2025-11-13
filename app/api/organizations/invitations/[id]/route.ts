import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requireAdmin } from '@/lib/auth-utils';
import { query } from '@/lib/db';

/**
 * DELETE /api/organizations/invitations/:id
 * Revoke/delete an invitation (owner/admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await authenticateRequest(request);
    const { orgId } = authContext;
    const { id } = await params;
    
    // Require admin or owner
    requireAdmin(authContext);

    // Verify invitation belongs to this org
    const checkResult = await query(
      'SELECT org_id FROM organization_invitations WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    if (checkResult.rows[0].org_id !== orgId) {
      return NextResponse.json(
        { error: 'Unauthorized - invitation belongs to different organization' },
        { status: 403 }
      );
    }

    // Delete invitation
    await query(
      'DELETE FROM organization_invitations WHERE id = $1',
      [id]
    );

    console.log(`✅ Invitation ${id} deleted from org ${orgId}`);

    return NextResponse.json({
      success: true,
      message: 'Invitation deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete invitation error:', error);

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
      { error: error.message || 'Failed to delete invitation' },
      { status: 500 }
    );
  }
}

