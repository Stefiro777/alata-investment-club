-- Career Service: pending_payment bookings hold a slot for 32 minutes only
-- (Migration 3 of 3, applied last, independent of the other two).
--
-- A booking in 'pending_payment' (card form opened, payment not completed) used to
-- occupy its slot forever. Now it stops counting after 32 minutes.
-- /api/career/slots and /api/career/book apply the same rule, and book also cancels
-- the stale PaymentIntent before re-using the slot so a late payment cannot
-- double-book it.
--
-- Requires Migration 1 (replaces the trigger function it defines).

CREATE OR REPLACE FUNCTION public.career_bookings_enforce_capacity()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF new.mentor_id IS NULL THEN
    RAISE EXCEPTION 'mentor_required' USING errcode = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(new.mentor_id::text || '|' || new.slot_date::text || '|' || new.slot_time::text)
  );

  IF EXISTS (
    SELECT 1 FROM career_bookings
    WHERE mentor_id = new.mentor_id
      AND slot_date = new.slot_date
      AND slot_time = new.slot_time
      AND status <> 'cancelled'
      AND NOT (status = 'pending_payment' AND created_at < now() - interval '32 minutes')
  ) THEN
    RAISE EXCEPTION 'slot_full' USING errcode = 'P0001';
  END IF;

  RETURN new;
END;
$function$;
