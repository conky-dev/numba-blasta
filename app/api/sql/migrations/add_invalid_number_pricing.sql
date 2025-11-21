-- ============================================================================
-- ADD INVALID NUMBER ATTEMPT PRICING
-- ============================================================================
-- Adds a charge for failed message attempts due to invalid numbers
-- This covers the cost of API calls to Twilio that fail
-- ============================================================================

-- Add invalid number attempt pricing
INSERT INTO pricing (
  service_type,
  description,
  price_per_unit,
  unit,
  created_at,
  updated_at
)
VALUES (
  'invalid_number_attempt',
  'Charge for failed message attempts to invalid numbers (Twilio API call cost)',
  0.0015,
  'attempt',
  NOW(),
  NOW()
)
ON CONFLICT (service_type) 
DO UPDATE SET
  price_per_unit = EXCLUDED.price_per_unit,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verify the insert
SELECT 
  service_type,
  description,
  price_per_unit,
  unit
FROM pricing
WHERE service_type = 'invalid_number_attempt';

-- ============================================================================
-- USAGE:
-- ============================================================================
-- When a message fails with "Invalid 'To' Phone Number" error:
-- 1. Deduct $0.0015 from organization balance
-- 2. Log the transaction with service_type = 'invalid_number_attempt'
-- 3. Mark contact as deleted_at = NOW()
-- ============================================================================

