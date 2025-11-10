-- admins table
-- Tracks which users have administrative privileges
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin', -- 'admin', 'super_admin', etc.
  permissions JSONB, -- Flexible field for granular permissions
  granted_by UUID REFERENCES auth.users(id), -- Which admin granted this privilege
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_admin_user UNIQUE (user_id)
);

-- Index for faster lookups
CREATE INDEX idx_admins_user_id ON admins(user_id);
CREATE INDEX idx_admins_role ON admins(role);

-- Enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only admins can view the admin table
CREATE POLICY "Admins can view admin table"
  ON admins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
    )
  );

-- Only super admins can modify admin table (enforce in API layer)
CREATE POLICY "Super admins can update admin table"
  ON admins
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function to check if a user is an admin (call from API)
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if a user is a super admin (call from API)
CREATE OR REPLACE FUNCTION is_super_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = check_user_id AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

