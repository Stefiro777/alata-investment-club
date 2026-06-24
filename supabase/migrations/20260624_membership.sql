-- 1. Add membership expiry to club_members
ALTER TABLE club_members
  ADD COLUMN IF NOT EXISTS membership_expires_at timestamptz;

-- Set all existing members to expire end of 2026
UPDATE club_members
  SET membership_expires_at = '2026-12-31 23:59:59+00'
  WHERE membership_expires_at IS NULL;

-- 2. Membership settings (single-row config)
CREATE TABLE IF NOT EXISTS membership_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_cents int  NOT NULL DEFAULT 2000,
  stripe_price_id text,
  description text,
  updated_at  timestamptz DEFAULT now()
);

-- Seed default row
INSERT INTO membership_settings (price_cents, description)
VALUES (2000, 'Quota annuale membership Alata Investment Club')
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE membership_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membership_settings_select_auth"
  ON membership_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can update (no policy needed — service role bypasses RLS)

-- 3. Ensure Membership budget category exists
INSERT INTO budget_categories (name, type)
VALUES ('Membership', 'revenue')
ON CONFLICT DO NOTHING;
