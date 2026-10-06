-- Career Service RLS lockdown (Migration 2 of 3).
--
-- Policies open to the `public` role (anon key, no login needed):
--   career_bookings  : "Public read own booking" (USING true) exposes every booking
--                      (name, email, motivation, goal, CV path); "Admin update" and
--                      "Admin delete" (USING true) let anyone cancel/delete them;
--                      "Public insert" (WITH CHECK true) lets anyone skip the API
--                      (price, capacity checks) and insert directly.
--   career_availability / career_notification_contacts : insert/update/delete open.
--   settings         : "Authenticated can update settings" lets ANY logged-in user
--                      write any setting. With the session price now in settings
--                      (career_session_price_cents) that would mean booking for 0.
--
-- Dependency check (every access found in the code):
--   * Bookings, availability and mentors are now read/written only through
--     /api/career/* with the service role (bypasses RLS), including the dashboard
--     tabs and the new /dashboard/career/me page: nothing in the browser needs
--     these policies any more.
--   * The one browser read left is app/admin/analytics/page.tsx on career_bookings,
--     gated to privileged roles; "career_bookings_team_select"
--     (is_privileged() OR is_in_team('career')) stays and covers it.
--   * settings writes from the browser (/admin/settings) are done by bod/director,
--     covered by "Allow admin write settings" which stays; public reads stay.
--
-- RELEASE ORDER: apply this AFTER the code that moves the Availability/Bookings tabs
-- to the API is deployed (the old tabs read/write these tables from the browser and
-- stop working for non-privileged career team members once this runs).

-- career_bookings: keep only career_bookings_team_select.
DROP POLICY IF EXISTS "Public read own booking"       ON career_bookings;
DROP POLICY IF EXISTS "Admin update career_bookings"  ON career_bookings;
DROP POLICY IF EXISTS "Admin delete career_bookings"  ON career_bookings;
DROP POLICY IF EXISTS "Public insert career_bookings" ON career_bookings;

-- career_availability: no browser access left; service role only.
DROP POLICY IF EXISTS "Public read career_availability"   ON career_availability;
DROP POLICY IF EXISTS "Admin insert career_availability"  ON career_availability;
DROP POLICY IF EXISTS "Admin update career_availability"  ON career_availability;
DROP POLICY IF EXISTS "Admin delete career_availability"  ON career_availability;

-- career_notification_contacts: UI and API removed; table kept, service role only.
DROP POLICY IF EXISTS "Admin insert career_notification_contacts" ON career_notification_contacts;
DROP POLICY IF EXISTS "Admin update career_notification_contacts" ON career_notification_contacts;
DROP POLICY IF EXISTS "Admin delete career_notification_contacts" ON career_notification_contacts;

-- settings: only bod/director write ("Allow admin write settings" stays).
DROP POLICY IF EXISTS "Authenticated can update settings" ON settings;

-- Check after applying (as a non-privileged logged-in user, via the anon key):
--   select count(*) from career_bookings;                       -- must return 0
--   update settings set value = '0' where key = 'career_session_price_cents';  -- 0 rows
--   insert into career_availability ...                         -- must fail with an RLS error
