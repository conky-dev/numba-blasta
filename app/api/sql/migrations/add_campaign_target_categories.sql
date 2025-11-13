-- Add target_categories column to sms_campaigns table
-- This allows campaigns to target specific contact categories

ALTER TABLE sms_campaigns 
ADD COLUMN IF NOT EXISTS target_categories TEXT[] DEFAULT NULL;

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_campaigns_target_categories 
ON sms_campaigns USING GIN (target_categories) 
WHERE target_categories IS NOT NULL AND deleted_at IS NULL;

-- Add comment
COMMENT ON COLUMN sms_campaigns.target_categories IS 
'Array of category names to target. NULL or empty array means send to all contacts.';

