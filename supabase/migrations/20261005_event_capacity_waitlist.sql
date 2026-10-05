-- Event capacity, sold out, waitlist and timed seat reservations (point 10).
--
-- Seats taken = registrations that are not refunded/cancelled (paid + free)
--             + ACTIVE reservations (Stripe checkouts in progress).
-- Every capacity decision is taken inside a SQL function that locks the event
-- row, so two simultaneous requests can never both take the last seat.
--
-- ⚠ Two existing policies are removed because they would let anyone bypass the
-- capacity (and edit it): see section 7.

-- 1. Capacity: NULL = unlimited ─────────────────────────────────────────────
ALTER TABLE upcoming_events ADD COLUMN IF NOT EXISTS capacity integer;
ALTER TABLE upcoming_events DROP CONSTRAINT IF EXISTS upcoming_events_capacity_check;
ALTER TABLE upcoming_events
  ADD CONSTRAINT upcoming_events_capacity_check CHECK (capacity IS NULL OR capacity > 0);

-- 2. Who can manage events / the waitlist ───────────────────────────────────
-- events team, bod, director and the superadmin (same rule as requireTeamAccess('events')).
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
          AND (cm.role IN ('bod', 'director') OR 'events' = ANY (COALESCE(cm.teams, '{}')))
      );
$$;

-- 3. Timed seat reservations for Stripe checkouts ───────────────────────────
-- expires_at is aligned with the Checkout Session's expires_at. Removed when the
-- payment completes (checkout.session.completed) or the session expires
-- (checkout.session.expired); an unconsumed row simply stops counting after
-- expires_at. Only the server (service role) touches this table.
CREATE TABLE IF NOT EXISTS event_seat_reservations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          uuid NOT NULL REFERENCES upcoming_events(id) ON DELETE CASCADE,
  seats             integer NOT NULL CHECK (seats > 0),
  stripe_session_id text,
  expires_at        timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_seat_reservations_event_idx
  ON event_seat_reservations (event_id, expires_at);
-- One session can hold seats on several events (multi-event cart), once each.
CREATE UNIQUE INDEX IF NOT EXISTS event_seat_reservations_session_event_unique
  ON event_seat_reservations (stripe_session_id, event_id)
  WHERE stripe_session_id IS NOT NULL;
ALTER TABLE event_seat_reservations ENABLE ROW LEVEL SECURITY; -- no policies: service role only

-- 4. Waitlist ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_waitlist (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES upcoming_events(id) ON DELETE CASCADE,
  nome         text NOT NULL,
  cognome      text NOT NULL,
  email        text NOT NULL,
  telefono     text,
  status       text NOT NULL DEFAULT 'waiting'
               CHECK (status IN ('waiting', 'contacted', 'converted', 'removed')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  contacted_at timestamptz
);

-- One active waitlist entry per person per event.
CREATE UNIQUE INDEX IF NOT EXISTS event_waitlist_active_unique
  ON event_waitlist (event_id, lower(email))
  WHERE status IN ('waiting', 'contacted');
-- Arrival order is the order the team sees.
CREATE INDEX IF NOT EXISTS event_waitlist_event_order_idx
  ON event_waitlist (event_id, created_at);

-- 5. Seat counting ──────────────────────────────────────────────────────────
-- Internal: seats taken right now (no locking).
CREATE OR REPLACE FUNCTION public.event_seats_taken(p_event_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM event_registrations r
      WHERE r.event_id = p_event_id
        AND COALESCE(r.status, 'free') NOT IN ('refunded', 'cancelled'))::integer
    +
    COALESCE((SELECT sum(seats) FROM event_seat_reservations s
      WHERE s.event_id = p_event_id AND s.expires_at > now()), 0)::integer;
$$;

CREATE OR REPLACE FUNCTION public.event_is_sold_out(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT e.capacity IS NOT NULL AND public.event_seats_taken(e.id) >= e.capacity
       FROM upcoming_events e WHERE e.id = p_event_id),
    false);
$$;

