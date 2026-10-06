-- Career Service: mentor-centric model (Migration 1 of 3).
--
-- The "service" stops being a source of price, duration, hours and notification
-- contacts. A session is always 30 minutes with one mentor, at one price
-- (settings.career_session_price_cents), free for active members.
--
-- NOT touched, on purpose: career_services and career_bookings.service_id
-- (historical bookings keep pointing at their service), career_notification_contacts
-- (the table stays, the code stops reading it). career_availability.service_id and
-- career_bookings.service_id are already nullable: nothing to alter there.

-- ── 1. Single session price ──────────────────────────────────────────────────
-- Stored in cents as text (settings.value is text). 3000 = 30 EUR, editable from
-- /admin/settings. The server falls back to 3000 when the row is missing.
INSERT INTO settings (key, value)
VALUES ('career_session_price_cents', '3000')
ON CONFLICT (key) DO NOTHING;

-- ── 2. Cart suggestions: a Career suggestion no longer points at a service ───
-- It is resolved at read time to an active mentor with a free slot, so there is no
-- reference_id to store. (type stays 'career_service' to avoid touching the CHECK.)
ALTER TABLE cart_suggestions ALTER COLUMN reference_id DROP NOT NULL;

-- ── 3. Link mentors to their account (career_mentors.member_id) ──────────────
-- One member can be at most one mentor.
CREATE UNIQUE INDEX IF NOT EXISTS career_mentors_member_id_key
  ON career_mentors (member_id) WHERE member_id IS NOT NULL;

-- One-off backfill by email. After this the link is by member_id ONLY: mentors
-- can edit their notification_email, so the email must never be used as identity.
UPDATE career_mentors m
SET member_id = cm.id
FROM club_members cm
WHERE m.member_id IS NULL
  AND lower(cm.email) = lower(m.notification_email);

-- ── 4. Orphan availability (mentor_id IS NULL) ───────────────────────────────
-- These are the old per-service generic slots. The public page never showed them
-- (it always passes mentor_id). Checked before writing this: no foreign key points
-- at career_availability, and no booking falls inside one of these windows
-- (same service, same weekday/date, time inside the window). The guard below
-- re-checks it at apply time and aborts instead of deleting if that changed.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
  FROM career_bookings b
  JOIN career_availability a
    ON a.mentor_id IS NULL
   AND a.service_id = b.service_id
   AND ((a.type = 'recurring' AND a.day_of_week = extract(dow FROM b.slot_date))
        OR (a.type = 'one_time' AND a.date = b.slot_date))
   AND b.slot_time >= a.start_time AND b.slot_time < a.end_time;
  IF n > 0 THEN
    RAISE EXCEPTION 'career_availability orphan delete aborted: % booking(s) fall inside orphan windows', n;
  END IF;
END $$;

DELETE FROM career_availability WHERE mentor_id IS NULL;

-- Mentor availability no longer depends on a service.
UPDATE career_availability SET service_id = NULL WHERE mentor_id IS NOT NULL;

-- ── 5. Capacity: one booking per (mentor, date, time) ────────────────────────
-- The old trigger keyed on service_id; with service_id NULL its lock key becomes
-- NULL and its count matches nothing, so a slot would never read as full.
-- Capacity is now always 1 per mentor slot, whatever the service of old rows.
CREATE INDEX IF NOT EXISTS career_bookings_mentor_slot_idx
  ON career_bookings (mentor_id, slot_date, slot_time);

CREATE OR REPLACE FUNCTION public.career_bookings_enforce_capacity()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF new.mentor_id IS NULL THEN
    RAISE EXCEPTION 'mentor_required' USING errcode = 'P0001';
  END IF;

  -- Serialise concurrent inserts for the same mentor slot.
  PERFORM pg_advisory_xact_lock(
    hashtext(new.mentor_id::text || '|' || new.slot_date::text || '|' || new.slot_time::text)
  );

  IF EXISTS (
    SELECT 1 FROM career_bookings
    WHERE mentor_id = new.mentor_id
      AND slot_date = new.slot_date
      AND slot_time = new.slot_time
      AND status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'slot_full' USING errcode = 'P0001';
  END IF;

  RETURN new;
END;
$function$;

-- Apply together with the code deploy: the previous code inserts bookings without
-- a mentor (generic service slots), which this trigger now rejects.
--
-- Check after applying:
--   select key, value from settings where key = 'career_session_price_cents';  -- 3000
--   select full_name, member_id is not null as linked from career_mentors;      -- all true
--   select count(*) from career_availability where mentor_id is null;           -- 0
--   select count(*) from career_availability;                                   -- 3
