import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { queueContactImport } from '@/app/api/_lib/contact-import-queue';
import Papa from 'papaparse';

interface CSVRow {
  [key: string]: string | undefined;
}

/**
 * POST /api/contacts/import
 * Queue a CSV import job for background processing
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request (requires org)
    const authResult = await authenticateRequest(request, true);
    const { orgId, userId } = authResult;
    
    // orgId is guaranteed to be non-null because requiresOrg = true
    if (!orgId) {
      throw new Error('Organization required');
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = (formData.get('category') as string) || 'Other';
    const mappingJson = formData.get('mapping') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Parse category into array (support comma-separated)
    const categoryArray = category.split(',').map(c => c.trim()).filter(c => c.length > 0);
    if (categoryArray.length === 0) {
      categoryArray.push('Other');
    }

    // Check file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a CSV file.' },
        { status: 400 }
      );
    }

    // Read file content
    const csvData = await file.text();

    // Quick validation - parse CSV to check format and count rows
    const parseResult = Papa.parse<CSVRow>(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        return header.toLowerCase().trim().replace(/\s+/g, '_');
      },
    });

    if (parseResult.errors.length > 0) {
      console.error('CSV parse errors:', parseResult.errors);
      return NextResponse.json(
        { error: 'Failed to parse CSV file', details: parseResult.errors },
        { status: 400 }
      );
    }

    const rows = parseResult.data as CSVRow[];
    
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      );
    }

    // Parse field mapping
    let fieldMapping: Record<string, string> = {};
    if (mappingJson) {
      try {
        const parsed = JSON.parse(mappingJson) as Record<string, string>;
        fieldMapping = parsed || {};
      } catch (e) {
        console.warn('Invalid mapping JSON, ignoring:', e);
      }
    }

    // Queue the import job
    console.log(`[IMPORT] Queueing ${rows.length} contacts for org ${orgId}`);
    const jobId = await queueContactImport({
      orgId,
      userId,
      csvData,
      category: categoryArray,
      mapping: fieldMapping,
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: `Import queued: ${rows.length} contacts will be processed in the background`,
      totalRows: rows.length,
    });
  } catch (error: any) {
    console.error('Queue import error:', error);
    
    if (error.message?.includes('token') || 
        error.message?.includes('authentication') ||
        error.message?.includes('organization')) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: error.message 
      }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

