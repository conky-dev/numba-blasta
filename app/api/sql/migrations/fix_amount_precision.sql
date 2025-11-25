-- ============================================================================
-- FIX BILLING TRANSACTIONS AMOUNT PRECISION
-- ============================================================================
-- The amount column was DECIMAL(10,2) which rounds 0.0015 to 0.00
-- Change to DECIMAL(12,4) to support micro-transactions and larger balances
-- DECIMAL(12,4) = 12 total digits, 4 after decimal = max 99,999,999.9999
-- ============================================================================

-- Step 1: Update organizations.sms_balance to DECIMAL(12,4)
ALTER TABLE organizations 
  ALTER COLUMN sms_balance TYPE DECIMAL(12,4);

-- Step 2: Update billing_transactions columns to DECIMAL(12,4)
ALTER TABLE billing_transactions 
  ALTER COLUMN amount TYPE DECIMAL(12,4);

ALTER TABLE billing_transactions 
  ALTER COLUMN balance_before TYPE DECIMAL(12,4);

ALTER TABLE billing_transactions 
  ALTER COLUMN balance_after TYPE DECIMAL(12,4);

-- Step 3: Drop legacy balance_cents column from organizations if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' 
    AND column_name = 'balance_cents'
  ) THEN
    ALTER TABLE organizations DROP COLUMN balance_cents;
  END IF;
END $$;

-- Step 4: Drop legacy sms_balance column from user_profiles (balance moved to organizations)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'sms_balance'
  ) THEN
    ALTER TABLE user_profiles DROP COLUMN sms_balance;
  END IF;
END $$;

-- Step 4: Update the deduct_credits function to accept DECIMAL(12,4)
CREATE OR REPLACE FUNCTION deduct_credits(
  p_org_id UUID,
  p_amount DECIMAL(12,4),  -- Changed from DECIMAL(10,2) to DECIMAL(12,4)
  p_sms_count INTEGER,
  p_cost_per_sms DECIMAL(10,4),
  p_message_id UUID DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance_before DECIMAL(12,4);  -- Changed precision
  v_balance_after DECIMAL(12,4);   -- Changed precision
  v_transaction_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  SELECT sms_balance INTO v_balance_before
  FROM organizations
  WHERE id = p_org_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  IF v_balance_before < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', v_balance_before, p_amount;
  END IF;
  
  v_balance_after := v_balance_before - p_amount;
  
  UPDATE organizations
  SET sms_balance = v_balance_after
  WHERE id = p_org_id;
  
  INSERT INTO billing_transactions (
    org_id,
    type,
    amount,
    balance_before,
    balance_after,
    sms_count,
    cost_per_sms,
    message_id,
    campaign_id,
    description
  ) VALUES (
    p_org_id,
    'sms_send',
    -p_amount,
    v_balance_before,
    v_balance_after,
    p_sms_count,
    p_cost_per_sms,
    p_message_id,
    p_campaign_id,
    COALESCE(p_description, 'SMS send')
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Update add_credits function as well
CREATE OR REPLACE FUNCTION add_credits(
  p_org_id UUID,
  p_amount DECIMAL(12,4),  -- Changed from DECIMAL(10,2) to DECIMAL(12,4)
  p_type VARCHAR(50),
  p_description TEXT DEFAULT NULL,
  p_payment_method VARCHAR(50) DEFAULT NULL,
  p_payment_intent_id VARCHAR(255) DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance_before DECIMAL(12,4);  -- Changed precision
  v_balance_after DECIMAL(12,4);   -- Changed precision
  v_transaction_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  SELECT sms_balance INTO v_balance_before
  FROM organizations
  WHERE id = p_org_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  v_balance_after := v_balance_before + p_amount;
  
  UPDATE organizations
  SET sms_balance = v_balance_after
  WHERE id = p_org_id;
  
  INSERT INTO billing_transactions (
    org_id,
    type,
    amount,
    balance_before,
    balance_after,
    description,
    payment_method,
    payment_intent_id,
    created_by
  ) VALUES (
    p_org_id,
    p_type,
    p_amount,
    v_balance_before,
    v_balance_after,
    p_description,
    p_payment_method,
    p_payment_intent_id,
    p_created_by
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Verification query
SELECT 
  'Amount column precision updated to DECIMAL(12,4)' as status;

