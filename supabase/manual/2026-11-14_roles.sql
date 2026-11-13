-- Ruoli dei membri: member, lab, media, career, events, alumni, bod, director (= Management).
-- Da eseguire a mano nel SQL Editor di Supabase, un blocco alla volta, nell'ordine.
-- Il ruolo e' il team principale del membro (priorita lab, media, events, career, alumni);
-- l'array teams NON cambia e resta l'unica fonte dei permessi per team.
-- Prima di questo SQL il codice funziona comunque: accept-invite ripiega su 'member'
-- e il cambio ruolo nel Board risponde che servono i nuovi valori.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Il CHECK ammette i nuovi ruoli (oggi solo bod, director, member).
alter table public.club_members drop constraint if exists club_members_role_check;
alter table public.club_members
  add constraint club_members_role_check
  check (role in ('member', 'lab', 'media', 'career', 'events', 'alumni', 'bod', 'director'));

-- Controllo: deve restituire una riga con i 8 valori.
select conname, pg_get_constraintdef(oid) as definition
  from pg_constraint
 where conrelid = 'public.club_members'::regclass and conname = 'club_members_role_check';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2a. ANTEPRIMA (non modifica nulla): chi cambierebbe ruolo e in cosa.
select full_name, email, teams,
       case
         when 'lab'    = any(teams) then 'lab'
         when 'media'  = any(teams) then 'media'
         when 'events' = any(teams) then 'events'
         when 'career' = any(teams) then 'career'
         when 'alumni' = any(teams) then 'alumni'
       end as nuovo_ruolo
  from public.club_members
 where role = 'member' and teams is not null
   and teams && array['lab', 'media', 'events', 'career', 'alumni']
 order by nuovo_ruolo, full_name;

-- 2b. APPLICA. bod e director non si toccano; chi ha solo team nascosti
--     (education, academy, syrto) o nessun team resta 'member'.
update public.club_members
   set role = case
         when 'lab'    = any(teams) then 'lab'
         when 'media'  = any(teams) then 'media'
         when 'events' = any(teams) then 'events'
         when 'career' = any(teams) then 'career'
         when 'alumni' = any(teams) then 'alumni'
       end
 where role = 'member' and teams is not null
   and teams && array['lab', 'media', 'events', 'career', 'alumni'];

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Controlli finali.
--    Conteggio per ruolo (bod 9 e director 2 devono restare uguali; member + gli altri = 87).
select role, count(*) as n from public.club_members group by role order by role;

--    Nessun membro operativo deve essere rimasto 'member' (deve restituire 0 righe).
select full_name, teams from public.club_members
 where role = 'member' and teams && array['lab', 'media', 'events', 'career', 'alumni'];

--    I permessi non cambiano: teams e' intatto (stesso conteggio di prima per team).
select t as team, count(*) as n from (select unnest(teams) as t from public.club_members) x group by t order by t;
