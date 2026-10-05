-- Membership: every annual fee expires on 31 December (Europe/Rome, 23:59:59),
-- plus the "remove member from membership" feature.
--
-- APPLY LAST (after every additive migration): step 4 rewrites all expiries.
--
-- 1. BACKUP of the current expiries, before anything changes.
-- 2. membership_settings: renewal cutoff (default 1 October). Paying from the
--    cutoff of year N covers up to 31/12 of year N+1; paying earlier covers up
--    to 31/12 of year N. The expiry day itself (31/12) is fixed in code.
-- 3. club_members: membership_reminder_sent_for (staggered reminders) and
--    membership_removed_at / membership_removed_by (removal from membership).
-- 4. Data: ALL existing non-NULL expiries move to 31/12/2026 23:59:59
--    Europe/Rome. NULL stays NULL. The old dates (up to Sept 2027) only
--    reflected when each fee was collected: the 2026 fee was already paid, so
--    no compensation is computed.
-- 5. is_events_manager(): a member removed from the membership loses the
--    team-based rights too (their club_members row, role and teams are kept).
--
-- Preview of what step 4 changes (read-only, run before applying):
--   SELECT full_name, email, membership_expires_at AS current_expiry,
--          ((timestamp '2026-12-31 23:59:59') AT TIME ZONE 'Europe/Rome') AS new_expiry,
--          ((timestamp '2026-12-31 23:59:59') AT TIME ZONE 'Europe/Rome')::date
--            - membership_expires_at::date AS days_delta
--   FROM club_members
--   WHERE membership_expires_at IS NOT NULL
--     AND membership_expires_at <> ((timestamp '2026-12-31 23:59:59') AT TIME ZONE 'Europe/Rome')
--   ORDER BY membership_expires_at;
--
-- Rollback of step 4:
--   UPDATE club_members m SET membership_expires_at = b.membership_expires_at
--   FROM club_members_expiry_backup_20261005 b WHERE b.id = m.id;

-- 1 ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS club_members_expiry_backup_20261005 AS
  SELECT id, membership_expires_at FROM club_members;
-- (IF NOT EXISTS: re-running the migration must never overwrite the backup.)
ALTER TABLE club_members_expiry_backup_20261005 ENABLE ROW LEVEL SECURITY; -- no policies: service role only

-- 2 ─────────────────────────────────────────────────────────────────────────
ALTER TABLE membership_settings
  ADD COLUMN IF NOT EXISTS renewal_cutoff_month integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS renewal_cutoff_day   integer NOT NULL DEFAULT 1;

ALTER TABLE membership_settings
  DROP CONSTRAINT IF EXISTS membership_settings_cutoff_check;
ALTER TABLE membership_settings
  ADD CONSTRAINT membership_settings_cutoff_check
  CHECK (renewal_cutoff_month BETWEEN 1 AND 12 AND renewal_cutoff_day BETWEEN 1 AND 31);

-- 3 ─────────────────────────────────────────────────────────────────────────
ALTER TABLE club_members
  ADD COLUMN IF NOT EXISTS membership_reminder_sent_for timestamptz,
  ADD COLUMN IF NOT EXISTS membership_removed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS membership_removed_by        uuid;  -- auth user id of whoever removed it

-- 4 ─────────────────────────────────────────────────────────────────────────
UPDATE club_members
SET membership_expires_at = (timestamp '2026-12-31 23:59:59') AT TIME ZONE 'Europe/Rome'
WHERE membership_expires_at IS NOT NULL
  AND membership_expires_at <> (timestamp '2026-12-31 23:59:59') AT TIME ZONE 'Europe/Rome';

-- 5 ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_events_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.email() = 'finullistefano@gmail.com'
      OR EXISTS (
        SELECT 1 FROM club_members cm
        WHERE cm.email = auth.email()
          AND cm.membership_removed_at IS NULL
          AND (cm.role IN ('bod', 'director') OR 'events' = ANY (COALESCE(cm.teams, '{}')))
      );
$$;
