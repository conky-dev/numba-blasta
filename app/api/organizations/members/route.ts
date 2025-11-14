import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requireAdmin } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';

/**
 * GET /api/organizations/members
 * List all members of the authenticated user's organization (admin/owner only)
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId, userId, role } = await authenticateRequest(request);
    requireAdmin({ userId, email: '', orgId, role }); // Only admins/owners can view members

    console.log('📋 Fetching members for org:', orgId);

    // Get all members with their profile info
    const result = await query(
      `SELECT 
        om.id,
        om.user_id,
        om.role,
        om.created_at,
        au.email,
        up.full_name
       FROM organization_members om
       JOIN auth.users au ON om.user_id = au.id
       LEFT JOIN user_profiles up ON au.id = up.user_id
       WHERE om.org_id = $1
       ORDER BY 
         CASE om.role 
           WHEN 'owner' THEN 1 
           WHEN 'admin' THEN 2 
           WHEN 'member' THEN 3 
         END,
         om.created_at ASC`,
      [orgId]
    );

    console.log('✅ Found', result.rows.length, 'members');

    return NextResponse.json({
      success: true,
      members: result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        joinedAt: row.created_at,
      })),
    });
  } catch (error: any) {
    console.error('❌ Get members error:', error);
    if (error.message?.includes('token') || 
        error.message?.includes('authentication') || 
        error.message?.includes('organization')) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: error.message 
      }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

