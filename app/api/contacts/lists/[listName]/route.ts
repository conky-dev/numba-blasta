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

    // Soft-delete all contacts in this list by setting soft_deleted flag
    // Keep the category in their array so the list still shows up
    // soft_deleted contacts won't appear in the MV (so they won't show in dropdowns/filters)
    // but you can still see them in the Contacts table and Lists stats
    const result = await query(
      `
      UPDATE contacts
      SET 
        soft_deleted = TRUE,
        updated_at = NOW()
      WHERE org_id = $1 
        AND $2 = ANY(category)
        AND soft_deleted = FALSE  -- Only update contacts that aren't already soft-deleted
      RETURNING id
      `,
      [authContext.orgId, listName]
    )

    // Refresh the materialized view to reflect the change
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY contact_category_counts')

    return NextResponse.json({ 
      deleted: result.rowCount,
      message: `Successfully marked ${result.rowCount} contact(s) in list "${listName}" as soft-deleted. The list will remain visible with these contacts marked as deleted.`
    })
  } catch (error: any) {
    console.error('[DELETE-LIST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete list contacts' },
      { status: 500 }
    )
  }
}

