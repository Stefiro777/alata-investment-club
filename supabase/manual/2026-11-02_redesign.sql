-- Redesign del sito (branch redesign/site). Da eseguire a mano nel SQL Editor
-- di Supabase, un blocco alla volta. Il codice funziona anche prima: le parti
-- che usano queste colonne si attivano quando esistono.

-- ─────────────────────────────────────────────────────────────────────────────
-- A. Join Us: due strade (Analyst / Member), prima e seconda scelta, CV,
--    stato della revisione nel Board panel (CRM · Applications).
--    Prima di questo blocco le risposte extra finiscono in fondo a motivazione.
alter table public.applications
  add column if not exists track text not null default 'analyst',
  add column if not exists study_level text,
  add column if not exists first_choice text,
  add column if not exists second_choice text,
  add column if not exists linkedin_url text,
  add column if not exists cv_path text,
  add column if not exists status text not null default 'new',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.club_members(id) on delete set null;

alter table public.applications
  add constraint applications_track_check check (track in ('analyst','member')),
  add constraint applications_study_level_check check (study_level is null or study_level in ('bachelor','master')),
  add constraint applications_first_choice_check check (first_choice is null or first_choice in ('lab','media','events')),
  add constraint applications_second_choice_check check (second_choice is null or second_choice in ('lab','media','events')),
  add constraint applications_choices_differ check (second_choice is null or second_choice <> first_choice),
  add constraint applications_status_check check (status in ('new','seen','accepted','declined'));

-- A2 (facoltativo, tocca righe esistenti): le candidature già lette risultano
-- "seen" e la vecchia colonna team diventa la prima scelta.
update public.applications set first_choice = team where team in ('lab','media','events') and first_choice is null;
update public.applications set track = 'member' where team = 'member';
update public.applications set status = 'seen' where status = 'new' and created_at < now() - interval '1 day';

-- ─────────────────────────────────────────────────────────────────────────────
-- B. Partners: testo esteso per le storie (/partners) e follow-up degli sponsor
--    (Overview e CRM).
alter table public.partners
  add column if not exists description_long text,
  add column if not exists last_contact_at date,
  add column if not exists next_step text;

-- ─────────────────────────────────────────────────────────────────────────────
-- C. Eventi: riga "Speaker" nella pagina del singolo evento.
alter table public.upcoming_events
  add column if not exists speaker_name text,
  add column if not exists speaker_role text;

-- ─────────────────────────────────────────────────────────────────────────────
-- D. Profilo del membro: corso, livello e anno, foto, LinkedIn ("x di 7" in
--    Dashboard e Profile, People con foto). Modificabili dal membro via
--    /api/me/profile (solo la propria riga, lato server).
alter table public.club_members
  add column if not exists degree_programme text,
  add column if not exists study_level text,
  add column if not exists study_year smallint,
  add column if not exists photo_url text,
  add column if not exists linkedin_url text,
  add column if not exists application_id integer references public.applications(id) on delete set null;

alter table public.club_members
  add constraint club_members_study_level_check check (study_level is null or study_level in ('bachelor','master')),
  add constraint club_members_study_year_check check (study_year is null or study_year between 1 and 6);

-- ─────────────────────────────────────────────────────────────────────────────
-- E. Responsabilità del ruolo, per team + ruolo (club_members.title).
--    Mostrate in Dashboard → "Your role".
create table if not exists public.role_profiles (
  team text not null,
  title text not null,
  reports_to text,
  responsibilities text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (team, title)
);
alter table public.role_profiles enable row level security;
create policy "members read role profiles" on public.role_profiles
  for select to authenticated using (true);
create policy "board writes role profiles" on public.role_profiles
  for all to authenticated
  using (exists (select 1 from public.club_members m where m.email = auth.email() and m.role in ('bod','director')))
  with check (exists (select 1 from public.club_members m where m.email = auth.email() and m.role in ('bod','director')));

-- ─────────────────────────────────────────────────────────────────────────────
-- F. Getting started per anno di corso: a chi si rivolge ogni risorsa.
--    Valori: 'bachelor', 'master', oppure 'bachelor_1' … 'master_2'.
alter table public.resources
  add column if not exists audience text[];

-- ─────────────────────────────────────────────────────────────────────────────
-- G. Frase di Join Us "Applications are open for the … intake".
insert into public.settings (key, value) values ('applications_intake_label', 'Spring 2027')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- S1. Sicurezza: oggi su resources ci sono policy "Authenticated users can …"
--     con condizione true, quindi qualsiasi utente loggato può modificarle o
--     cancellarle. Le sostituisco: lettura per tutti i loggati, scrittura per
--     Career team e BoD/Management (come deciso: risorse gestite dal Career team).
drop policy if exists "Authenticated users can delete resources" on public.resources;
drop policy if exists "Authenticated users can insert resources" on public.resources;
drop policy if exists "Authenticated users can update resources" on public.resources;
drop policy if exists "Only admins can manage resources" on public.resources;
create policy "career and board manage resources" on public.resources
  for all to authenticated
  using (exists (select 1 from public.club_members m where m.email = auth.email()
    and m.membership_removed_at is null and (m.role in ('bod','director') or 'career' = any(m.teams))))
  with check (exists (select 1 from public.club_members m where m.email = auth.email()
    and m.membership_removed_at is null and (m.role in ('bod','director') or 'career' = any(m.teams))));
-- La policy "Authenticated users can read resources" resta com'è.

-- ─────────────────────────────────────────────────────────────────────────────
-- X. Dati segnalati in design-reference/NOTES.md (righe reali, controlla i testi).
update public.career_mentors set role_title = 'Master Orientation' where id = '956675e0-7088-40de-b938-10017dff251a';
update public.featured_reports set title = 'The end of cheap duration' where id = '45ba9dbd-0e2e-4173-8e34-1662c5b717bc';
