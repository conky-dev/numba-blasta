-- ============================================================================
-- DASHBOARD STATISTICS TABLE (Auto-updating with triggers)
-- ============================================================================
-- Real-time statistics that update automatically when messages are sent
-- Similar to contact_category_counts but for dashboard stats
-- ============================================================================

-- Drop existing materialized views if they exist
DROP MATERIALIZED VIEW IF EXISTS dashboard_stats_daily CASCADE;
DROP MATERIALIZED VIEW IF EXISTS dashboard_stats_summary CASCADE;
DROP FUNCTION IF EXISTS refresh_dashboard_stats() CASCADE;

-- Create statistics table
CREATE TABLE IF NOT EXISTS dashboard_stats (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  outbound_count INTEGER NOT NULL DEFAULT 0,
  inbound_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  total_cost_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_stats_org_date 
ON dashboard_stats (org_id, date DESC);

-- ============================================================================
-- TRIGGER FUNCTION: Auto-update stats when message is inserted
-- ============================================================================

CREATE OR REPLACE FUNCTION update_dashboard_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update stats for the day
  INSERT INTO dashboard_stats (
    org_id,
    date,
    outbound_count,
    inbound_count,
    failed_count,
    total_cost_cents
  ) VALUES (
    NEW.org_id,
    DATE(NEW.created_at),
    CASE WHEN NEW.direction = 'outbound' AND NEW.status IN ('sent', 'delivered', 'queued') THEN 1 ELSE 0 END,
    CASE WHEN NEW.direction = 'inbound' THEN 1 ELSE 0 END,
    CASE WHEN NEW.direction = 'outbound' AND NEW.status IN ('failed', 'undelivered') THEN 1 ELSE 0 END,
    CASE WHEN NEW.direction = 'outbound' THEN COALESCE(NEW.price_cents, 0) ELSE 0 END
  )
  ON CONFLICT (org_id, date) 
  DO UPDATE SET
    outbound_count = dashboard_stats.outbound_count + 
      CASE WHEN NEW.direction = 'outbound' AND NEW.status IN ('sent', 'delivered', 'queued') THEN 1 ELSE 0 END,
    inbound_count = dashboard_stats.inbound_count + 
      CASE WHEN NEW.direction = 'inbound' THEN 1 ELSE 0 END,
    failed_count = dashboard_stats.failed_count + 
      CASE WHEN NEW.direction = 'outbound' AND NEW.status IN ('failed', 'undelivered') THEN 1 ELSE 0 END,
    total_cost_cents = dashboard_stats.total_cost_cents + 
      CASE WHEN NEW.direction = 'outbound' THEN COALESCE(NEW.price_cents, 0) ELSE 0 END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Execute function after each message insert
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_dashboard_stats ON sms_messages;

CREATE TRIGGER trigger_update_dashboard_stats
AFTER INSERT ON sms_messages
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_stats();

-- ============================================================================
-- BACKFILL: Populate with existing data
-- ============================================================================

INSERT INTO dashboard_stats (org_id, date, outbound_count, inbound_count, failed_count, total_cost_cents)
SELECT 
  org_id,
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE direction = 'outbound' AND status IN ('sent', 'delivered', 'queued')) as outbound_count,
  COUNT(*) FILTER (WHERE direction = 'inbound') as inbound_count,
  COUNT(*) FILTER (WHERE direction = 'outbound' AND status IN ('failed', 'undelivered')) as failed_count,
  COALESCE(SUM(price_cents) FILTER (WHERE direction = 'outbound'), 0) as total_cost_cents
FROM sms_messages
GROUP BY org_id, DATE(created_at)
ON CONFLICT (org_id, date) 
DO UPDATE SET
  outbound_count = EXCLUDED.outbound_count,
  inbound_count = EXCLUDED.inbound_count,
  failed_count = EXCLUDED.failed_count,
  total_cost_cents = EXCLUDED.total_cost_cents,
  updated_at = NOW();

-- ============================================================================
-- HELPER: Get summary for a time range
-- ============================================================================

CREATE OR REPLACE FUNCTION get_dashboard_summary(
  p_org_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  outbound_count BIGINT,
  inbound_count BIGINT,
  failed_count BIGINT,
  total_cost_cents BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(ds.outbound_count), 0)::BIGINT,
    COALESCE(SUM(ds.inbound_count), 0)::BIGINT,
    COALESCE(SUM(ds.failed_count), 0)::BIGINT,
    COALESCE(SUM(ds.total_cost_cents), 0)::BIGINT
  FROM dashboard_stats ds
  WHERE ds.org_id = p_org_id
    AND ds.date >= CURRENT_DATE - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- NOTES:
-- - Stats update automatically when messages are inserted
-- - UPSERT pattern (ON CONFLICT) handles same-day updates
-- - Backfill populates historical data
-- - Query is instant (<5ms) using the indexed table
-- - No need for manual refreshes!
-- ============================================================================

