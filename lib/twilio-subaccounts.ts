import twilio from 'twilio';

// Master Twilio client for creating/managing subaccounts
const masterClient = process.env.TWILIO_MASTER_ACCOUNT_SID && process.env.TWILIO_MASTER_AUTH_TOKEN
  ? twilio(process.env.TWILIO_MASTER_ACCOUNT_SID, process.env.TWILIO_MASTER_AUTH_TOKEN)
  : null;

/**
 * Create a Twilio subaccount for an organization
 * This allows centralized billing and management
 */
export async function createSubaccount(orgName: string) {
  if (!masterClient) {
    throw new Error('Master Twilio credentials not configured');
  }

  console.log(`📞 Creating Twilio subaccount for: ${orgName}`);

  try {
    // Step 1: Create the subaccount
    const subaccount = await masterClient.api.accounts.create({
      friendlyName: `${orgName} - SMSblast`
    });

    console.log(`✅ Subaccount created: ${subaccount.sid}`);

    // Step 2: Create a messaging service for the subaccount
    const subaccountClient = twilio(subaccount.sid, subaccount.authToken);
    
    const messagingService = await subaccountClient.messaging.v1.services.create({
      friendlyName: `${orgName} SMS Service`
    });

    console.log(`✅ Messaging service created: ${messagingService.sid}`);

    return {
      accountSid: subaccount.sid,
      authToken: subaccount.authToken,
      messagingServiceSid: messagingService.sid,
      friendlyName: subaccount.friendlyName
    };
  } catch (error: any) {
    console.error('❌ Failed to create subaccount:', error.message);
    throw new Error(`Twilio subaccount creation failed: ${error.message}`);
  }
}

/**
 * Close/suspend a Twilio subaccount
 */
export async function closeSubaccount(accountSid: string) {
  if (!masterClient) {
    throw new Error('Master Twilio credentials not configured');
  }

  console.log(`🔒 Closing Twilio subaccount: ${accountSid}`);

  try {
    await masterClient.api.accounts(accountSid).update({
      status: 'closed'
    });

    console.log(`✅ Subaccount closed: ${accountSid}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to close subaccount:', error.message);
    throw new Error(`Failed to close subaccount: ${error.message}`);
  }
}

/**
 * Suspend a Twilio subaccount (can be reactivated later)
 */
export async function suspendSubaccount(accountSid: string) {
  if (!masterClient) {
    throw new Error('Master Twilio credentials not configured');
  }

  console.log(`⏸️  Suspending Twilio subaccount: ${accountSid}`);

  try {
    await masterClient.api.accounts(accountSid).update({
      status: 'suspended'
    });

    console.log(`✅ Subaccount suspended: ${accountSid}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to suspend subaccount:', error.message);
    throw new Error(`Failed to suspend subaccount: ${error.message}`);
  }
}

/**
 * Reactivate a suspended Twilio subaccount
 */
export async function reactivateSubaccount(accountSid: string) {
  if (!masterClient) {
    throw new Error('Master Twilio credentials not configured');
  }

  console.log(`▶️  Reactivating Twilio subaccount: ${accountSid}`);

  try {
    await masterClient.api.accounts(accountSid).update({
      status: 'active'
    });

    console.log(`✅ Subaccount reactivated: ${accountSid}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to reactivate subaccount:', error.message);
    throw new Error(`Failed to reactivate subaccount: ${error.message}`);
  }
}

/**
 * Get subaccount details and usage
 */
export async function getSubaccountInfo(accountSid: string) {
  if (!masterClient) {
    throw new Error('Master Twilio credentials not configured');
  }

  try {
    const account = await masterClient.api.accounts(accountSid).fetch();
    
    return {
      sid: account.sid,
      friendlyName: account.friendlyName,
      status: account.status,
      dateCreated: account.dateCreated,
      dateUpdated: account.dateUpdated
    };
  } catch (error: any) {
    console.error('❌ Failed to get subaccount info:', error.message);
    throw new Error(`Failed to get subaccount info: ${error.message}`);
  }
}

/**
 * Check if master Twilio account is configured
 */
export function isMasterAccountConfigured(): boolean {
  return !!(process.env.TWILIO_MASTER_ACCOUNT_SID && process.env.TWILIO_MASTER_AUTH_TOKEN);
}

