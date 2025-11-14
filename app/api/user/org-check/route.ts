import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';

/**
 * GET /api/user/org-check
 * Check if user has organization membership
 * Used by client-side redirect logic
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate but don't require org
    const authContext = await authenticateRequest(request, false);

    // Check if user has org
    const hasOrg = authContext.orgId !== null;

    return NextResponse.json({
      hasOrg,
      orgId: authContext.orgId,
      role: authContext.role,
    });
  } catch (error: any) {
    console.error('Org check error:', error);

    if (error.message?.includes('token') || 
        error.message?.includes('authentication')) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        hasOrg: false
      }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to check org membership', hasOrg: false },
      { status: 500 }
    );
  }
}

