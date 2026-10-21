-- Members-only discount codes: only an authenticated user with an ACTIVE club
-- membership can apply them. Enforced server-side by /api/discount-codes/validate
-- and again by /api/checkout. Additive: existing codes stay public.

ALTER TABLE discount_codes
  ADD COLUMN IF NOT EXISTS members_only boolean NOT NULL DEFAULT false;
