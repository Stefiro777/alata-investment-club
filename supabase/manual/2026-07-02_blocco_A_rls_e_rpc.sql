-- ============================================================================
-- BLOCCO A — Security audit round 1
-- Da incollare manualmente nel Supabase SQL Editor (NON eseguito automaticamente).
-- Eseguire i blocchi nell'ordine indicato. Ogni blocco è idempotente.
--
-- NOTA MODELLO ACCESSI: 'director' è il valore DB del ruolo "Management".
-- Accesso privilegiato globale = role IN ('bod','director').
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- BLOCCO 0 — ISPEZIONE (solo lettura, esegui prima per vedere lo stato attuale)
-- ────────────────────────────────────────────────────────────────────────────
-- select tablename, policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where tablename in ('transactions','club_members','crm_customers','merch_orders','career_bookings')
-- order by tablename, policyname;
--
-- select relname, relrowsecurity
-- from pg_class
-- where relname in ('transactions','club_members','crm_customers','merch_orders','career_bookings');

-- ────────────────────────────────────────────────────────────────────────────
-- BLOCCO 1 — Funzioni helper (SECURITY DEFINER: evitano ricorsione RLS
-- quando le policy di club_members interrogano club_members stessa)
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.is_privileged()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from club_members
    where email = auth.email()
      and role in ('bod','director')
  );
$$;

create or replace function public.is_in_team(team_slug text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from club_members
    where email = auth.email()
      and team_slug = any(coalesce(teams, '{}'))
  );
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- BLOCCO 2 — RPC atomiche per i contatori (fix race condition read-then-write)
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.increment_preview_count(p_document_id uuid)
returns void
language sql security definer
set search_path = public
as $$
  update partner_documents
  set preview_count = coalesce(preview_count, 0) + 1
  where id = p_document_id;
$$;

create or replace function public.increment_partner_click(p_partner_id uuid)
returns void
language sql security definer
set search_path = public
as $$
  update partners
  set click_count = coalesce(click_count, 0) + 1
  where id = p_partner_id;
$$;

-- Già referenziata dal webhook Stripe ma non versionata: la (ri)creo qui.
create or replace function public.increment_discount_uses(p_code text)
returns void
language sql security definer
set search_path = public
as $$
  update discount_codes
  set uses_count = coalesce(uses_count, 0) + 1
  where code = p_code;
$$;

-- Le RPC vengono chiamate solo con service role dalle API route:
-- revoco l'esecuzione a anon/authenticated per non aprire un canale diretto.
revoke execute on function public.increment_preview_count(uuid) from anon, authenticated;
revoke execute on function public.increment_partner_click(uuid) from anon, authenticated;
revoke execute on function public.increment_discount_uses(text) from anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- BLOCCO 3 — RLS: transactions (dato finanziario sensibile)
-- Letture/scritture client-side avvengono solo da /admin/finance e
-- /admin/analytics, entrambe riservate a bod/director. Le scritture di
-- sistema (webhook Stripe) usano il service role, che bypassa la RLS.
-- ────────────────────────────────────────────────────────────────────────────

alter table transactions enable row level security;

drop policy if exists "transactions_privileged_all" on transactions;
create policy "transactions_privileged_all" on transactions
  for all to authenticated
  using (public.is_privileged())
  with check (public.is_privileged());

-- ────────────────────────────────────────────────────────────────────────────
-- BLOCCO 4 — RLS: merch_orders (dati clienti + importi)
-- Nessuna lettura client-side rimasta (spostata dietro
-- /api/admin/analytics/internal). Inserimenti solo via service role.
-- ────────────────────────────────────────────────────────────────────────────

alter table merch_orders enable row level security;

drop policy if exists "merch_orders_privileged_select" on merch_orders;
create policy "merch_orders_privileged_select" on merch_orders
  for select to authenticated
  using (public.is_privileged());

-- ────────────────────────────────────────────────────────────────────────────
-- BLOCCO 5 — RLS: career_bookings (dati personali dei prenotanti)
-- Letta client-side dal pannello /dashboard/career/bookings, accessibile a
-- bod/director E ai membri del team career → la SELECT riflette lo stesso
-- perimetro. Scritture solo via API (service role).
-- ────────────────────────────────────────────────────────────────────────────

