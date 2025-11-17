-- ============================================================================
-- PRICING TABLE
-- ============================================================================
-- Stores pricing information for SMS services
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Service type
  service_type TEXT NOT NULL UNIQUE,
  
  -- Pricing details
  price_per_unit DECIMAL(10, 4) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  unit TEXT DEFAULT 'message', -- 'message', 'character', 'number', etc.
  
  -- Metadata
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing
INSERT INTO pricing (service_type, price_per_unit, currency, unit, description, is_active) VALUES
  ('inbound_message', 0.005, 'USD', 'message', 'Cost per inbound SMS message', true),
  ('outbound_message', 0.0075, 'USD', 'message', 'Cost per outbound SMS message (under 140 chars)', true),
  ('outbound_message_long', 0.015, 'USD', 'message', 'Cost per outbound SMS message (over 140 chars, 2+ segments)', true),
  ('buy_phone_number', 5.00, 'USD', 'number', 'One-time cost to purchase a phone number', true)
ON CONFLICT (service_type) DO UPDATE
SET
  price_per_unit = EXCLUDED.price_per_unit,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Index for active pricing lookups
CREATE INDEX IF NOT EXISTS idx_pricing_service_type ON pricing(service_type) WHERE is_active = true;

COMMENT ON TABLE pricing IS 'Stores pricing information for SMS services';
COMMENT ON COLUMN pricing.service_type IS 'Type of service: inbound_message, outbound_message, outbound_message_long, buy_phone_number';
COMMENT ON COLUMN pricing.price_per_unit IS 'Price per unit in the specified currency';

