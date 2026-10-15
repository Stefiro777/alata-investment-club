-- Club applications: telephone number is now mandatory on /join-us.
-- Additive only: existing rows are not touched (CHECK ... NOT VALID is
-- enforced on new inserts/updates only).

ALTER TABLE applications ADD COLUMN IF NOT EXISTS telephone_number text;

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_telephone_format;
ALTER TABLE applications
  ADD CONSTRAINT applications_telephone_format
  CHECK (telephone_number ~ '^\+?[0-9]{6,15}$') NOT VALID;
