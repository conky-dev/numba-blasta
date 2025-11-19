import twilio from 'twilio';
import { SegmentedMessage } from 'sms-segments-calculator';

// Initialize Twilio client
// Note: In production, each org will have their own subaccount
// For now, we'll use the main account credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

if (!accountSid || !authToken) {
  console.warn('[TWILIO] Warning: Twilio credentials not configured');
}

/**
 * Get Twilio client
 * In the future, this will accept orgId and use subaccount credentials
 */
export function getTwilioClient(orgId?: string) {
  // TODO: When implementing subaccounts, fetch org-specific credentials
  // const orgCreds = await getOrgTwilioCredentials(orgId);
  
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }
  
  return twilio(accountSid, authToken);
}

/**
 * Send SMS via Twilio
 */
export interface SendSMSParams {
  to: string; // E.164 format
  body: string;
  from?: string; // Optional: specific number or use Messaging Service
  statusCallback?: string; // Webhook URL for delivery updates
}

export interface SendSMSResult {
  sid: string; // Twilio MessageSid
  status: string; // queued, sent, etc.
  to: string;
  from: string;
  body: string;
  numSegments: string;
  price: string | null;
  priceUnit: string | null;
  errorCode: number | null;
  errorMessage: string | null;
}

export async function sendSMS(params: SendSMSParams, orgId?: string): Promise<SendSMSResult> {
  const client = getTwilioClient(orgId);
  
  try {
    const messageOptions: any = {
      to: params.to,
      body: params.body,
    };
    
    // Use Messaging Service if available, otherwise use 'from' number
    if (messagingServiceSid) {
      messageOptions.messagingServiceSid = messagingServiceSid;
    } else if (params.from) {
      messageOptions.from = params.from;
    } else {
      throw new Error('Either TWILIO_MESSAGING_SERVICE_SID or from number must be provided');
    }
    
    // Add status callback if provided
    if (params.statusCallback) {
      messageOptions.statusCallback = params.statusCallback;
    }
    
    console.log('[TWILIO] Sending SMS:', {
      to: params.to,
      bodyLength: params.body.length,
      hasMessagingService: !!messagingServiceSid,
      hasFrom: !!params.from
    });
    
    const message = await client.messages.create(messageOptions);
    
    console.log('[TWILIO] SMS sent successfully:', {
      sid: message.sid,
      status: message.status,
      segments: message.numSegments
    });
    
    return {
      sid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from || '',
      body: message.body,
      numSegments: message.numSegments || '1',
      price: message.price,
      priceUnit: message.priceUnit,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage,
    };
  } catch (error: any) {
    console.error('[TWILIO] Error sending SMS:', error);
    
    // Extract Twilio error details
    const twilioError = {
      sid: null,
      status: 'failed',
      to: params.to,
      from: params.from || '',
      body: params.body,
      numSegments: '0',
      price: null,
      priceUnit: null,
      errorCode: error.code || null,
      errorMessage: error.message || 'Unknown error',
    };
    
    throw twilioError;
  }
}

/**
 * Validate phone number format (basic E.164 validation)
 * For production, consider using libphonenumber-js or Twilio Lookup API
 */
export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  // Basic E.164 format: +[country code][number]
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  
  if (!phone) {
    return { valid: false, error: 'Phone number is required' };
  }
  
  if (!phone.startsWith('+')) {
    return { valid: false, error: 'Phone number must start with + (E.164 format)' };
  }
  
  if (!e164Regex.test(phone)) {
    return { valid: false, error: 'Invalid phone number format. Use E.164 format: +1234567890' };
  }
  
  return { valid: true };
}

/**
 * Calculate SMS segments using the sms-segments-calculator library
 * This accurately handles GSM-7 and UCS-2 encoding, emojis, and special characters
 * 
 * Based on: https://www.twilio.com/blog/2017/03/what-the-heck-is-a-segment.html
 */
export function calculateSMSSegments(message: string): number {
  if (!message || message.length === 0) return 0;
  
  try {
    const segmentedMessage = new SegmentedMessage(message);
    return segmentedMessage.segments.length;
  } catch (error) {
    console.error('[TWILIO] Error calculating segments:', error);
    // Fallback to simple calculation if library fails
    return message.length <= 160 ? 1 : Math.ceil(message.length / 153);
  }
}

/**
 * Calculate SMS cost based on segments
 * Fetches pricing from database (custom rates or pricing table)
 * Returns cost in cents
 * Throws error if pricing is not configured
 */
export async function calculateSMSCost(segments: number, orgId: string): Promise<number> {
  const { query } = await import('./db');
  
  let costPerSegment = 0;

  try {
    // Check for custom rates first
    const customRateResult = await query(
      `SELECT custom_rate_outbound_message
      FROM organizations
      WHERE id = $1`,
      [orgId]
    );

    if (customRateResult.rows.length > 0 && customRateResult.rows[0]) {
      const customRate = customRateResult.rows[0].custom_rate_outbound_message;
      
      if (customRate !== null && customRate !== undefined) {
        costPerSegment = parseFloat(customRate.toString());
      }
    }

    // If no custom rate, fetch from pricing table
    if (costPerSegment === 0) {
      const pricingResult = await query(
        `SELECT price_per_unit 
         FROM pricing 
         WHERE service_type = 'outbound_message'
           AND is_active = true 
         LIMIT 1`,
        []
      );

      if (pricingResult.rows.length > 0) {
        costPerSegment = parseFloat(pricingResult.rows[0].price_per_unit.toString());
      } else {
        throw new Error('Pricing not found in database. Please configure pricing in the pricing table.');
      }
    }
  } catch (error: any) {
    console.error('[TWILIO] Error fetching pricing:', error);
    throw new Error(`Failed to fetch pricing: ${error.message}`);
  }

  // Return total cost in cents
  return Math.round(costPerSegment * segments * 100);
}

/**
 * Parse multiple phone numbers from a string
 * Supports comma, semicolon, space, and newline separators
 */
export function parsePhoneNumbers(input: string): string[] {
  return input
    .split(/[,;\s\n]+/)
    .map(phone => phone.trim())
    .filter(phone => phone.length > 0);
}

