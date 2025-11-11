-- =====================================================
-- Billing & Balance Management
-- =====================================================
-- This schema handles SMS credit balance and transaction tracking
-- Balance is stored in organizations table
-- Transactions track all credits in/out (purchases, SMS sends, refunds)

-- =====================================================
-- 1. Update organizations table to include balance
-- =====================================================

-- Add balance column to organizations if it doesn't exist
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS sms_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Add constraint to prevent negative balance
ALTER TABLE organizations
ADD CONSTRAINT organizations_balance_non_negative 
CHECK (sms_balance >= 0);

-- =====================================================
-- 2. Billing Transactions Table
-- =====================================================

CREATE TABLE IF NOT EXISTS billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Transaction details
  type VARCHAR(50) NOT NULL, -- 'purchase', 'sms_send', 'refund', 'adjustment', 'bonus'
  amount DECIMAL(10,2) NOT NULL, -- Positive for credit, negative for debit
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  
  -- SMS-specific tracking
  sms_count INTEGER, -- Number of SMS segments if type = 'sms_send'
  cost_per_sms DECIMAL(10,4), -- Cost per SMS segment
  
  -- Payment/external references
  payment_method VARCHAR(50), -- 'stripe', 'manual', 'paypal', etc.
  payment_intent_id VARCHAR(255), -- Stripe payment intent or external reference
  
  -- Message reference (for SMS sends)
  message_id UUID, -- Reference to sms_messages table (to be created)
  campaign_id UUID REFERENCES sms_campaigns(id) ON DELETE SET NULL,
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Admin tracking
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT valid_transaction_type CHECK (
    type IN ('purchase', 'sms_send', 'refund', 'adjustment', 'bonus')
  )
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_billing_transactions_org_id 
  ON billing_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_created_at 
  ON billing_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_type 
  ON billing_transactions(type);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_payment_intent 
  ON billing_transactions(payment_intent_id) 
  WHERE payment_intent_id IS NOT NULL;

-- =====================================================
-- 3. Helper Functions
-- =====================================================

-- Get current balance for an organization
CREATE OR REPLACE FUNCTION get_org_balance(p_org_id UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance DECIMAL(10,2);
BEGIN
  SELECT sms_balance INTO v_balance
  FROM organizations
  WHERE id = p_org_id;
  
  RETURN COALESCE(v_balance, 0.00);
END;
$$;

-- Add credits to organization balance
CREATE OR REPLACE FUNCTION add_credits(
  p_org_id UUID,
  p_amount DECIMAL(10,2),
  p_type VARCHAR(50),
  p_description TEXT DEFAULT NULL,
  p_payment_method VARCHAR(50) DEFAULT NULL,
  p_payment_intent_id VARCHAR(255) DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID -- Returns transaction ID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance_before DECIMAL(10,2);
  v_balance_after DECIMAL(10,2);
  v_transaction_id UUID;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  -- Get current balance
  SELECT sms_balance INTO v_balance_before
  FROM organizations
  WHERE id = p_org_id
  FOR UPDATE; -- Lock row for update
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  v_balance_after := v_balance_before + p_amount;
  
  -- Update organization balance
  UPDATE organizations
  SET sms_balance = v_balance_after
  WHERE id = p_org_id;
  
  -- Record transaction
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

-- Deduct credits for SMS sending
CREATE OR REPLACE FUNCTION deduct_credits(
  p_org_id UUID,
  p_amount DECIMAL(10,2),
  p_sms_count INTEGER,
  p_cost_per_sms DECIMAL(10,4),
  p_message_id UUID DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID -- Returns transaction ID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance_before DECIMAL(10,2);
  v_balance_after DECIMAL(10,2);
  v_transaction_id UUID;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  -- Get current balance
  SELECT sms_balance INTO v_balance_before
  FROM organizations
  WHERE id = p_org_id
  FOR UPDATE; -- Lock row for update
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  -- Check sufficient balance
  IF v_balance_before < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', v_balance_before, p_amount;
  END IF;
  
  v_balance_after := v_balance_before - p_amount;
  
  -- Update organization balance
  UPDATE organizations
  SET sms_balance = v_balance_after
  WHERE id = p_org_id;
  
  -- Record transaction (negative amount for deduction)
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
    -p_amount, -- Negative for deduction
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

-- Check if organization has sufficient balance
CREATE OR REPLACE FUNCTION has_sufficient_balance(
  p_org_id UUID,
  p_required_amount DECIMAL(10,2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance DECIMAL(10,2);
BEGIN
  SELECT sms_balance INTO v_balance
  FROM organizations
  WHERE id = p_org_id;
  
  RETURN COALESCE(v_balance, 0.00) >= p_required_amount;
END;
$$;

-- =====================================================
-- 4. Row Level Security (RLS)
-- =====================================================

ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see transactions for their organization
CREATE POLICY billing_transactions_org_isolation ON billing_transactions
  FOR ALL
  USING (org_id = get_user_org_id());

-- =====================================================
-- 5. Indexes for Performance
-- =====================================================

-- Composite index for common queries (org + time range)
CREATE INDEX IF NOT EXISTS idx_billing_transactions_org_created 
  ON billing_transactions(org_id, created_at DESC);

-- Index for balance lookups
CREATE INDEX IF NOT EXISTS idx_organizations_balance 
  ON organizations(sms_balance);

-- =====================================================
-- 6. Comments for Documentation
-- =====================================================

COMMENT ON TABLE billing_transactions IS 'Tracks all billing transactions including purchases, SMS sends, refunds, and adjustments';
COMMENT ON COLUMN billing_transactions.amount IS 'Positive for credits added, negative for credits deducted';
COMMENT ON COLUMN billing_transactions.balance_before IS 'Organization balance before this transaction';
COMMENT ON COLUMN billing_transactions.balance_after IS 'Organization balance after this transaction';
COMMENT ON COLUMN billing_transactions.sms_count IS 'Number of SMS segments (for sms_send transactions)';
COMMENT ON COLUMN billing_transactions.cost_per_sms IS 'Cost per SMS segment (for calculating total)';
COMMENT ON FUNCTION add_credits IS 'Add credits to organization balance and record transaction';
COMMENT ON FUNCTION deduct_credits IS 'Deduct credits for SMS sending with validation';
COMMENT ON FUNCTION has_sufficient_balance IS 'Check if organization has enough balance for a transaction';

-- =====================================================
-- 7. Sample Data (for testing)
-- =====================================================

-- Add some initial balance to existing organizations (comment out in production)
-- UPDATE organizations SET sms_balance = 10.00 WHERE sms_balance = 0;

