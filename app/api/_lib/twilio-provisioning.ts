import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

if (!accountSid || !authToken) {
  console.warn('[TWILIO] Warning: Twilio master credentials not configured for provisioning');
}

/**
 * Provision a toll-free SMS number for an organization and attach it to
 * the platform Messaging Service. This is the first step before verification.
 */
export async function provisionOrgTollFreeNumber(orgId: string) {
  if (!accountSid || !authToken || !messagingServiceSid) {
    throw new Error(
      'Twilio provisioning not configured. Ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID are set.'
    );
  }

  const client = twilio(accountSid, authToken);

  console.log(`[TWILIO PROVISION] Searching toll-free numbers for org ${orgId}...`);

  // Find an available toll-free number (US) with SMS capability
  const candidates = await client
    .availablePhoneNumbers('US')
    .tollFree.list({ smsEnabled: true, limit: 1 });

  if (!candidates || candidates.length === 0) {
    console.error('[TWILIO PROVISION] No toll-free numbers available for purchase');
    throw new Error('No toll-free numbers available for purchase');
  }

  const candidate = candidates[0];
  console.log('[TWILIO PROVISION] Candidate toll-free number:', candidate.phoneNumber);

  // Purchase the number
  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber: candidate.phoneNumber,
  });

  console.log('[TWILIO PROVISION] Purchased toll-free number:', {
    sid: purchased.sid,
    phoneNumber: purchased.phoneNumber,
  });

  // Attach to Messaging Service so outbound uses this number
  await client.messaging.v1
    .services(messagingServiceSid)
    .phoneNumbers.create({ phoneNumberSid: purchased.sid });

  console.log('[TWILIO PROVISION] Attached number to Messaging Service:', {
    messagingServiceSid,
    phoneNumberSid: purchased.sid,
  });

  return {
    phoneNumber: purchased.phoneNumber,
    phoneSid: purchased.sid,
  };
}


