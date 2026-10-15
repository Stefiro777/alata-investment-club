-- Replaces the CHECK ... NOT VALID of 20261015_applications_phone.sql.
-- A NOT VALID check is still evaluated on UPDATE, so the existing rows with a
-- free-form phone could no longer be edited, and a NULL phone passed it.
-- A BEFORE INSERT trigger validates only new rows: existing rows are untouched
-- and stay editable, NULL / malformed phones are rejected on insert.
-- Same format as lib/phone.ts normalizePhone(): optional "+", 6-15 digits.

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_telephone_format;

CREATE OR REPLACE FUNCTION public.applications_check_telephone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.telephone_number IS NULL OR NEW.telephone_number !~ '^\+?[0-9]{6,15}$' THEN
    RAISE EXCEPTION 'invalid telephone_number' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_check_telephone ON applications;
CREATE TRIGGER applications_check_telephone
  BEFORE INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION public.applications_check_telephone();
