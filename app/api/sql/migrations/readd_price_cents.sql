-- Re-add price_cents column to sms_messages and set all records to 0.0015

BEGIN;

-- Step 1: Add price_cents column if it doesn't exist
ALTER TABLE sms_messages 
ADD COLUMN IF NOT EXISTS price_cents DECIMAL(12,4);

-- Step 2: Set all existing records to 0.0015
UPDATE sms_messages 
SET price_cents = 0.0015 
WHERE price_cents IS NULL;

-- Step 3: Set default value for future inserts
ALTER TABLE sms_messages 
ALTER COLUMN price_cents SET DEFAULT 0.0015;

COMMIT;

-- Verify the changes
SELECT 
    COUNT(*) as total_messages,
    COUNT(price_cents) as messages_with_price,
    MIN(price_cents) as min_price,
    MAX(price_cents) as max_price,
    AVG(price_cents) as avg_price
FROM sms_messages;

