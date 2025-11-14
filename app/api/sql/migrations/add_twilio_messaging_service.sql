-- Add Twilio Messaging Service SID to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS twilio_messaging_service_sid TEXT;

COMMENT ON COLUMN organizations.twilio_messaging_service_sid IS 'Twilio Messaging Service SID for this organization';

