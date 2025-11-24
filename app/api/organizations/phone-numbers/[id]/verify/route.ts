import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/api/_lib/auth-utils';
import { query } from '@/app/api/_lib/db';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const defaultBundleSid = 'BUac3d460dacc71e86d165ea1f0fc75fce99'; // Hardcoded Trust Hub Bundle SID

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
      // bundleSid is now provided by environment variable, not from request
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
    
    // Use default Bundle SID from environment variable
    const bundleSid = defaultBundleSid;

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
      `SELECT id, phone_number, phone_sid, org_id, status, verification_sid
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
    let existingVerificationSid = phoneNumber.verification_sid; // Check if we have an existing verification in DB

    if (!phoneSid) {
      return NextResponse.json(
        { error: 'Phone number SID not found. Please reprovision the number.' },
        { status: 400 }
      );
    }
    
    // Initialize Twilio client early to check for existing verifications
    const client = twilio(accountSid, authToken);
    
    // If we don't have a verification_sid in DB, check Twilio directly
    if (!existingVerificationSid) {
      console.log('[TOLL-FREE VERIFICATION] No verification_sid in DB, checking Twilio for existing verifications...');
      try {
        const existingVerifications = await client.messaging.v1.tollfreeVerifications.list({
          tollfreePhoneNumberSid: phoneSid,
          limit: 1
        });
        
        if (existingVerifications.length > 0) {
          existingVerificationSid = existingVerifications[0].sid;
          console.log('[TOLL-FREE VERIFICATION] Found existing verification on Twilio:', existingVerificationSid);
          
          // Update DB with the verification SID
          await query(
            `UPDATE phone_numbers SET verification_sid = $1 WHERE id = $2`,
            [existingVerificationSid, phoneNumberId]
          );
        } else {
          console.log('[TOLL-FREE VERIFICATION] No existing verifications found on Twilio');
        }
      } catch (listError: any) {
        console.error('[TOLL-FREE VERIFICATION] Error listing existing verifications:', listError.message);
      }
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
    // From docs: '10', '100', '1,000', '10,000', '100,000', '250,000', '500,000', '750,000', '1,000,000', '5,000,000', '10,000,000+'
    // MUST use exact enum values WITH COMMAS for numbers >= 1,000
    const volumeMap: Record<string, string> = {
      '0-1000': '1,000',
      '1001-10000': '10,000',
      '10001-50000': '10,000',
      '50001-100000': '100,000',
      '100001-500000': '250,000',
      '500001+': '1,000,000',
    };
    const twilioMessageVolume = volumeMap[estimatedMonthlyVolume] || '10,000';

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
        useCaseSummary: useCaseDescription,
        productionMessageSample: messageContentExamples || useCaseDescription,
      };
      
      // BRN fields (only include when NOT using customerProfileSid)
      const brnFields = (businessRegistrationNumber?.trim() && businessRegistrationType?.trim() && businessRegistrationCountry?.trim() && entityType?.trim()) ? {
        businessRegistrationNumber: businessRegistrationNumber.trim(),
        businessRegistrationAuthority: businessRegistrationType.trim(),
        businessRegistrationCountry: (businessRegistrationCountry.trim().length === 2) ? businessRegistrationCountry.trim().toUpperCase() : businessRegistrationCountry.trim(),
        businessType: entityType.trim(),
      } : {};
      
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
      
      // Check if we're editing an existing verification or creating a new one
      if (existingVerificationSid) {
        console.log('[TOLL-FREE VERIFICATION] Found existing verification SID:', existingVerificationSid);
        
        // Check if this verification is editable
        try {
          const existingVerification = await client.messaging.v1
            .tollfreeVerifications(existingVerificationSid)
            .fetch();
          
          const isEditable = existingVerification.editAllowed || false;
          console.log('[TOLL-FREE VERIFICATION] Existing verification editable:', isEditable);
          
          if (isEditable) {
            // Use SDK update method for editing - must use camelCase with uppercase enums
            verificationPayload = {
              messageVolume: twilioMessageVolume,
              optInType: optInType.toUpperCase(), // MUST be uppercase enum
              optInImageUrls: optInImageUrls.length > 0 ? optInImageUrls : [websiteUrl + '/opt-in'],
              useCaseCategories: [finalUseCaseCategory], // Already uppercase
              useCaseSummary: useCaseDescription,
              productionMessageSample: messageContentExamples || useCaseDescription,
              editReason: 'Updated verification information based on previous rejection feedback',
            };
            
            console.log('[TOLL-FREE VERIFICATION] Updating existing verification with payload:', JSON.stringify(verificationPayload, null, 2));
            
            verification = await client.messaging.v1
              .tollfreeVerifications(existingVerificationSid)
              .update(verificationPayload);
            console.log('[TOLL-FREE VERIFICATION] ✅ Update successful! Response:', JSON.stringify(verification, null, 2));
          } else {
            console.log('[TOLL-FREE VERIFICATION] ⚠️ Verification not editable (edit_allowed=false)');
            console.log('[TOLL-FREE VERIFICATION] Cannot update or create new - verification exists but is locked');
            return NextResponse.json(
              { error: 'This verification cannot be edited. The verification already exists and the edit window has expired. Please contact Twilio support.' },
              { status: 400 }
            );
          }
        } catch (fetchError: any) {
          console.error('[TOLL-FREE VERIFICATION] Failed to fetch existing verification:', fetchError.message);
          // If we can't fetch it, it might not exist anymore - proceed to create new
          await query(
            `UPDATE phone_numbers SET verification_sid = NULL WHERE id = $1`,
            [phoneNumberId]
          );
        }
      }
      
      // Create new verification if we didn't update
      if (!verification) {
        // Don't use customerProfileSid - send all fields directly instead
        // This avoids PCP (Primary Customer Profile) issues
        console.log('[TOLL-FREE VERIFICATION] Creating verification WITHOUT customerProfileSid');
        console.log('[TOLL-FREE VERIFICATION] Will include all business address and contact fields');
        
        verificationPayload = {
          ...basePayload,
          ...addressContactFields,
          ...brnFields,
        };
        
        console.log('[TOLL-FREE VERIFICATION] Full SDK payload:', JSON.stringify(verificationPayload, null, 2));
        
        try {
          verification = await client.messaging.v1.tollfreeVerifications.create(verificationPayload);
          console.log('[TOLL-FREE VERIFICATION] Success! Verification created:', verification.sid);
        } catch (error: any) {
          console.error('[TOLL-FREE VERIFICATION] Twilio API error:', {
            message: error.message,
            status: error.status,
            code: error.code,
            moreInfo: error.moreInfo,
            details: error.details,
            stack: error.stack,
            fullError: JSON.stringify(error, null, 2),
          });
          throw error;
        }
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
        fullError: JSON.stringify(twilioError, null, 2),
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
      console.log('[TOLL-FREE VERIFICATION GET] Fetching verifications for phone SID:', phoneSid);
      const verificationsResponse = await client.request({
        method: 'get',
        uri: `https://messaging.twilio.com/v1/Tollfree/Verifications`,
        params: {
          TollfreePhoneNumberSid: phoneSid,
          PageSize: 1,
        },
      });

      console.log('[TOLL-FREE VERIFICATION GET] Raw response:', JSON.stringify(verificationsResponse, null, 2));
      
      // Handle the nested response structure from client.request()
      const responseBody = verificationsResponse.body || verificationsResponse;
      const verifications = responseBody.verifications || [];
      console.log('[TOLL-FREE VERIFICATION GET] Found verifications count:', verifications.length);

      if (verifications.length > 0) {
        const verification = verifications[0];
        console.log('[TOLL-FREE VERIFICATION GET] First verification:', JSON.stringify(verification, null, 2));
        const verificationStatus = verification.status; // Using snake_case as that's what Twilio returns
        return NextResponse.json(
          {
            verification: {
              sid: verification.sid,
              status: verificationStatus,
              phoneNumber: phoneNumber.phone_number,
              rejectionReason: verification.rejection_reason,
              rejectionReasons: verification.rejection_reasons || null,
              editAllowed: verification.edit_allowed || false,
              editExpiration: verification.edit_expiration || null,
              // Include all the form fields so we can pre-populate
              businessName: verification.business_name,
              businessWebsite: verification.business_website,
              messageVolume: verification.message_volume,
              optInType: verification.opt_in_type,
              optInImageUrls: verification.opt_in_image_urls || [],
              useCaseCategories: verification.use_case_categories || [],
              useCaseSummary: verification.use_case_summary,
              productionMessageSample: verification.production_message_sample,
              // Business address fields
              businessStreetAddress: verification.business_street_address,
              businessCity: verification.business_city,
              businessStateProvinceRegion: verification.business_state_province_region,
              businessPostalCode: verification.business_postal_code,
              businessCountry: verification.business_country,
              // Contact fields
              businessContactFirstName: verification.business_contact_first_name,
              businessContactLastName: verification.business_contact_last_name,
              businessContactEmail: verification.business_contact_email,
              businessContactPhone: verification.business_contact_phone,
              // BRN fields
              businessRegistrationNumber: verification.business_registration_number,
              businessRegistrationAuthority: verification.business_registration_authority,
              businessRegistrationCountry: verification.business_registration_country,
              businessType: verification.business_type,
              // Map Twilio status to our status
              ourStatus: verificationStatus === 'APPROVED' ? 'verified' :
                        verificationStatus === 'PENDING_REVIEW' ? 'awaiting_verification' :
                        verificationStatus === 'TWILIO_REJECTED' ? 'failed' :
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

