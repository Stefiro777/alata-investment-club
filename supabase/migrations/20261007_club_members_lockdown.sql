-- club_members lockdown.
--
-- ALREADY APPLIED IN PRODUCTION on 2026-10-07 (project iyigyfygsalvvveeeheq).
-- This file only tracks it in the repo; the function body below matches
-- pg_get_functiondef() of the live database.
--
-- Problem: two policies let ANY logged-in user write ANY club_members row with the
-- anon key ("write club_members": ALL, USING true / WITH CHECK true;
-- "club_members_write_own": ALL on the own row). A member could set their own role
-- to bod/director, add teams or give themselves an active membership, bypassing
-- every check built on club_members (requireTeamAccess, requirePrivilegedAccess,
-- is_privileged(), free Career sessions for active members).
--
-- Fix:
--   * drop the two policies; "club_members_update_privileged_or_self" stays
--     (UPDATE for privileged users or on the own row), as do the SELECT policies and
--     the privileged-only INSERT/DELETE;
--   * a BEFORE UPDATE trigger lets a non-privileged user edit their own row except the
--     sensitive columns listed below. The service role (no email in the JWT) and
--     privileged users (bod/director) are never restricted.

DROP POLICY IF EXISTS "write club_members" ON club_members;
DROP POLICY IF EXISTS "club_members_write_own" ON club_members;

CREATE OR REPLACE FUNCTION public.club_members_guard_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  -- Service role (nessuna email nel JWT) e privilegiati passano sempre.
  if auth.email() is null or public.is_privileged() then
    return new;
  end if;
  if new.role                      is distinct from old.role
     or new.teams                  is distinct from old.teams
     or new.email                  is distinct from old.email
     or new.member_id              is distinct from old.member_id
     or new.membership_expires_at  is distinct from old.membership_expires_at
     or new.full_name              is distinct from old.full_name
     or new.lab_subdivision        is distinct from old.lab_subdivision
     or new.user_id                is distinct from old.user_id
     or new.membership_removed_at  is distinct from old.membership_removed_at
     or new.membership_removed_by  is distinct from old.membership_removed_by
     or new.membership_reminder_sent_for is distinct from old.membership_reminder_sent_for
  then
    raise exception 'club_members: campo non modificabile dal proprio profilo';
  end if;
  return new;
end;
$function$;

-- The trigger that runs the function (present in production as
-- "club_members_guard_self_update", BEFORE UPDATE, FOR EACH ROW).
DROP TRIGGER IF EXISTS club_members_guard_self_update ON club_members;
CREATE TRIGGER club_members_guard_self_update
  BEFORE UPDATE ON club_members
  FOR EACH ROW EXECUTE FUNCTION public.club_members_guard_self_update();
