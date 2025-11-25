-- ============================================================================
-- CHECK BALANCE AND RECENT TRANSACTIONS
-- ============================================================================
-- Run this to see current balance and recent transactions for your org
-- ============================================================================

-- Show current balance for all organizations
SELECT 
  id,
  name,
  sms_balance,
  updated_at
FROM organizations
ORDER BY updated_at DESC;

-- Show last 20 transactions (most recent first)
SELECT 
  bt.id,
  bt.org_id,
  o.name as org_name,
  bt.type,
  bt.amount,
  bt.balance_before,
  bt.balance_after,
  bt.sms_count,
  bt.cost_per_sms,
  bt.description,
  bt.created_at
FROM billing_transactions bt
JOIN organizations o ON bt.org_id = o.id
ORDER BY bt.created_at DESC
LIMIT 20;

-- Check if deduct_credits function is working
-- Replace 'YOUR-ORG-ID' with your actual org ID
-- SELECT deduct_credits(
--   'YOUR-ORG-ID'::UUID,  -- org_id
--   0.0015,                -- amount to deduct
--   1,                     -- sms_count
--   0.0015,                -- cost_per_sms
--   NULL,                  -- message_id
--   NULL,                  -- campaign_id
--   'Test deduction'       -- description
-- );

-- Then check the balance again to see if it decreased
-- SELECT sms_balance FROM organizations WHERE id = 'YOUR-ORG-ID';

