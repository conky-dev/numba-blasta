-- Add per-organization SMS sender tracking (toll-free or other numbers)
-- Tracks the primary sending number for an org and its verification status

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS sms_sender_number TEXT,
ADD COLUMN IF NOT EXISTS sms_sender_status TEXT DEFAULT 'none'
  CHECK (sms_sender_status IN ('none', 'awaiting_verification', 'verified', 'failed'));

COMMENT ON COLUMN organizations.sms_sender_number IS 'Primary SMS sending number assigned to this organization';
COMMENT ON COLUMN organizations.sms_sender_status IS 'Verification status of the org''s sending number: none, awaiting_verification, verified, failed';


