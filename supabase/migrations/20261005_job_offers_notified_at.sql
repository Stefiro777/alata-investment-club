-- /api/jobs/notify: one announcement per offer.
ALTER TABLE job_offers ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- Offers that already exist must never be announced again.
UPDATE job_offers SET notified_at = now() WHERE notified_at IS NULL;
