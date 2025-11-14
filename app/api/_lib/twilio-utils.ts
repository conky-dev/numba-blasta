import twilio from 'twilio';

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
 * Calculate SMS segments (simplified version)
 * Real calculation depends on GSM-7 vs UCS-2 encoding
 */
export function calculateSMSSegments(message: string): number {
  const length = message.length;
  
  if (length === 0) return 0;
  if (length <= 160) return 1;
  
  // Multi-part messages use 153 chars per segment (7 chars for UDH header)
  return Math.ceil(length / 153);
}

/**
 * Calculate SMS cost based on segments
 * Current rate: $0.01 per segment
 */
export function calculateSMSCost(segments: number): number {
  return segments * 1; // 1 cent per segment
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

