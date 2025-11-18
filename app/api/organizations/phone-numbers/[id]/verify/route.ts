import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

export const dynamic = 'force-dynamic';

/**
 * POST /api/organizations/phone-numbers/[id]/verify
 * Submit toll-free verification information to Twilio
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await authenticateRequest(request);
    const { id: phoneNumberId } = await params;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Debug: Log what we received
    console.log('[TOLL-FREE VERIFICATION] Received request body:', {
      businessState: body.businessState,
      hasBusinessState: !!body.businessState,
      businessStateType: typeof body.businessState,
      businessStateLength: body.businessState?.length,
      allKeys: Object.keys(body)
    });
    
    const {
      // Step 1: Business Information
      bundleSid, // Business profile Bundle SID
      legalEntityName,
      websiteUrl,
      businessAddress,
      businessCity,
      businessState,
      businessPostalCode,
      businessCountry,
      contactName,
      contactEmail,
      contactPhone,
      // Step 2: Use Cases
      estimatedMonthlyVolume,
      optInType,
      optInPolicyImageUrl,
      useCaseCategory,
      useCaseDescription,
      messageContentExamples,
      businessRegistrationNumber,
      businessRegistrationType,
      businessRegistrationCountry,
      entityType,
    } = body;

    // Debug: Log after destructuring
    // Note: businessState and address/contact fields are received but not sent
    // when customerProfileSid is provided (they come from the Trust Hub profile)
    console.log('[TOLL-FREE VERIFICATION] After destructuring:', {
      bundleSid,
      hasBundleSid: !!bundleSid,
      note: 'Address/contact fields will not be sent when bundleSid (customerProfileSid) is provided'
    });

    // Log received BRN fields for debugging
    if (businessRegistrationNumber) {
      console.log('[TOLL-FREE VERIFICATION] BRN fields received:', {
        businessRegistrationNumber,
        businessRegistrationType,
        businessRegistrationCountry,
        entityType,
        allPresent: !!(businessRegistrationNumber && businessRegistrationType && businessRegistrationCountry && entityType)
      });
    }

    // Validate required fields from Step 1
    if (!bundleSid || !legalEntityName || !websiteUrl) {
      return NextResponse.json(
        { error: 'Bundle SID, legal entity name, and website URL are required' },
        { status: 400 }
      );
    }

    // Validate businessState - needed if bundleSid is a PCP (which will be retried without customerProfileSid)
    // or if bundleSid is not provided
    if (!businessState || !businessState.trim()) {
      return NextResponse.json(
        { error: 'Business state/province/region is required' },
        { status: 400 }
      );
    }

    // Validate required fields from Step 2
    if (!estimatedMonthlyVolume || !optInType || !useCaseCategory || !useCaseDescription) {
      return NextResponse.json(
        { error: 'Estimated monthly volume, opt-in type, use case category, and use case description are required' },
        { status: 400 }
      );
    }

    // Validate useCaseCategory is a valid Twilio enum value
    // Twilio expects simple uppercase values like "MARKETING", "NOTIFICATION", "MIXED", "TRANSACTIONAL"
    const validUseCaseCategories = [
      'MARKETING',
      'NOTIFICATION',
      'MIXED',
      'TRANSACTIONAL',
      'CUSTOMER_SUPPORT',
      'OTHER'
    ];
    
    let finalUseCaseCategory = useCaseCategory;
    
    // Map UI values (including old lowercase and new enum values) to Twilio's expected enum values
    const categoryMap: Record<string, string> = {
      // Old lowercase values
      'marketing': 'MARKETING',
      'account_notifications': 'NOTIFICATION',
      'customer_support': 'NOTIFICATION',
      'appointment_reminders': 'NOTIFICATION',
      'order_updates': 'NOTIFICATION',
      'two_factor_auth': 'NOTIFICATION',
      'alerts': 'NOTIFICATION',
      'other': 'OTHER',
      // New enum values that might be in the form
      'MIXED_NOTIFICATION_MARKETING': 'MIXED',
      'NOTIFICATION': 'NOTIFICATION',
      'CUSTOMER_SUPPORT': 'NOTIFICATION',
      'OTHER': 'OTHER',
    };
    
    if (categoryMap[useCaseCategory]) {
      finalUseCaseCategory = categoryMap[useCaseCategory];
      console.log(`[TOLL-FREE VERIFICATION] Mapped useCaseCategory from '${useCaseCategory}' to '${finalUseCaseCategory}'`);
    } else if (!validUseCaseCategories.includes(useCaseCategory)) {
      return NextResponse.json(
        { error: `Invalid use case category: '${useCaseCategory}'. Please select a valid category from the dropdown.` },
        { status: 400 }
      );
    }

    // Get the phone number record
    const phoneNumberResult = await query(
      `SELECT id, phone_number, phone_sid, org_id, status
       FROM phone_numbers
       WHERE id = $1 AND org_id = $2`,
      [phoneNumberId, orgId]
    );

    if (phoneNumberResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      );
    }

    const phoneNumber = phoneNumberResult.rows[0];
    const phoneSid = phoneNumber.phone_sid;

    if (!phoneSid) {
      return NextResponse.json(
        { error: 'Phone number SID not found. Please reprovision the number.' },
        { status: 400 }
      );
    }

    // Validate that phoneSid is actually a phone number SID (starts with "PN"), not a Bundle SID (starts with "BU")
    let actualPhoneSid = phoneSid;
    if (phoneSid.startsWith('BU')) {
      // The stored value is a Bundle SID, not a phone number SID
      // Try to look up the phone number SID from Twilio using the phone number
      console.warn(`[TOLL-FREE VERIFICATION] Invalid phone_sid (Bundle SID) for ${phoneNumber.phone_number}, attempting to look up phone number SID from Twilio...`);
      
      if (!accountSid || !authToken) {
        return NextResponse.json(
          { error: 'Invalid phone number SID. The stored value appears to be a Bundle SID. Please reprovision the phone number.' },
          { status: 400 }
        );
      }

      try {
        const client = twilio(accountSid, authToken);
        // Look up the phone number by its phone number value
        const incomingNumbers = await client.incomingPhoneNumbers.list({
          phoneNumber: phoneNumber.phone_number,
          limit: 1
        });

        if (incomingNumbers.length > 0 && incomingNumbers[0].sid) {
          actualPhoneSid = incomingNumbers[0].sid;
          // Update the database with the correct phone number SID
          await query(
            `UPDATE phone_numbers
             SET phone_sid = $1, updated_at = NOW()
             WHERE id = $2`,
            [actualPhoneSid, phoneNumberId]
          );
          console.log(`[TOLL-FREE VERIFICATION] Found and updated phone number SID: ${actualPhoneSid}`);
        } else {
          return NextResponse.json(
            { error: 'Invalid phone number SID. Could not find the phone number in Twilio. Please reprovision the phone number.' },
            { status: 400 }
          );
        }
      } catch (lookupError: any) {
        console.error('[TOLL-FREE VERIFICATION] Failed to look up phone number SID:', lookupError);
        return NextResponse.json(
          { error: 'Invalid phone number SID. The stored value appears to be a Bundle SID. Please reprovision the phone number.' },
          { status: 400 }
        );
      }
    }

    // Get organization data for fallback
    const orgResult = await query(
      `SELECT name, email, phone
       FROM organizations
       WHERE id = $1`,
      [orgId]
    );

    const org = orgResult.rows[0] || {};

    // Use provided data or fall back to organization data
    const finalContactName = contactName || org.name || '';
    const finalContactEmail = contactEmail || org.email || '';
    const finalContactPhone = contactPhone || org.phone || '';
    // notificationEmail is required by Twilio - use contact email or org email
    const notificationEmail = finalContactEmail || org.email || '';
    
    if (!notificationEmail) {
      return NextResponse.json(
        { error: 'Contact email or organization email is required for verification notifications' },
        { status: 400 }
      );
    }

    // Map our volume range strings to Twilio's MessageVolume enum values
    // Twilio expects: '10', '100', '1,000', '10,000', '100,000', '250,000', '500,000', '750,000', '1,000,000', '5,000,000', '10,000,000+'
    const volumeMap: Record<string, string> = {
      '0-1000': '1,000',
      '1001-10000': '10,000',
      '10001-50000': '10,000', // Map to closest
      '50001-100000': '100,000',
      '100001-500000': '250,000', // Map to closest
      '500001+': '1,000,000',
    };
    const twilioMessageVolume = volumeMap[estimatedMonthlyVolume] || '10,000';

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    console.log('[TOLL-FREE VERIFICATION] Submitting verification for:', {
      phoneNumberId,
      phoneSid,
      bundleSid,
      legalEntityName,
      twilioMessageVolume,
      note: 'Address and contact fields come from Trust Hub profile (customerProfileSid)',
    });

    try {
      // Submit the phone number for toll-free verification
      // Use REST API directly since SDK may have field name issues
      let verification: any;
      
      // Build optInImageUrls array - Twilio requires this as an array
      const optInImageUrls = optInPolicyImageUrl 
        ? [optInPolicyImageUrl] 
        : []; // Empty array if not provided, but Twilio might require at least one
      
      // Use SDK method with camelCase field names (SDK converts to PascalCase internally)
      // Note: Primary Customer Profiles (PCP) cannot be used - only ISV Starters or Secondary Customer Profiles (SCP)
      // If bundleSid is provided, we'll try to use it, but if it's a PCP, Twilio will reject it
      // In that case, we should include all address/contact fields instead
      
      // Normalize businessState for address fields
      const stateNameToCode: Record<string, string> = {
        'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
        'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
        'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
        'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
        'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
        'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
        'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
        'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
        'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
        'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
        'district of columbia': 'DC'
      };
      
      let normalizedBusinessState = businessState?.trim() || '';
      if (normalizedBusinessState) {
        const stateLower = normalizedBusinessState.toLowerCase();
        if (stateNameToCode[stateLower]) {
          normalizedBusinessState = stateNameToCode[stateLower];
        } else if (normalizedBusinessState.length === 2) {
          normalizedBusinessState = normalizedBusinessState.toUpperCase();
        }
      }
      
      // Split contact name into first and last
      const contactNameParts = (contactName || '').trim().split(' ');
      const contactFirstName = contactNameParts[0] || 'Contact';
      const contactLastName = contactNameParts.slice(1).join(' ') || 'Name';
      
      // Build base payload with required fields
      const basePayload: any = {
        businessName: legalEntityName,
        businessWebsite: websiteUrl,
        tollfreePhoneNumberSid: actualPhoneSid,
        notificationEmail: notificationEmail,
        // Use Case Information
        messageVolume: twilioMessageVolume,
        optInType: optInType,
        optInImageUrls: optInImageUrls,
        useCaseCategories: [finalUseCaseCategory],
        useCaseDescription: useCaseDescription,
        useCaseSummary: useCaseDescription,
        productionMessageSample: messageContentExamples || useCaseDescription,
        ...(messageContentExamples && { messageContentExamples }),
        // BRN fields if provided
        ...(businessRegistrationNumber?.trim() && businessRegistrationType?.trim() && businessRegistrationCountry?.trim() && entityType?.trim() && {
          businessRegistrationNumber: businessRegistrationNumber.trim(),
          businessRegistrationAuthority: businessRegistrationType.trim(),
          businessRegistrationCountry: (businessRegistrationCountry.trim().length === 2) ? businessRegistrationCountry.trim().toUpperCase() : businessRegistrationCountry.trim(),
          businessType: entityType.trim(),
        }),
      };
      
      // Address and contact fields (used when not using customerProfileSid or when PCP fails)
      const addressContactFields = {
        businessStreetAddress: businessAddress || '',
        businessCity: businessCity || '',
        businessStateProvinceRegion: normalizedBusinessState || '',
        businessPostalCode: businessPostalCode || '',
        businessCountry: (businessCountry && businessCountry.length === 2) ? businessCountry.toUpperCase() : 'US',
        businessContactFirstName: contactFirstName,
        businessContactLastName: contactLastName,
        businessContactEmail: contactEmail || '',
        businessContactPhone: contactPhone || '',
      };
      
      // Try with customerProfileSid first if bundleSid is provided
      // If it fails with PCP error, retry without customerProfileSid but with address/contact fields
      let verificationPayload: any;
      
      if (bundleSid) {
        // First attempt: with customerProfileSid, without address/contact fields
        verificationPayload = {
          ...basePayload,
          customerProfileSid: bundleSid,
        };
        
        console.log('[TOLL-FREE VERIFICATION] Attempting with customerProfileSid:', bundleSid);
        
        try {
          verification = await client.messaging.v1.tollfreeVerifications.create(verificationPayload);
        } catch (error: any) {
          // If error is about PCP, retry without customerProfileSid but with address/contact fields
          if (error.message?.includes('Primary Profiles') || error.message?.includes('PCP') || error.message?.includes('ISV Starters or Secondary')) {
            console.log('[TOLL-FREE VERIFICATION] PCP detected, retrying without customerProfileSid but with address/contact fields');
            verificationPayload = {
              ...basePayload,
              ...addressContactFields,
            };
            verification = await client.messaging.v1.tollfreeVerifications.create(verificationPayload);
          } else {
            throw error;
          }
        }
      } else {
        // No bundleSid provided, use address/contact fields
        verificationPayload = {
          ...basePayload,
          ...addressContactFields,
        };
        console.log('[TOLL-FREE VERIFICATION] No bundleSid provided, using address/contact fields');
        verification = await client.messaging.v1.tollfreeVerifications.create(verificationPayload);
      }
      
      console.log('[TOLL-FREE VERIFICATION] Payload sent:', JSON.stringify(verificationPayload, null, 2));

      console.log('[TOLL-FREE VERIFICATION] Verification submitted:', {
        verificationSid: verification.Sid || verification.sid,
        status: verification.Status || verification.status,
      });

      // Map Twilio status to our status
      const verificationStatus = verification.Status || verification.status;
      let ourStatus = 'awaiting_verification';
      if (verificationStatus === 'APPROVED') {
        ourStatus = 'verified';
      } else if (verificationStatus === 'REJECTED') {
        ourStatus = 'failed';
      }

      // Update phone number status and verification SID in database
      const verificationSid = verification.Sid || verification.sid;
      await query(
        `UPDATE phone_numbers
         SET status = $1,
             verification_sid = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [ourStatus, verificationSid, phoneNumberId]
      );

      return NextResponse.json(
        {
          success: true,
          verification: {
            sid: verificationSid,
            status: verificationStatus,
            phoneNumber: phoneNumber.phone_number,
          },
          message: 'Verification submitted successfully. Twilio will review your submission.',
        },
        { status: 200 }
      );
    } catch (twilioError: any) {
      console.error('[TOLL-FREE VERIFICATION] Twilio API error:', {
        message: twilioError.message,
        status: twilioError.status,
        code: twilioError.code,
        moreInfo: twilioError.moreInfo,
        details: twilioError.details,
        stack: twilioError.stack,
        note: 'Address and contact fields come from Trust Hub profile (customerProfileSid) and were not included in payload'
      });

      // Update status to failed if it's a validation error
      if (twilioError.status === 400 || twilioError.status === 422) {
        await query(
          `UPDATE phone_numbers
           SET status = 'failed',
               updated_at = NOW()
           WHERE id = $1`,
          [phoneNumberId]
        );
      }

      return NextResponse.json(
        {
          error: twilioError.message || 'Failed to submit verification to Twilio',
          details: twilioError.code ? `Twilio error code: ${twilioError.code}` : undefined,
        },
        { status: twilioError.status || 500 }
      );
    }
  } catch (error: any) {
    console.error('[TOLL-FREE VERIFICATION] Error:', error);

    if (error.message?.includes('token') ||
        error.message?.includes('authentication') ||
        error.message?.includes('organization')) {
      return NextResponse.json(
        { error: 'Unauthorized', details: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to submit verification' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/organizations/phone-numbers/[id]/verify
 * Get verification status for a phone number
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await authenticateRequest(request);
    const { id: phoneNumberId } = await params;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      );
    }

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    // Get the phone number record
    const phoneNumberResult = await query(
      `SELECT id, phone_number, phone_sid, status
       FROM phone_numbers
       WHERE id = $1 AND org_id = $2`,
      [phoneNumberId, orgId]
    );

    if (phoneNumberResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      );
    }

    const phoneNumber = phoneNumberResult.rows[0];
    const phoneSid = phoneNumber.phone_sid;

    if (!phoneSid) {
      return NextResponse.json(
        {
          verification: {
            status: phoneNumber.status,
            phoneNumber: phoneNumber.phone_number,
          },
        },
        { status: 200 }
      );
    }

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    try {
      // Fetch verification status from Twilio using REST API
      const verificationsResponse = await client.request({
        method: 'get',
        uri: `/v1/Messaging/TollFreeVerifications`,
        params: {
          PhoneNumberSid: phoneSid,
          PageSize: 1,
        },
      });

      const verifications = verificationsResponse.verifications || verificationsResponse || [];

      if (verifications.length > 0) {
        const verification = verifications[0];
        const verificationStatus = verification.Status || verification.status;
        return NextResponse.json(
          {
            verification: {
              sid: verification.Sid || verification.sid,
              status: verificationStatus,
              phoneNumber: phoneNumber.phone_number,
              rejectionReason: verification.RejectionReason || verification.rejectionReason,
              // Map Twilio status to our status
              ourStatus: verificationStatus === 'APPROVED' ? 'verified' :
                        verificationStatus === 'PENDING' ? 'awaiting_verification' :
                        verificationStatus === 'REJECTED' ? 'failed' : 'awaiting_verification',
            },
          },
          { status: 200 }
        );
      }

      // No verification found, return current status
      return NextResponse.json(
        {
          verification: {
            status: phoneNumber.status,
            phoneNumber: phoneNumber.phone_number,
          },
        },
        { status: 200 }
      );
    } catch (twilioError: any) {
      console.error('[TOLL-FREE VERIFICATION] Error fetching status:', twilioError);
      
      // Return current database status if Twilio API fails
      return NextResponse.json(
        {
          verification: {
            status: phoneNumber.status,
            phoneNumber: phoneNumber.phone_number,
          },
          warning: 'Could not fetch latest status from Twilio',
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('[TOLL-FREE VERIFICATION] Error:', error);

    if (error.message?.includes('token') ||
        error.message?.includes('authentication') ||
        error.message?.includes('organization')) {
      return NextResponse.json(
        { error: 'Unauthorized', details: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch verification status' },
      { status: 500 }
    );
  }
}

