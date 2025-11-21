import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/app/api/_lib/db'
import { authenticateRequest } from '@/app/api/_lib/auth-utils'

export const dynamic = 'force-dynamic'

/**
 * GET /api/contacts/opt-out-count
 * Get count of contacts that haven't received an opt-out message yet
 * for the specified categories (checks opt_out_notice_sent_at column)
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await authenticateRequest(request)
    const { searchParams } = new URL(request.url)
    
    const categoriesParam = searchParams.get('categories')
    const categories = categoriesParam ? categoriesParam.split(',') : []

    if (categories.length === 0 || categories.includes('all')) {
      // Get all contacts that haven't received opt-out notice
      const result = await query(
        `
        SELECT COUNT(DISTINCT c.id)::int as count
        FROM contacts c
        WHERE c.org_id = $1
          AND c.deleted_at IS NULL
          AND c.opted_out_at IS NULL
          AND array_length(c.category, 1) > 0
          AND c.opt_out_notice_sent_at IS NULL
        `,
        [authContext.orgId]
      )
      
      return NextResponse.json({ 
        needsOptOut: result.rows[0]?.count || 0
      })
    } else {
      // Get contacts in specific categories that haven't received opt-out notice
      const result = await query(
        `
        SELECT COUNT(DISTINCT c.id)::int as count
        FROM contacts c
        WHERE c.org_id = $1
          AND c.deleted_at IS NULL
          AND c.opted_out_at IS NULL
          AND array_length(c.category, 1) > 0
          AND c.category && $2::text[]
          AND c.opt_out_notice_sent_at IS NULL
        `,
        [authContext.orgId, categories]
      )
      
      return NextResponse.json({ 
        needsOptOut: result.rows[0]?.count || 0
      })
    }
  } catch (error: any) {
    console.error('[OPT-OUT-COUNT] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get opt-out count', details: error.message },
      { status: 500 }
    )
  }
}

