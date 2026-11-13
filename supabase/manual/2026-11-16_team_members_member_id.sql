-- /admin/people: collega una riga di team_members (la pagina pubblica /team) a un membro del club.
-- Da eseguire a mano nel SQL Editor di Supabase, un blocco alla volta, nell'ordine.
--
-- Il collegamento serve solo al Board: nel form di People and alumni il selettore "Linked member"
-- e il pulsante "Use profile photo" copiano la foto del profilo nel campo foto di team_members.
-- La pagina pubblica /team continua a usare SOLO team_members.photo_url: nessun fallback automatico,
-- nessuna policy cambiata, nessuna foto di team_members toccata.
-- Prima di questo SQL il codice funziona comunque: People and alumni resta com'e', senza selettore.

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. FOTOGRAFIA PRIMA (salvala: dopo il blocco 2 i primi due numeri devono essere identici).
select count(*) as righe, count(photo_url) as con_foto from public.team_members;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. La colonna: nullable; se il membro viene cancellato il collegamento torna null.
alter table public.team_members
  add column if not exists member_id uuid references public.club_members(id) on delete set null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Un indice per le ricerche per membro (non unico: una persona puo' avere due ruoli).
create index if not exists team_members_member_id_idx on public.team_members (member_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CONTROLLI FINALI
--    3a. La colonna esiste (1 riga: member_id, uuid, YES).
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'team_members' and column_name = 'member_id';

--    3b. Le righe e le foto sono quelle del blocco 0, e nessuna riga e' ancora collegata (0):
--        i collegamenti si confermano dal pannello "Suggested links" di People and alumni.
select count(*) as righe, count(photo_url) as con_foto, count(member_id) as collegate
  from public.team_members;

--    3c. Il vincolo verso club_members c'e' (1 riga, con ON DELETE SET NULL).
select conname, pg_get_constraintdef(oid) as definizione
  from pg_constraint
 where conrelid = 'public.team_members'::regclass and contype = 'f' and conname like '%member_id%';
