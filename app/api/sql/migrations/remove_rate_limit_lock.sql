-- Remove FOR UPDATE lock from increment_phone_rate_limit to prevent deadlocks
-- Rate limit doesn't need to be perfectly accurate, just approximately enforced

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
  -- Get current rate limit data (NO LOCK - allow concurrent reads)
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
  -- REMOVED: FOR UPDATE
  
  -- If phone number not found, fail
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Phone number % not found', p_phone_number;
  END IF;
  
  -- Check if window needs to be reset (expired or first message)
  IF v_rate_limit_window_start IS NULL 
     OR v_rate_limit_window_start + (v_rate_limit_window_hours || ' hours')::INTERVAL < NOW() THEN
    -- Reset window (non-blocking, may race but that's OK)
    UPDATE phone_numbers
    SET 
      rate_limit_current_count = p_message_count,
      rate_limit_window_start = NOW(),
      updated_at = NOW()
    WHERE phone_number = p_phone_number;
    
    RETURN TRUE;
  END IF;
  
  -- Check if limit would be exceeded
  IF v_rate_limit_current_count + p_message_count > v_rate_limit_max THEN
    RETURN FALSE; -- Limit exceeded
  END IF;
  
  -- Increment counter (non-blocking, may have minor race conditions but that's acceptable)
  UPDATE phone_numbers
  SET 
    rate_limit_current_count = rate_limit_current_count + p_message_count,
    updated_at = NOW()
  WHERE phone_number = p_phone_number;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Verify the change
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'increment_phone_rate_limit';

