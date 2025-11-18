import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/api/_lib/db';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/pricing
 * Get current pricing information, including custom rates for the organization
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate to get orgId (optional - if not authenticated, show default pricing)
    let orgId: string | null = null;
    try {
      const authContext = await authenticateRequest(request, false);
      orgId = authContext.orgId;
    } catch {
      // Not authenticated - show default pricing only
    }

    // Get default pricing
    const result = await query(
      `SELECT service_type, price_per_unit, currency, unit, description
       FROM pricing
       WHERE is_active = true
       ORDER BY service_type`,
      []
    );

    // Get custom rates for organization if authenticated
    let customRates: Record<string, number> = {};
    if (orgId) {
      const customResult = await query(
        `SELECT 
          custom_rate_inbound_message,
          custom_rate_outbound_message,
          custom_rate_outbound_message_long
        FROM organizations
        WHERE id = $1`,
        [orgId]
      );

      if (customResult.rows.length > 0) {
        const org = customResult.rows[0];
        if (org.custom_rate_inbound_message !== null) {
          customRates['inbound_message'] = parseFloat(org.custom_rate_inbound_message.toString());
        }
        if (org.custom_rate_outbound_message !== null) {
          customRates['outbound_message'] = parseFloat(org.custom_rate_outbound_message.toString());
        }
        if (org.custom_rate_outbound_message_long !== null) {
          customRates['outbound_message_long'] = parseFloat(org.custom_rate_outbound_message_long.toString());
        }
      }
    }

    const pricing = result.rows.map((row) => {
      const serviceType = row.service_type;
      const hasCustomRate = customRates.hasOwnProperty(serviceType);
      const pricePerUnit = hasCustomRate 
        ? customRates[serviceType]
        : parseFloat(row.price_per_unit.toString());

      return {
        serviceType,
        pricePerUnit,
        currency: row.currency || 'USD',
        unit: row.unit || 'message',
        description: row.description,
        isCustomRate: hasCustomRate,
      };
    });

    return NextResponse.json({ pricing }, { status: 200 });
  } catch (error: any) {
    console.error('[PRICING] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load pricing' },
      { status: 500 }
    );
  }
}

