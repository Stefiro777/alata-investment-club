-- Members-only events: only verified members (active club_members membership)
-- can register. Enforced server-side by /api/event-registrations and /api/checkout.
-- Additive: existing events keep members_only = false.

ALTER TABLE upcoming_events
  ADD COLUMN IF NOT EXISTS members_only boolean NOT NULL DEFAULT false;