alter table career_bookings enable row level security;

drop policy if exists "career_bookings_team_select" on career_bookings;
create policy "career_bookings_team_select" on career_bookings
  for select to authenticated
  using (public.is_privileged() or public.is_in_team('career'));

-- ────────────────────────────────────────────────────────────────────────────
-- BLOCCO 6 — RLS: club_members
-- Vincoli emersi dal codice:
--  • tutti i membri autenticati leggono la tabella (dashboard, autocomplete,
--    lookup nomi) → SELECT per authenticated;
--  • /dashboard/layout.tsx fa un UPDATE client-side della propria riga per
--    linkare user_id al primo login → serve una policy self-update;
--  • il trigger sotto impedisce che il self-update tocchi campi privilegiati
--    (role, teams, email, member_id, membership_expires_at).
-- Le pagine pubbliche (/verify) usano il service role → non impattate.
-- ────────────────────────────────────────────────────────────────────────────

alter table club_members enable row level security;

drop policy if exists "club_members_select_authenticated" on club_members;
create policy "club_members_select_authenticated" on club_members
  for select to authenticated
  using (true);

drop policy if exists "club_members_insert_privileged" on club_members;
create policy "club_members_insert_privileged" on club_members
  for insert to authenticated
  with check (public.is_privileged());

drop policy if exists "club_members_update_privileged_or_self" on club_members;
create policy "club_members_update_privileged_or_self" on club_members
  for update to authenticated
  using (public.is_privileged() or email = auth.email())
  with check (public.is_privileged() or email = auth.email());

drop policy if exists "club_members_delete_privileged" on club_members;
create policy "club_members_delete_privileged" on club_members
  for delete to authenticated
  using (public.is_privileged());

-- Guard anti-escalation: un membro normale che aggiorna la propria riga può
-- toccare solo user_id (linking al primo login) e phone/title; mai role,
-- teams, email, member_id o scadenza membership.
create or replace function public.club_members_guard_self_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  -- Service role (nessuna email nel JWT) e privilegiati passano sempre.
  if auth.email() is null or public.is_privileged() then
    return new;
  end if;
  if new.role                  is distinct from old.role
     or new.teams              is distinct from old.teams
     or new.email              is distinct from old.email
     or new.member_id          is distinct from old.member_id
     or new.membership_expires_at is distinct from old.membership_expires_at
     or new.full_name          is distinct from old.full_name
     or new.lab_subdivision    is distinct from old.lab_subdivision
  then
    raise exception 'club_members: campo non modificabile dal proprio profilo';
  end if;
  return new;
end;
$$;

drop trigger if exists club_members_guard_self_update on club_members;
create trigger club_members_guard_self_update
  before update on club_members
  for each row
  execute function public.club_members_guard_self_update();

-- ────────────────────────────────────────────────────────────────────────────
-- BLOCCO 7 — RLS: crm_customers (già ristretta dalla migrazione 20260625,
-- ma con fallback su email hardcoded). Ricreo la policy senza il fallback.
-- ────────────────────────────────────────────────────────────────────────────

alter table crm_customers enable row level security;

drop policy if exists "crm_customers_admin" on crm_customers;
create policy "crm_customers_admin" on crm_customers
  for all to authenticated
  using (public.is_privileged())
  with check (public.is_privileged());

-- ────────────────────────────────────────────────────────────────────────────
-- VERIFICA POST-APPLICAZIONE (da eseguire dopo, con un utente member normale):
--  1. login come member semplice → la dashboard carica ancora il profilo;
--  2. il primo login di un nuovo membro linka user_id senza errori;
--  3. un member NON vede righe di transactions / merch_orders / crm_customers
--     dalle devtools (query dirette al REST endpoint);
--  4. un membro del team career vede career_bookings dal pannello;
--  5. /verify/[member_id] continua a funzionare da browser anonimo.
-- ============================================================================
