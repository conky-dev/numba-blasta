import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/app/api/_lib/db'
import { authenticateRequest } from '@/app/api/_lib/auth-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authContext = await authenticateRequest(request)

    // Get stats for each category including soft_deleted status from MV
    const result = await query(
      `
      SELECT 
        cat as category,
        COUNT(*)::int as total_contacts,
        COUNT(*) FILTER (WHERE opted_out_at IS NOT NULL)::int as opted_out,
        COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::int as marked_for_deletion,
        COUNT(*) FILTER (WHERE opted_out_at IS NULL AND deleted_at IS NULL)::int as active_contacts,
        -- Check if this category is soft_deleted in the MV
        COALESCE(
          (SELECT soft_deleted FROM contact_category_counts 
           WHERE org_id = $1 AND category_name = cat LIMIT 1),
          FALSE
        ) as is_soft_deleted
      FROM contacts,
      UNNEST(category) as cat
      WHERE org_id = $1
      GROUP BY cat
      ORDER BY cat
      `,
      [authContext.orgId]
    )

    return NextResponse.json({ stats: result.rows })
  } catch (error: any) {
    console.error('[LIST-STATS] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch list statistics', details: error.message },
      { status: 500 }
    )
  }
}

