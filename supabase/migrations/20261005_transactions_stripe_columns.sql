-- Finance: record the NET amount of Stripe payments and keep gross + fee +
-- Stripe identifiers on the transaction (needed for refunds, point 12).
--
-- transactions.amount keeps meaning "what the club actually receives":
--   for Stripe payments this is now net = gross - Stripe fee.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS gross_amount             numeric(10,2),
  ADD COLUMN IF NOT EXISTS stripe_fee               numeric(10,2),
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_session_id        text,
  ADD COLUMN IF NOT EXISTS stripe_refund_id         text,
  ADD COLUMN IF NOT EXISTS refund_of                uuid REFERENCES transactions(id) ON DELETE SET NULL,
  -- 'membership' | 'event' | 'merch' | 'career' — decides whether a refund is allowed
  ADD COLUMN IF NOT EXISTS source_type              text;

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_source_type_check;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_source_type_check
  CHECK (source_type IS NULL OR source_type IN ('membership', 'event', 'merch', 'career'));

-- Idempotency: Stripe retries webhooks, and the same PaymentIntent used to be
-- recorded by more than one handler. One payment row per PaymentIntent, one
-- refund row per Stripe refund.
CREATE UNIQUE INDEX IF NOT EXISTS transactions_stripe_payment_unique
  ON transactions (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL AND stripe_refund_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_stripe_refund_unique
  ON transactions (stripe_refund_id)
  WHERE stripe_refund_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS transactions_stripe_session_idx
  ON transactions (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- ── Backfill from what is already stored in the free-text note ──────────────
-- (no calls to Stripe: gross/fee are only filled where the note already has them)

-- PaymentIntent id, membership rows ("PaymentIntent: pi_… | User: …")
UPDATE transactions t
SET stripe_payment_intent_id = substring(t.note FROM '(pi_[A-Za-z0-9]+)'),
    source_type = 'membership'
FROM budget_categories c
WHERE c.id = t.category_id AND c.name = 'Membership'
  AND t.stripe_payment_intent_id IS NULL
  AND t.note ~ 'PaymentIntent: pi_[A-Za-z0-9]+';

-- Career Service rows already carry "Netto | Lordo | Commissioni Stripe | pi_…"
UPDATE transactions t
SET stripe_payment_intent_id = substring(t.note FROM '(pi_[A-Za-z0-9]+)'),
    gross_amount = substring(t.note FROM 'Lordo: €([0-9]+\.[0-9]+)')::numeric,
    stripe_fee   = substring(t.note FROM 'Commissioni Stripe: €([0-9]+\.[0-9]+)')::numeric,
    source_type  = 'career'
FROM budget_categories c
WHERE c.id = t.category_id AND c.name = 'Career Service'
  AND t.stripe_payment_intent_id IS NULL
  AND t.note ~ 'Lordo: €[0-9]+\.[0-9]+'
  AND t.note ~ 'pi_[A-Za-z0-9]+';

-- Older membership/merch rows recorded from a Checkout Session ("Stripe Session: cs_…")
UPDATE transactions t
SET stripe_session_id = substring(t.note FROM '(cs_[A-Za-z0-9_]+)'),
    source_type = CASE c.name WHEN 'Membership' THEN 'membership' WHEN 'Merch' THEN 'merch' END
FROM budget_categories c
WHERE c.id = t.category_id AND c.name IN ('Membership', 'Merch')
  AND t.stripe_session_id IS NULL
  AND t.note ~ 'Stripe Session: cs_';
