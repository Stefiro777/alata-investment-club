-- Inviti cancellabili: lo stato di un invito (pendente, accettato, cancellato) senza cancellare righe.
-- Da eseguire a mano nel SQL Editor di Supabase, un blocco alla volta, nell'ordine.
-- Prima di questo SQL il codice funziona comunque: le query ripiegano senza revoked_at
-- e "Cancel invite" risponde che serve l'aggiornamento del database.

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. FOTOGRAFIA PRIMA: inviti per stato (oggi nessuno e' cancellato).
select count(*) as totali,
       count(*) filter (where used_at is null) as non_usati,
       count(*) filter (where used_at is not null) as usati
  from public.invites;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Le colonne: quando e da chi l'invito e' stato cancellato. Nessuna riga viene toccata.
alter table public.invites
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CONTROLLI FINALI
--    2a. Le due colonne esistono (2 righe).
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'invites' and column_name in ('revoked_at', 'revoked_by')
 order by column_name;

--    2b. Gli stessi totali del blocco 0, e 0 cancellati: nessun invito e' cambiato.
select count(*) as totali,
       count(*) filter (where used_at is null and revoked_at is null) as pendenti,
       count(*) filter (where used_at is not null) as usati,
       count(*) filter (where used_at is null and revoked_at is not null) as cancellati
  from public.invites;
