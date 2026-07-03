-- ============================================================================
-- BLOCCO B — Security audit round 1
-- Da incollare manualmente nel Supabase SQL Editor (NON eseguito automaticamente).
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- BLOCCO 1 — Race condition prenotazioni career (B4)
-- La capacità per slot è variabile (career_services.max_bookings_per_slot),
-- quindi un vincolo UNIQUE non basta. Il trigger serializza gli insert
-- concorrenti sullo stesso slot con un advisory lock transazionale e
-- ricontrolla la capacità dentro la transazione: due richieste simultanee
-- non possono più superare il massimo.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.career_bookings_enforce_capacity()
returns trigger
language plpgsql
as $$
declare
  slot_max int;
  active_count int;
begin
  -- Serializza gli insert per (service, date, time)
  perform pg_advisory_xact_lock(
    hashtext(new.service_id::text || '|' || new.slot_date::text || '|' || new.slot_time::text)
  );

  select coalesce(max_bookings_per_slot, 1) into slot_max
  from career_services
  where id = new.service_id;

  select count(*) into active_count
  from career_bookings
  where service_id = new.service_id
    and slot_date  = new.slot_date
    and slot_time  = new.slot_time
    and status <> 'cancelled';

  if active_count >= coalesce(slot_max, 1) then
    raise exception 'slot_full' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists career_bookings_enforce_capacity on career_bookings;
create trigger career_bookings_enforce_capacity
  before insert on career_bookings
  for each row
  execute function public.career_bookings_enforce_capacity();

-- ────────────────────────────────────────────────────────────────────────────
-- BLOCCO 2 — Tabella email_log (B5): i fallimenti Resend vengono persistiti
-- qui dal codice (lib/confirmation-emails.ts). Se la tabella non esiste il
-- codice degrada a un console.error strutturato, quindi questo blocco è
-- necessario solo per avere il monitoraggio su DB.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists email_log (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,          -- es. 'order-confirmation', 'registration-confirmation'
  recipient  text not null,
  subject    text,
  status     text not null default 'failed',
  error      text,
  created_at timestamptz default now()
);

alter table email_log enable row level security;

-- Scritture solo via service role (bypassa RLS); lettura solo privilegiati.
drop policy if exists "email_log_privileged_select" on email_log;
create policy "email_log_privileged_select" on email_log
  for select to authenticated
  using (public.is_privileged());

-- ────────────────────────────────────────────────────────────────────────────
-- VERIFICA POST-APPLICAZIONE:
--  1. prova due prenotazioni quasi simultanee sullo stesso slot con max 1:
--     la seconda deve fallire con errore 'slot_full' (il sito risponde 409);
--  2. select * from email_log; → vuota finché non fallisce un invio email.
-- ============================================================================
