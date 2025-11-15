import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';
import Papa from 'papaparse';

interface CSVRow {
  [key: string]: string | undefined;
}

/**
 * POST /api/contacts/import
 * Import contacts from CSV file
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(request);
    const { orgId } = authResult;

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
    const text = await file.text();

    // Parse CSV
    const parseResult = Papa.parse<CSVRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Normalize headers
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

    // Build mapping from normalized header -> field name (phone, first_name, etc.)
    let fieldMapping: Record<string, string> = {};
    if (mappingJson) {
      try {
        const parsed = JSON.parse(mappingJson) as Record<string, string>;
        fieldMapping = parsed || {};
      } catch (e) {
        console.warn('Invalid mapping JSON, ignoring:', e);
      }
    }

    const getFieldValue = (
      row: CSVRow,
      targetField: string,
      fallbackKeys: string[]
    ): string | undefined => {
      const header = Object.keys(fieldMapping).find(
        (h) => fieldMapping[h] === targetField
      );
      if (header && row[header] != null) {
        return row[header]!.toString().trim();
      }
      for (const key of fallbackKeys) {
        if (row[key] != null) {
          return row[key]!.toString().trim();
        }
      }
      return undefined;
    };

    // Process contacts in batches
    const results = {
      total: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const phone =
        getFieldValue(row, 'phone', ['phone', 'phone_number', 'mobile']) || '';

      // Skip rows without phone number
      if (!phone) {
        results.skipped++;
        results.errors.push(`Row ${i + 2}: Missing phone number`);
        continue;
      }

      // Validate phone format
      if (!phoneRegex.test(phone)) {
        results.skipped++;
        results.errors.push(`Row ${i + 2}: Invalid phone format: ${phone}`);
        continue;
      }

      try {
        // Check if contact exists
        const existingContact = await query(
          `SELECT id, category FROM contacts 
           WHERE org_id = $1 AND phone = $2 AND deleted_at IS NULL`,
          [orgId, phone]
        );

        if (existingContact.rows.length > 0) {
          const existing = existingContact.rows[0] as {
            id: string;
            category: string[] | null;
          };

          const existingCategories = Array.isArray(existing.category)
            ? existing.category
            : [];

          // Merge import category with existing categories
          const mergedCategories = Array.from(
            new Set([...existingCategories, ...categoryArray])
          );

          await query(
            `UPDATE contacts
             SET first_name = COALESCE($1, first_name),
                 last_name = COALESCE($2, last_name),
                 email = COALESCE($3, email),
                 category = $4,
                 updated_at = NOW()
             WHERE org_id = $5 AND phone = $6`,
            [
              getFieldValue(row, 'first_name', ['first_name', 'firstname', 'first']) || null,
              getFieldValue(row, 'last_name', ['last_name', 'lastname', 'last']) || null,
              getFieldValue(row, 'email', ['email', 'email_address']) || null,
              mergedCategories,
              orgId,
              phone,
            ]
          );
          results.updated++;
        } else {
          // Insert new contact
          await query(
            `INSERT INTO contacts (org_id, phone, first_name, last_name, email, category)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              orgId,
              phone,
              getFieldValue(row, 'first_name', ['first_name', 'firstname', 'first']) || null,
              getFieldValue(row, 'last_name', ['last_name', 'lastname', 'last']) || null,
              getFieldValue(row, 'email', ['email', 'email_address']) || null,
              categoryArray,
            ]
          );
          results.created++;
        }
      } catch (error: any) {
        console.error(`Error processing row ${i + 2}:`, error);
        console.error(`Phone: ${phone}, Category: ${JSON.stringify(categoryArray)}`);
        results.skipped++;
        results.errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    // Refresh materialized view for category counts after bulk import
    try {
      await query('REFRESH MATERIALIZED VIEW CONCURRENTLY contact_category_counts');
    } catch (error) {
      console.warn('Failed to refresh category counts view:', error);
      // Non-fatal - counts will be slightly stale but still work
    }

    return NextResponse.json({
      message: 'Import completed',
      results,
    });
  } catch (error: any) {
    console.error('Import contacts error:', error);
    
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

