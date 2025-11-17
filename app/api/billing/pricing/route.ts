import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/api/_lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/pricing
 * Get current pricing information
 */
export async function GET(request: NextRequest) {
  try {
    const result = await query(
      `SELECT service_type, price_per_unit, currency, unit, description
       FROM pricing
       WHERE is_active = true
       ORDER BY service_type`,
      []
    );

    const pricing = result.rows.map((row) => ({
      serviceType: row.service_type,
      pricePerUnit: parseFloat(row.price_per_unit.toString()),
      currency: row.currency || 'USD',
      unit: row.unit || 'message',
      description: row.description,
    }));

    return NextResponse.json({ pricing }, { status: 200 });
  } catch (error: any) {
    console.error('[PRICING] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load pricing' },
      { status: 500 }
    );
  }
}

