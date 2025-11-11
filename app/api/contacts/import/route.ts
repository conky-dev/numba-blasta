import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';
import Papa from 'papaparse';

interface CSVRow {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
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

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
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

    const rows = parseResult.data;
    
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      );
    }

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
      const phone = row.phone?.trim();

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
          `SELECT id FROM contacts 
           WHERE org_id = $1 AND phone = $2 AND deleted_at IS NULL`,
          [orgId, phone]
        );

        if (existingContact.rows.length > 0) {
          // Update existing contact
          await query(
            `UPDATE contacts
             SET first_name = COALESCE($1, first_name),
                 last_name = COALESCE($2, last_name),
                 email = COALESCE($3, email),
                 updated_at = NOW()
             WHERE org_id = $4 AND phone = $5`,
            [
              row.first_name || row.firstName || null,
              row.last_name || row.lastName || null,
              row.email || null,
              orgId,
              phone,
            ]
          );
          results.updated++;
        } else {
          // Insert new contact
          await query(
            `INSERT INTO contacts (org_id, phone, first_name, last_name, email)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              orgId,
              phone,
              row.first_name || row.firstName || null,
              row.last_name || row.lastName || null,
              row.email || null,
            ]
          );
          results.created++;
        }
      } catch (error: any) {
        console.error(`Error processing row ${i + 2}:`, error);
        results.skipped++;
        results.errors.push(`Row ${i + 2}: ${error.message}`);
      }
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

