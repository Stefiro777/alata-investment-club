-- Job offers: per-offer application email + creator access to applications.
--
-- 1. job_offers.application_email  — where new-application notifications go
--    (the creator's email by default; the form makes it mandatory).
-- 2. job_applications.read_at / notified_at — read flag for the creator and an
--    idempotency marker so one application never triggers two emails.
-- 3. RLS: until now job_applications only had INSERT and DELETE policies, so
--    SELECT/UPDATE from a user session returned nothing / updated nothing (the
--    status dropdown in /admin/jobs silently did nothing: all rows are still
--    'pending'). Add SELECT/UPDATE for: the offer's creator, bod/director and
--    the superadmin.
-- 4. A guard trigger so that anyone updating through RLS can only touch
--    status, read_at and archived (service-role calls are not restricted).
-- 5. Fix the DELETE policy: it listed the role 'management', which does not
--    exist in club_members.role (the DB value is 'director').

-- 1 ─────────────────────────────────────────────────────────────────────────
ALTER TABLE job_offers ADD COLUMN IF NOT EXISTS application_email text;

UPDATE job_offers jo
SET application_email = cm.email
FROM club_members cm
WHERE cm.user_id = jo.created_by
  AND jo.application_email IS NULL;

-- 2 ─────────────────────────────────────────────────────────────────────────
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS read_at     timestamptz,
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- Applications already in the table must not be (re)notified.
UPDATE job_applications SET notified_at = now() WHERE notified_at IS NULL;

-- 3 ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_manage_job_application(offer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.email() = 'finullistefano@gmail.com'
    OR EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.email = auth.email() AND cm.role IN ('bod', 'director')
    )
    OR EXISTS (
      SELECT 1 FROM job_offers jo
      WHERE jo.id = offer_id AND jo.created_by = auth.uid()
    );
$$;

DROP POLICY IF EXISTS "Managers can read job applications" ON job_applications;
CREATE POLICY "Managers can read job applications"
  ON job_applications FOR SELECT
  TO authenticated
  USING (public.can_manage_job_application(job_offer_id));

DROP POLICY IF EXISTS "Managers can update job applications" ON job_applications;
CREATE POLICY "Managers can update job applications"
  ON job_applications FOR UPDATE
  TO authenticated
  USING (public.can_manage_job_application(job_offer_id))
  WITH CHECK (public.can_manage_job_application(job_offer_id));

-- 4 ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.job_applications_guard_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- auth.uid() is NULL for service-role / SQL-editor calls: unrestricted.
  IF auth.uid() IS NOT NULL THEN
    IF (NEW.job_offer_id, NEW.job_title, NEW.first_name, NEW.last_name, NEW.email,
        NEW.phone, NEW.linkedin_url, NEW.cover_letter, NEW.cv_url, NEW.cv_filename,
        NEW.submitted_at, NEW.notified_at)
       IS DISTINCT FROM
       (OLD.job_offer_id, OLD.job_title, OLD.first_name, OLD.last_name, OLD.email,
        OLD.phone, OLD.linkedin_url, OLD.cover_letter, OLD.cv_url, OLD.cv_filename,
        OLD.submitted_at, OLD.notified_at)
    THEN
      RAISE EXCEPTION 'Only status, read_at and archived can be updated';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS job_applications_guard_update ON job_applications;
CREATE TRIGGER job_applications_guard_update
  BEFORE UPDATE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION public.job_applications_guard_update();

-- 5 ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "BoD and management can delete" ON job_applications;
CREATE POLICY "BoD and management can delete"
  ON job_applications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.email = auth.email()
        AND club_members.role IN ('bod', 'director')
    )
  );
