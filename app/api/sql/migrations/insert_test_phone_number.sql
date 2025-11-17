-- ============================================================================
-- INSERT TEST PHONE NUMBER
-- ============================================================================
-- Inserts a phone number for testing/development
-- ============================================================================

INSERT INTO phone_numbers (
  org_id,
  phone_number,
  phone_sid,
  type,
  status,
  is_primary,
  created_at,
  updated_at
)
VALUES (
  '042e8546-8b0f-47ab-bce5-33c6544159c7'::UUID,
  '+18553681703', -- Normalized E.164 format
  NULL, -- Phone SID (can be set later if needed)
  'toll-free',
  'verified', -- Set as verified/active
  true, -- Set as primary number
  NOW(),
  NOW()
)
ON CONFLICT (org_id, phone_number) DO UPDATE
SET
  status = EXCLUDED.status,
  is_primary = EXCLUDED.is_primary,
  updated_at = NOW();

-- Also update organizations table for backward compatibility
UPDATE organizations
SET
  sms_sender_number = '+18553681703',
  sms_sender_status = 'verified',
  updated_at = NOW()
WHERE id = '042e8546-8b0f-47ab-bce5-33c6544159c7'::UUID;

