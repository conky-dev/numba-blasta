-- Find duplicate sends (same org, same to_number, sent within a short time window)
-- This would indicate messages were sent multiple times due to deadlocks or retries

-- Option 1: Find numbers that received multiple messages within 10 minutes
SELECT 
    to_number,
    COUNT(*) as send_count,
    MIN(created_at) as first_send,
    MAX(created_at) as last_send,
    MAX(created_at) - MIN(created_at) as time_between,
    STRING_AGG(DISTINCT status, ', ') as statuses,
    STRING_AGG(id::text, ', ') as message_ids
FROM sms_messages
WHERE 
    direction = 'outbound'
    AND created_at > NOW() - INTERVAL '24 hours'  -- Last 24 hours
GROUP BY to_number, org_id
HAVING COUNT(*) > 1
    AND MAX(created_at) - MIN(created_at) < INTERVAL '10 minutes'  -- Within 10 min
ORDER BY send_count DESC, time_between DESC;


-- Option 2: Find messages with same body sent to same number (likely duplicates)
-- Uncomment to run:
/*
SELECT 
    to_number,
    LEFT(body, 50) as message_preview,
    COUNT(*) as send_count,
    MIN(created_at) as first_send,
    MAX(created_at) as last_send,
    MAX(created_at) - MIN(created_at) as time_between,
    STRING_AGG(id::text, ', ') as message_ids
FROM sms_messages
WHERE 
    direction = 'outbound'
    AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY to_number, body, org_id
HAVING COUNT(*) > 1
ORDER BY send_count DESC;
*/


-- Option 3: Find the 52 specific duplicate sends from today
-- (numbers that appear in your numbas.txt duplicates)
SELECT 
    to_number,
    COUNT(*) as times_sent,
    MIN(created_at) as first_send_time,
    MAX(created_at) as last_send_time,
    STRING_AGG(DISTINCT status, ', ') as statuses,
    ARRAY_AGG(DISTINCT campaign_id) FILTER (WHERE campaign_id IS NOT NULL) as campaign_ids
FROM sms_messages
WHERE 
    direction = 'outbound'
    AND DATE(created_at) = CURRENT_DATE
    AND to_number IN (
        '+18553681703', '+639150414631', '+14079735676', '+14105411041', '+13179376525',
        '+13155551212', '+18186196536', '+18178895643', '+17348978558', '+17069830208',
        '+16023996455', '+17089800564', '+14452084303', '+14802597152', '+14252130504',
        '+14242301222', '+13308099596', '+66636321865', '+19099572449', '+19036468194',
        '+19012468049', '+18328355340', '+18182166967', '+17819278662', '+17863852376',
        '+17753466770', '+17755012569', '+17072025153', '+16788861122', '+16785587803',
        '+15717195097', '+15313010800', '+15617647141', '+15202238120', '+15023831632',
        '+13183035871', '+13182307225', '+13174415765', '+13173744790', '+13155425294',
        '+13109485855', '+13155206401', '+13153008886'
    )
GROUP BY to_number
ORDER BY times_sent DESC;

