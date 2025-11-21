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

    // Remove the category from all contacts in this list
    // The contacts remain visible, they just lose this category
    // The MV will mark this category as soft_deleted when refreshed
    const result = await query(
      `
      UPDATE contacts
      SET 
        category = array_remove(category, $2),
        updated_at = NOW()
      WHERE org_id = $1 
        AND $2 = ANY(category)
      RETURNING id
      `,
      [authContext.orgId, listName]
    )

    // Refresh the materialized view to mark the category as soft_deleted
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY contact_category_counts')

    return NextResponse.json({ 
      deleted: result.rowCount,
      message: `Successfully removed category "${listName}" from ${result.rowCount} contact(s). The contacts remain visible in your list.`
    })
  } catch (error: any) {
    console.error('[DELETE-LIST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete list' },
      { status: 500 }
    )
  }
}