-- Public, read-only: availability of every event (no personal data).
CREATE OR REPLACE FUNCTION public.get_event_availability()
RETURNS TABLE (event_id uuid, capacity integer, taken integer, sold_out boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id,
         e.capacity,
         public.event_seats_taken(e.id),
         (e.capacity IS NOT NULL AND public.event_seats_taken(e.id) >= e.capacity)
  FROM upcoming_events e;
$$;
GRANT EXECUTE ON FUNCTION public.get_event_availability() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_is_sold_out(uuid) TO anon, authenticated;

-- 6. Atomic operations (service role only) ──────────────────────────────────
-- Free registrations: check capacity and insert the rows in ONE transaction.
-- p_rows: array of {nome, cognome, email, telefono, anno_di_studio, motivazione,
-- questions_for_panelists}. Raises 'event_full' when the seats are not there.
CREATE OR REPLACE FUNCTION public.register_event_seats(p_event_id uuid, p_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity integer;
  v_n        integer := jsonb_array_length(p_rows);
BEGIN
  IF v_n IS NULL OR v_n = 0 THEN RETURN 0; END IF;

  -- The row lock serialises every seat decision for this event.
  SELECT capacity INTO v_capacity FROM upcoming_events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_not_found' USING ERRCODE = 'P0002'; END IF;

  IF v_capacity IS NOT NULL AND public.event_seats_taken(p_event_id) + v_n > v_capacity THEN
    RAISE EXCEPTION 'event_full' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO event_registrations
    (event_id, nome, cognome, email, telefono, anno_di_studio, motivazione, questions_for_panelists)
  SELECT p_event_id,
         r->>'nome', r->>'cognome', r->>'email', r->>'telefono',
         COALESCE(r->>'anno_di_studio', 'N/A'), r->>'motivazione', r->>'questions_for_panelists'
  FROM jsonb_array_elements(p_rows) AS r;

  RETURN v_n;
END;
$$;

-- Paid checkouts: hold the seats for p_minutes (aligned with the Stripe session).
CREATE OR REPLACE FUNCTION public.reserve_event_seats(p_event_id uuid, p_seats integer, p_minutes integer)
RETURNS TABLE (reservation_id uuid, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity integer;
  v_id       uuid;
  v_expires  timestamptz := now() + make_interval(mins => p_minutes);
BEGIN
  IF p_seats IS NULL OR p_seats < 1 THEN RAISE EXCEPTION 'invalid_seats'; END IF;

  SELECT capacity INTO v_capacity FROM upcoming_events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_not_found' USING ERRCODE = 'P0002'; END IF;

  -- Housekeeping: reservations expired for more than a day are just noise.
  DELETE FROM event_seat_reservations s
   WHERE s.event_id = p_event_id AND s.expires_at < now() - interval '1 day';

  IF v_capacity IS NOT NULL AND public.event_seats_taken(p_event_id) + p_seats > v_capacity THEN
    RAISE EXCEPTION 'event_full' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO event_seat_reservations (event_id, seats, expires_at)
  VALUES (p_event_id, p_seats, v_expires)
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_expires;
END;
$$;

REVOKE ALL ON FUNCTION public.register_event_seats(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_event_seats(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_event_seats(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_event_seats(uuid, integer, integer) TO service_role;

-- 7. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE event_waitlist ENABLE ROW LEVEL SECURITY;

-- Public sign-up, validated: only for events that are actually sold out, only
-- as 'waiting', with bounded fields and a sane email.
DROP POLICY IF EXISTS "Public can join waitlist" ON event_waitlist;
CREATE POLICY "Public can join waitlist"
  ON event_waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'waiting'
    AND contacted_at IS NULL
    AND char_length(btrim(nome))    BETWEEN 1 AND 100
    AND char_length(btrim(cognome)) BETWEEN 1 AND 100
    AND char_length(email) <= 254
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND (telefono IS NULL OR char_length(telefono) <= 40)
    AND public.event_is_sold_out(event_id)
  );

-- Reading and managing the list: events team, bod, director, superadmin.
DROP POLICY IF EXISTS "Events managers read waitlist" ON event_waitlist;
CREATE POLICY "Events managers read waitlist"
  ON event_waitlist FOR SELECT TO authenticated
  USING (public.is_events_manager());

DROP POLICY IF EXISTS "Events managers update waitlist" ON event_waitlist;
CREATE POLICY "Events managers update waitlist"
  ON event_waitlist FOR UPDATE TO authenticated
  USING (public.is_events_manager()) WITH CHECK (public.is_events_manager());

DROP POLICY IF EXISTS "Events managers delete waitlist" ON event_waitlist;
CREATE POLICY "Events managers delete waitlist"
  ON event_waitlist FOR DELETE TO authenticated
  USING (public.is_events_manager());

-- Existing policies that defeat the capacity (verified: no browser client
-- inserts into event_registrations, every insert goes through service-role routes):
--  * event_registrations "Public insert registrations" (WITH CHECK true) let
--    anyone insert straight through the anon key, skipping every check.
--  * upcoming_events "Admin all upcoming_events" (ALL, USING true, role public)
--    let ANYONE, logged in or not, update/delete events, capacity included.
DROP POLICY IF EXISTS "Public insert registrations" ON event_registrations;
DROP POLICY IF EXISTS "Admin all upcoming_events" ON upcoming_events;

CREATE POLICY "Events managers manage upcoming_events"
  ON upcoming_events FOR ALL
  TO authenticated
  USING (public.is_events_manager())
  WITH CHECK (public.is_events_manager());
-- ("Public read upcoming_events" stays: the events pages are public.)
