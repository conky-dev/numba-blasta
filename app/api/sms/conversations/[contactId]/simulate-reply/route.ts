import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-utils';
import { query } from '@/lib/db';

/**
 * POST /api/sms/conversations/:contactId/simulate-reply
 * Simulate a Twilio webhook (as if the contact replied with "Tech Toad here!")
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { orgId } = await authenticateRequest(request);
    const { contactId } = await params;

    // Get contact info
    const contactResult = await query(
      `SELECT id, phone, first_name, last_name 
       FROM contacts 
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [contactId, orgId]
    );

    if (contactResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    const contact = contactResult.rows[0];

    // Simulate Twilio webhook by calling our webhook endpoint
    const webhookUrl = new URL('/api/twilio/webhook/sms', request.url);
    const formData = new FormData();
    formData.append('MessageSid', `SM${Math.random().toString(36).substring(2, 15)}`); // Fake Twilio SID
    formData.append('From', contact.phone);
    formData.append('To', '+18005551234'); // Your Twilio number (dummy)
    formData.append('Body', 'Tech Toad here!');
    formData.append('NumSegments', '1');

    // Call the webhook endpoint
    const webhookResponse = await fetch(webhookUrl.toString(), {
      method: 'POST',
      body: formData,
    });

    if (!webhookResponse.ok) {
      throw new Error('Failed to process simulated webhook');
    }

    return NextResponse.json({
      success: true,
      message: 'Simulated inbound message created via webhook',
      contact: {
        id: contact.id,
        name: contact.first_name && contact.last_name
          ? `${contact.first_name} ${contact.last_name}`.trim()
          : contact.first_name || contact.last_name || 'Unknown',
        phone: contact.phone,
      },
    });
  } catch (error: any) {
    console.error('Simulate reply error:', error);
    
    if (error.message?.includes('token') || 
        error.message?.includes('authentication') ||
        error.message?.includes('organization')) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: error.message 
      }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to simulate reply' },
      { status: 500 }
    );
  }
}


