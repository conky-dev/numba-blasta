-- ============================================================================
-- ADD RATE LIMITING TO PHONE NUMBERS
-- ============================================================================
-- Adds columns to track message rate limiting per phone number
-- Implements 20,000 messages per phone number on a 24-hour rolling basis
-- ============================================================================

-- Add rate limiting columns
ALTER TABLE phone_numbers
ADD COLUMN IF NOT EXISTS rate_limit_max INTEGER DEFAULT 20000,
ADD COLUMN IF NOT EXISTS rate_limit_window_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS rate_limit_current_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rate_limit_window_start TIMESTAMPTZ;

-- Add index for fast rate limit checks
CREATE INDEX IF NOT EXISTS idx_phone_numbers_rate_limit 
  ON phone_numbers(phone_number, rate_limit_window_start)
  WHERE rate_limit_window_start IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN phone_numbers.rate_limit_max IS 'Maximum number of messages allowed per rolling window (default: 20,000)';
COMMENT ON COLUMN phone_numbers.rate_limit_window_hours IS 'Rolling window duration in hours (default: 24)';
COMMENT ON COLUMN phone_numbers.rate_limit_current_count IS 'Current message count in the active window';
COMMENT ON COLUMN phone_numbers.rate_limit_window_start IS 'Start timestamp of the current rate limit window';

-- ============================================================================
-- HELPER FUNCTION: Check if phone number is within rate limit
-- ============================================================================
CREATE OR REPLACE FUNCTION check_phone_rate_limit(p_phone_number TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_rate_limit_max INTEGER;
  v_rate_limit_window_hours INTEGER;
  v_rate_limit_current_count INTEGER;
  v_rate_limit_window_start TIMESTAMPTZ;
BEGIN
  -- Get current rate limit data
  SELECT 
    rate_limit_max,
    rate_limit_window_hours,
    rate_limit_current_count,
    rate_limit_window_start
  INTO
    v_rate_limit_max,
    v_rate_limit_window_hours,
    v_rate_limit_current_count,
    v_rate_limit_window_start
  FROM phone_numbers
  WHERE phone_number = p_phone_number;
  
  -- If phone number not found, deny
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- If no window started yet, allow (first message)
  IF v_rate_limit_window_start IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if current window has expired
  IF v_rate_limit_window_start + (v_rate_limit_window_hours || ' hours')::INTERVAL < NOW() THEN
    -- Window expired, allow (will be reset on increment)
    RETURN TRUE;
  END IF;
  
  -- Check if under limit
  RETURN v_rate_limit_current_count < v_rate_limit_max;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Increment phone number rate limit counter
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_phone_rate_limit(
  p_phone_number TEXT,
  p_message_count INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_rate_limit_max INTEGER;
  v_rate_limit_window_hours INTEGER;
  v_rate_limit_current_count INTEGER;
  v_rate_limit_window_start TIMESTAMPTZ;
BEGIN
  -- Get current rate limit data
  SELECT 
    rate_limit_max,
    rate_limit_window_hours,
    rate_limit_current_count,
    rate_limit_window_start
  INTO
    v_rate_limit_max,
    v_rate_limit_window_hours,
    v_rate_limit_current_count,
    v_rate_limit_window_start
  FROM phone_numbers
  WHERE phone_number = p_phone_number
  FOR UPDATE; -- Lock row to prevent race conditions
  
  -- If phone number not found, fail
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Phone number % not found', p_phone_number;
  END IF;
  
  -- Check if window needs to be reset (expired or first message)
  IF v_rate_limit_window_start IS NULL 
     OR v_rate_limit_window_start + (v_rate_limit_window_hours || ' hours')::INTERVAL < NOW() THEN
    -- Reset window
    UPDATE phone_numbers
    SET 
      rate_limit_current_count = p_message_count,
      rate_limit_window_start = NOW(),
      updated_at = NOW()
    WHERE phone_number = p_phone_number;
    
    RETURN TRUE;
  END IF;
  
  -- Check if incrementing would exceed limit
  IF v_rate_limit_current_count + p_message_count > v_rate_limit_max THEN
    RETURN FALSE; -- Would exceed limit
  END IF;
  
  -- Increment counter
  UPDATE phone_numbers
  SET 
    rate_limit_current_count = rate_limit_current_count + p_message_count,
    updated_at = NOW()
  WHERE phone_number = p_phone_number;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get remaining messages for a phone number
-- ============================================================================
CREATE OR REPLACE FUNCTION get_phone_remaining_messages(p_phone_number TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_rate_limit_max INTEGER;
  v_rate_limit_window_hours INTEGER;
  v_rate_limit_current_count INTEGER;
  v_rate_limit_window_start TIMESTAMPTZ;
BEGIN
  -- Get current rate limit data
  SELECT 
    rate_limit_max,
    rate_limit_window_hours,
    rate_limit_current_count,
    rate_limit_window_start
  INTO
    v_rate_limit_max,
    v_rate_limit_window_hours,
    v_rate_limit_current_count,
    v_rate_limit_window_start
  FROM phone_numbers
  WHERE phone_number = p_phone_number;
  
  -- If phone number not found, return 0
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- If no window started yet or window expired, return max
  IF v_rate_limit_window_start IS NULL 
     OR v_rate_limit_window_start + (v_rate_limit_window_hours || ' hours')::INTERVAL < NOW() THEN
    RETURN v_rate_limit_max;
  END IF;
  
  -- Return remaining messages
  RETURN GREATEST(0, v_rate_limit_max - v_rate_limit_current_count);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Reset rate limit for a phone number (admin use)
-- ============================================================================
CREATE OR REPLACE FUNCTION reset_phone_rate_limit(p_phone_number TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE phone_numbers
  SET 
    rate_limit_current_count = 0,
    rate_limit_window_start = NULL,
    updated_at = NOW()
  WHERE phone_number = p_phone_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Example Usage:
-- ============================================================================
-- Check if phone can send messages:
--   SELECT check_phone_rate_limit('+18553681703');
--
-- Increment counter when sending messages:
--   SELECT increment_phone_rate_limit('+18553681703', 1); -- Single message
--   SELECT increment_phone_rate_limit('+18553681703', 100); -- Batch of 100
--
-- Get remaining messages:
--   SELECT get_phone_remaining_messages('+18553681703');
--
-- Reset rate limit (admin):
--   SELECT reset_phone_rate_limit('+18553681703');
-- ============================================================================

