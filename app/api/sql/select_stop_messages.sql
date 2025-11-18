-- ============================================================================
-- SELECT SMS MESSAGES WITH "STOP" (Case-Insensitive)
-- ============================================================================
-- Fixed query to find messages containing "stop" in any case variation
-- ============================================================================

-- Option 1: Using LOWER() function (recommended - uses index better)
SELECT *
FROM sms_messages
WHERE LOWER(TRIM(body)) = 'stop';

-- Option 2: Using ILIKE (case-insensitive LIKE)
SELECT *
FROM sms_messages
WHERE TRIM(body) ILIKE 'stop';

-- Option 3: Exact match with whitespace handling (most precise)
SELECT *
FROM sms_messages
WHERE LOWER(TRIM(body)) = LOWER('stop');

-- Option 4: If you want to match "stop" anywhere in the message (not just exact)
SELECT *
FROM sms_messages
WHERE LOWER(body) LIKE '%stop%';

-- Option 5: With organization filter (recommended for multi-tenant)
SELECT *
FROM sms_messages
WHERE org_id = 'your-org-id-here'::UUID
  AND LOWER(TRIM(body)) = 'stop';

-- Option 6: Match common variations (stop, STOP, Stop, StOp, etc.)
-- This handles any case combination
SELECT *
FROM sms_messages
WHERE LOWER(TRIM(body)) IN ('stop', 'unsubscribe', 'optout', 'opt-out');

-- ============================================================================
-- RECOMMENDED QUERY (exact match, case-insensitive, trimmed):
-- ============================================================================
SELECT *
FROM sms_messages
WHERE LOWER(TRIM(body)) = 'stop';

-- ============================================================================
-- NOTES:
-- ============================================================================
-- LOWER() converts text to lowercase for case-insensitive comparison
-- TRIM() removes leading/trailing whitespace
-- This handles: "stop", "STOP", "Stop", "  stop  ", "STOP  ", etc.
-- 
-- For better performance, consider creating an index:
-- CREATE INDEX idx_sms_messages_body_lower ON sms_messages(LOWER(TRIM(body)));
-- ============================================================================

