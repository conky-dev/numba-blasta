import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/organizations/phone-numbers/[id]/rate-limit
 * Get rate limit information for a specific phone number
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await authenticateRequest(request);
    const { id } = await params;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    // Get rate limit info for the phone number
    const result = await query(
      `SELECT 
         pn.id,
         pn.phone_number,
         pn.rate_limit_max,
         pn.rate_limit_window_hours,
         pn.rate_limit_current_count,
         pn.rate_limit_window_start,
         pn.rate_limit_window_start + (pn.rate_limit_window_hours || ' hours')::INTERVAL as rate_limit_window_end,
         get_phone_remaining_messages(pn.phone_number) as remaining_messages,
         CASE 
           WHEN pn.rate_limit_window_start IS NULL THEN 0
           ELSE ROUND((pn.rate_limit_current_count::FLOAT / pn.rate_limit_max * 100), 2)
         END as usage_percent
       FROM phone_numbers pn
       WHERE pn.id = $1 AND pn.org_id = $2`,
      [id, orgId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      );
    }

    const rateLimitInfo = result.rows[0];

    return NextResponse.json({
      id: rateLimitInfo.id,
      phoneNumber: rateLimitInfo.phone_number,
      limit: {
        max: rateLimitInfo.rate_limit_max,
        windowHours: rateLimitInfo.rate_limit_window_hours,
        currentCount: rateLimitInfo.rate_limit_current_count || 0,
        remaining: rateLimitInfo.remaining_messages || rateLimitInfo.rate_limit_max,
        usagePercent: parseFloat(rateLimitInfo.usage_percent) || 0,
        windowStart: rateLimitInfo.rate_limit_window_start,
        windowEnd: rateLimitInfo.rate_limit_window_end,
        isActive: rateLimitInfo.rate_limit_window_start !== null,
      },
    });
  } catch (error: any) {
    console.error('Get rate limit error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

