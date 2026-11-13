-- Dashboard: Getting started per anno, anno di studio nei profili, eventi riservati per anno.
-- Da eseguire a mano nel SQL Editor di Supabase, un blocco alla volta.
-- Il codice funziona anche prima: ogni parte si attiva quando esiste il dato.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tag audience: cosa esce in "Getting started" a ciascun anno.
--    'bachelor' = ogni Bachelor (anche senza anno), 'master' = ogni Master.
update public.resources set audience = array['bachelor']
  where title = 'Guida ai master';
update public.resources set audience = array['bachelor_1']
  where title in ('Starting Resources', 'Training Academy');
update public.resources set audience = array['bachelor_2', 'bachelor_3']
  where title in ('Cartella Master', 'ALATA GMAT GUIDE', 'CV Guide');
update public.resources set audience = array['master']
  where title in ('Networking Guide', 'Hirevue & Online Assesments',
                  'Domande Frequenti - IB, Capital Markets & Quant', 'Materiali Colloqui IB');

-- Controllo: devono uscire 10 righe.
select title, audience from public.resources where audience is not null order by audience, title;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Anno di studio nei profili: lo recupera dalle iscrizioni agli eventi e dalle
--    candidature (stessa email), dove il profilo e' ancora vuoto. Vince il dato
--    piu' recente. I valori ambigui ("0", "1", "Master's") vengono saltati.
--
--    2a. ANTEPRIMA (non modifica nulla): chi verrebbe aggiornato e con cosa.
with src as (
  select lower(email) as email, anno_di_studio as t, created_at as at
    from public.event_registrations where coalesce(anno_di_studio, '') <> ''
  union all
  select lower(email), anno_di_studio, created_at
    from public.applications where coalesce(anno_di_studio, '') <> ''
), parsed as (
  select email, at, t,
    case when lower(t) ~ '(master|magistral|msc)' then 'master'
         when lower(t) ~ '(bachelor|triennal|bsc|laurea)' then 'bachelor' end as lvl,
    coalesce(
      (regexp_match(lower(t), '([1-6])\s*(?:st|nd|rd|th|°|º|\^)?\s*(?:year|anno)'))[1],
      (regexp_match(lower(t), '\m([1-6])\M'))[1]
    )::smallint as yr
  from src
), best as (
  select distinct on (email) email, t, lvl, yr
    from parsed where lvl is not null and yr is not null
    order by email, at desc
)
select m.full_name, m.email, b.t as scritto, b.lvl as study_level, b.yr as study_year
  from public.club_members m
  join best b on lower(m.email) = b.email
 where m.study_level is null and m.study_year is null and m.membership_removed_at is null
 order by m.full_name;

--    2b. APPLICA (stessa query, poi update).
with src as (
  select lower(email) as email, anno_di_studio as t, created_at as at
    from public.event_registrations where coalesce(anno_di_studio, '') <> ''
  union all
  select lower(email), anno_di_studio, created_at
    from public.applications where coalesce(anno_di_studio, '') <> ''
), parsed as (
  select email, at,
    case when lower(t) ~ '(master|magistral|msc)' then 'master'
         when lower(t) ~ '(bachelor|triennal|bsc|laurea)' then 'bachelor' end as lvl,
    coalesce(
      (regexp_match(lower(t), '([1-6])\s*(?:st|nd|rd|th|°|º|\^)?\s*(?:year|anno)'))[1],
      (regexp_match(lower(t), '\m([1-6])\M'))[1]
    )::smallint as yr
  from src
), best as (
  select distinct on (email) email, lvl, yr
    from parsed where lvl is not null and yr is not null
    order by email, at desc
)
update public.club_members m
   set study_level = b.lvl, study_year = b.yr
  from best b
 where lower(m.email) = b.email
   and m.study_level is null and m.study_year is null
   and m.membership_removed_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Eventi riservati a certi anni di studio. Vuoto/null = aperto a tutti.
--    Il controllo e' lato server (iscrizione e checkout), sull'anno scritto nel form.
alter table public.upcoming_events
  add column if not exists allowed_years text[];

alter table public.upcoming_events
  drop constraint if exists upcoming_events_allowed_years_check;
alter table public.upcoming_events
  add constraint upcoming_events_allowed_years_check
  check (allowed_years is null
         or allowed_years <@ array['bachelor_1','bachelor_2','bachelor_3','master_1','master_2']::text[]);
