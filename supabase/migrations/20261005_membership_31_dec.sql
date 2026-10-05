-- Membership: every annual fee expires on 31 December (Europe/Rome, 23:59:59).
--
-- 1. membership_settings: the renewal cutoff (default 1 October). Paying from
--    the cutoff of year N covers up to 31/12 of year N+1; paying earlier covers
--    up to 31/12 of year N. The expiry day itself (31/12) is fixed in code.
-- 2. club_members.membership_reminder_sent_for: expiry date a reminder was
--    already sent for, so reminders can be spread over time without repeats.
-- 3. Data: ALL existing expiries move to 31/12/2026 23:59:59 Europe/Rome.
--    Members with a NULL expiry are left untouched. The old dates (up to
--    Sept 2027) only reflected when each fee was collected: the 2026 fee was
--    already paid, so no compensation is computed.
--
-- Preview of what step 3 changes (read-only, run before applying):
--   SELECT full_name, email, membership_expires_at AS current_expiry,
--          ((timestamp '2026-12-31 23:59:59') AT TIME ZONE 'Europe/Rome') AS new_expiry,
--          ((timestamp '2026-12-31 23:59:59') AT TIME ZONE 'Europe/Rome')::date
--            - membership_expires_at::date AS days_delta
--   FROM club_members
--   WHERE membership_expires_at IS NOT NULL
--     AND membership_expires_at <> ((timestamp '2026-12-31 23:59:59') AT TIME ZONE 'Europe/Rome')
--   ORDER BY membership_expires_at;

-- 1 ─────────────────────────────────────────────────────────────────────────
ALTER TABLE membership_settings
  ADD COLUMN IF NOT EXISTS renewal_cutoff_month integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS renewal_cutoff_day   integer NOT NULL DEFAULT 1;

ALTER TABLE membership_settings
  DROP CONSTRAINT IF EXISTS membership_settings_cutoff_check;
ALTER TABLE membership_settings
  ADD CONSTRAINT membership_settings_cutoff_check
  CHECK (renewal_cutoff_month BETWEEN 1 AND 12 AND renewal_cutoff_day BETWEEN 1 AND 31);

-- 2 ─────────────────────────────────────────────────────────────────────────
ALTER TABLE club_members
  ADD COLUMN IF NOT EXISTS membership_reminder_sent_for timestamptz;

-- 3 ─────────────────────────────────────────────────────────────────────────
UPDATE club_members
SET membership_expires_at = (timestamp '2026-12-31 23:59:59') AT TIME ZONE 'Europe/Rome'
WHERE membership_expires_at IS NOT NULL
  AND membership_expires_at <> (timestamp '2026-12-31 23:59:59') AT TIME ZONE 'Europe/Rome';
