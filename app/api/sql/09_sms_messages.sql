-- ============================================================================
-- SMS MESSAGES TABLE
-- ============================================================================
-- Stores all SMS messages (both inbound and outbound) with delivery tracking
-- Reference: specs/api.md - SMS Operations section
-- ============================================================================

-- Create sms_messages table
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Message details
  to_number VARCHAR(20) NOT NULL, -- E.164 format
  from_number VARCHAR(20), -- E.164 format or short code
  body TEXT NOT NULL,
  
  -- Direction and status
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status VARCHAR(20) NOT NULL DEFAULT 'queued' 
    CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'undelivered', 'received')),
  
  -- Cost tracking
  price_cents INTEGER DEFAULT 0, -- Cost in cents (e.g., 1 cent = 100)
  segments INTEGER DEFAULT 1, -- Number of SMS segments
  
  -- Twilio integration
  provider_sid VARCHAR(255) UNIQUE, -- Twilio MessageSid
  provider_status VARCHAR(50), -- Raw status from Twilio
  
  -- Campaign/Template association
  campaign_id UUID REFERENCES sms_campaigns(id) ON DELETE SET NULL,
  template_id UUID REFERENCES sms_templates(id) ON DELETE SET NULL,
  
  -- Error tracking
  error_code VARCHAR(20),
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Store extra data (e.g., variables used, scheduled time)
  
  -- Timestamps
  sent_at TIMESTAMPTZ, -- When actually sent to provider
  delivered_at TIMESTAMPTZ, -- When delivered to recipient
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_messages_org_id ON sms_messages(org_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_contact_id ON sms_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_campaign_id ON sms_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_provider_sid ON sms_messages(provider_sid);
CREATE INDEX IF NOT EXISTS idx_sms_messages_to_number ON sms_messages(to_number);
CREATE INDEX IF NOT EXISTS idx_sms_messages_status ON sms_messages(status);
CREATE INDEX IF NOT EXISTS idx_sms_messages_direction ON sms_messages(direction);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_sms_messages_org_direction_status 
  ON sms_messages(org_id, direction, status, created_at DESC);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_sms_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sms_messages_updated_at
  BEFORE UPDATE ON sms_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_messages_updated_at();

-- ============================================================================
-- DELIVERY EVENTS TABLE
-- ============================================================================
-- Tracks all status updates and delivery events for messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS delivery_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES sms_messages(id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(50) NOT NULL, -- e.g., 'queued', 'sent', 'delivered', 'failed', 'undelivered'
  event_status VARCHAR(50), -- Provider-specific status
  
  -- Provider data
  provider_data JSONB DEFAULT '{}'::jsonb, -- Full webhook payload from Twilio
  
  -- Error tracking (if applicable)
  error_code VARCHAR(20),
  error_message TEXT,
  
  -- Timestamps
  received_at TIMESTAMPTZ DEFAULT NOW(),
  event_timestamp TIMESTAMPTZ -- Timestamp from provider
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_events_message_id ON delivery_events(message_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_event_type ON delivery_events(event_type);
CREATE INDEX IF NOT EXISTS idx_delivery_events_received_at ON delivery_events(received_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to count segments based on message length
-- (Simplified version - actual SMS segmentation is more complex with GSM-7/UCS-2)
CREATE OR REPLACE FUNCTION calculate_sms_segments(message_text TEXT)
RETURNS INTEGER AS $$
DECLARE
  message_length INTEGER;
  segment_size INTEGER := 160;
  multipart_size INTEGER := 153;
BEGIN
  message_length := LENGTH(message_text);
  
  IF message_length = 0 THEN
    RETURN 0;
  ELSIF message_length <= segment_size THEN
    RETURN 1;
  ELSE
    -- Multi-part messages
    RETURN CEILING(message_length::DECIMAL / multipart_size);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate message cost (in cents)
-- Current rate: $0.01 per segment = 1 cent
CREATE OR REPLACE FUNCTION calculate_message_cost(segments INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN segments * 1; -- 1 cent per segment
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE sms_messages IS 'Stores all SMS messages (inbound and outbound) with delivery tracking';
COMMENT ON COLUMN sms_messages.direction IS 'Message direction: inbound (received) or outbound (sent)';
COMMENT ON COLUMN sms_messages.status IS 'Current status: queued, sent, delivered, failed, undelivered, received';
COMMENT ON COLUMN sms_messages.price_cents IS 'Cost in cents (e.g., 100 = $1.00, 1 = $0.01)';
COMMENT ON COLUMN sms_messages.segments IS 'Number of SMS segments (160 chars per segment for single, 153 for multi-part)';
COMMENT ON COLUMN sms_messages.provider_sid IS 'Twilio MessageSid for tracking';
COMMENT ON COLUMN sms_messages.metadata IS 'Additional data: variables used, scheduled time, user agent, etc.';

COMMENT ON TABLE delivery_events IS 'Tracks all status updates and events for SMS messages';
COMMENT ON COLUMN delivery_events.provider_data IS 'Full webhook payload from Twilio for debugging';

-- ============================================================================
-- EXAMPLE USAGE
-- ============================================================================
/*

-- Calculate segments for a message
SELECT calculate_sms_segments('Hello, this is a test message!'); -- Returns 1
SELECT calculate_sms_segments('This is a much longer message that will span multiple SMS segments because it exceeds the 160 character limit for a single SMS message and will need to be split into multiple parts'); -- Returns 2

-- Calculate cost
SELECT calculate_message_cost(1); -- Returns 1 (1 cent)
SELECT calculate_message_cost(3); -- Returns 3 (3 cents)

-- Insert a new outbound message
INSERT INTO sms_messages (
  org_id,
  contact_id,
  to_number,
  from_number,
  body,
  direction,
  status,
  segments,
  price_cents,
  created_by
) VALUES (
  'org-uuid-here',
  'contact-uuid-here',
  '+12025551234',
  '+18005551234',
  'Hello, this is a test message!',
  'outbound',
  'queued',
  1,
  1,
  'user-uuid-here'
);

-- Query recent outbound messages for an org
SELECT 
  id,
  to_number,
  body,
  status,
  segments,
  price_cents,
  created_at
FROM sms_messages
WHERE org_id = 'org-uuid-here'
  AND direction = 'outbound'
ORDER BY created_at DESC
LIMIT 20;

-- Get delivery timeline for a message
SELECT 
  m.id,
  m.to_number,
  m.status AS current_status,
  json_agg(
    json_build_object(
      'event_type', de.event_type,
      'event_status', de.event_status,
      'received_at', de.received_at
    ) ORDER BY de.received_at
  ) AS events
FROM sms_messages m
LEFT JOIN delivery_events de ON de.message_id = m.id
WHERE m.id = 'message-uuid-here'
GROUP BY m.id, m.to_number, m.status;

*/

