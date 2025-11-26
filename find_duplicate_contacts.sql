-- Find duplicate phone numbers in the contacts table

SELECT 
    phone,
    COUNT(*) as contact_count,
    STRING_AGG(id::text, ', ') as contact_ids,
    ARRAY_AGG(DISTINCT category) as categories,
    STRING_AGG(DISTINCT COALESCE(first_name || ' ' || last_name, first_name, last_name, 'No Name'), ' | ') as names,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM contacts
WHERE deleted_at IS NULL
  AND opted_out_at IS NULL
GROUP BY phone, org_id
HAVING COUNT(*) > 1
ORDER BY contact_count DESC;

-- Summary stats
SELECT 
    COUNT(DISTINCT phone) as unique_duplicate_numbers,
    SUM(contact_count - 1) as total_extra_contacts
FROM (
    SELECT 
        phone,
        COUNT(*) as contact_count
    FROM contacts
    WHERE deleted_at IS NULL
      AND opted_out_at IS NULL
    GROUP BY phone, org_id
    HAVING COUNT(*) > 1
) duplicates;

