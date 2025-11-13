import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics for the organization (auto-updated via triggers)
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    
    const timeRange = searchParams.get('timeRange') || '30days';
    
    // Map time range to days
    let daysBack = 30;
    if (timeRange === '7days') daysBack = 7;
    if (timeRange === '30days') daysBack = 30;
    if (timeRange === '90days') daysBack = 90;
    if (timeRange === '1year') daysBack = 365;

    // Get summary stats using helper function
    const summaryResult = await query(
      `SELECT * FROM get_dashboard_summary($1, $2)`,
      [orgId, daysBack]
    );

    const summary = summaryResult.rows[0] || {
      outbound_count: 0,
      inbound_count: 0,
      failed_count: 0,
      total_cost_cents: 0
    };

    // Get daily chart data
    const dailyResult = await query(
      `SELECT 
        date,
        outbound_count,
        inbound_count,
        failed_count
       FROM dashboard_stats
       WHERE org_id = $1 
         AND date >= CURRENT_DATE - INTERVAL '1 day' * $2
       ORDER BY date ASC`,
      [orgId, daysBack]
    );

    return NextResponse.json({
      summary: {
        smsOutbound: parseInt(summary.outbound_count),
        smsInbound: parseInt(summary.inbound_count),
        smsFailed: parseInt(summary.failed_count),
        totalCost: parseFloat((summary.total_cost_cents / 100).toFixed(2)),
      },
      daily: dailyResult.rows.map(row => ({
        date: row.date,
        outbound: parseInt(row.outbound_count),
        inbound: parseInt(row.inbound_count),
        failed: parseInt(row.failed_count),
      })),
      timeRange: timeRange,
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    
    if (error.message?.includes('token') || 
        error.message?.includes('authentication') ||
        error.message?.includes('organization')) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: error.message 
      }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}

