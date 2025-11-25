import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/app/api/_lib/db'
import { authenticateRequest } from '@/app/api/_lib/auth-utils'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { listName: string } }
) {
  try {
    const authContext = await authenticateRequest(request)

    const listName = decodeURIComponent(params.listName)

    // Remove the category from all contacts in this list,
    // and mark contacts with empty categories as deleted (all in one query)
    const result = await query(
      `
      WITH removed AS (
        UPDATE contacts
        SET 
          category = array_remove(category, $2),
          updated_at = NOW()
        WHERE org_id = $1 
          AND $2 = ANY(category)
        RETURNING id, category
      ),
      orphans_deleted AS (
        UPDATE contacts
        SET 
          deleted_at = NOW(),
          updated_at = NOW()
        WHERE id IN (
          SELECT id FROM removed 
          WHERE category IS NULL 
             OR array_length(category, 1) IS NULL 
             OR array_length(category, 1) = 0
        )
        RETURNING id
      )
      SELECT 
        (SELECT COUNT(*) FROM removed) as removed_count,
        (SELECT COUNT(*) FROM orphans_deleted) as orphans_count
      `,
      [authContext.orgId, listName]
    )

    // Refresh the materialized view
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY contact_category_counts')

    const removedCount = parseInt(result.rows[0]?.removed_count || '0')
    const orphanCount = parseInt(result.rows[0]?.orphans_count || '0')
    
    let message = `Successfully removed category "${listName}" from ${removedCount} contact(s).`
    
    if (orphanCount > 0) {
      message += ` ${orphanCount} contact(s) that were only in this list have been marked as deleted.`
    }

    return NextResponse.json({ 
      deleted: removedCount,
      orphansDeleted: orphanCount,
      message
    })
  } catch (error: any) {
    console.error('[DELETE-LIST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete list' },
      { status: 500 }
    )
  }
}

