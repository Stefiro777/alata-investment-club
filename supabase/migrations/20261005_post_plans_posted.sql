-- PED calendar: per-post "posted / not posted" flag.
-- Independent from post_plans.status (draft / scheduled / published).
ALTER TABLE post_plans
  ADD COLUMN IF NOT EXISTS posted boolean NOT NULL DEFAULT false;
