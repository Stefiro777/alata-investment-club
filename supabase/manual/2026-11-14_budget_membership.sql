-- Una sola voce "Membership" al posto di "Membership" e "Quote iscrizione".
-- Da eseguire a mano nel SQL Editor di Supabase, un blocco alla volta, nell'ordine.
--
--   Quote iscrizione = 89d5683e-4fdf-4704-b7cb-f0e2446c37f6   (revenue, 1 transazione da 615,00, source_type null)
--   Membership       = d068ff4f-a38d-46f9-9906-e075e43b2897   (revenue, 43 da 688,62 con source_type 'membership'
--                                                              + 1 da 15,00 con source_type null)
--
-- Il codice scrive gia' "Membership" (webhook Stripe): non cambia nulla lato applicazione.
-- I totali di entrate e uscite non cambiano: si sposta solo la categoria di una riga.
-- Le 3 transazioni senza categoria (2 cost da 353,47 e 1 revenue da 39,16) non si toccano.

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. FOTOGRAFIA PRIMA (salva il risultato: dopo il blocco 4 deve essere identico,
--    tranne le righe delle due categorie che diventano una).
select type, count(*) as n, round(sum(amount), 2) as totale from public.transactions group by type order by type;

select coalesce(bc.name, '(senza categoria)') as categoria, t.type, t.source_type, count(*) as n, round(sum(t.amount), 2) as totale
  from public.transactions t
  left join public.budget_categories bc on bc.id = t.category_id
 group by 1, 2, 3
 order by 1, 2, 3;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Sposta le transazioni di "Quote iscrizione" su "Membership".
update public.transactions
   set category_id = 'd068ff4f-a38d-46f9-9906-e075e43b2897'
 where category_id = '89d5683e-4fdf-4704-b7cb-f0e2446c37f6';

-- 2. Le colonne di testo, dove valgono "Quote iscrizione".
update public.transactions set category = 'Membership' where category = 'Quote iscrizione';
update public.transactions set budget_category = 'Membership' where budget_category = 'Quote iscrizione';

-- 3. Elimina la categoria "Quote iscrizione" solo se nessuna transazione la usa piu'
--    (se qualche altra tabella la referenzia, il database rifiuta e non cambia nulla).
delete from public.budget_categories
 where id = '89d5683e-4fdf-4704-b7cb-f0e2446c37f6'
   and not exists (select 1 from public.transactions where category_id = '89d5683e-4fdf-4704-b7cb-f0e2446c37f6');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CONTROLLI FINALI
--    4a. Membership ora ha 45 transazioni per 1318,62 (43 + 1 + la ex "Quote iscrizione").
select count(*) as n, round(sum(amount), 2) as totale
  from public.transactions
 where category_id = 'd068ff4f-a38d-46f9-9906-e075e43b2897';

--    4b. "Quote iscrizione" non esiste piu' (0 righe) e non resta nessuna transazione che la usa (0).
select count(*) as categorie_rimaste from public.budget_categories where id = '89d5683e-4fdf-4704-b7cb-f0e2446c37f6';
select count(*) as transazioni_orfane
  from public.transactions
 where category_id = '89d5683e-4fdf-4704-b7cb-f0e2446c37f6'
    or category = 'Quote iscrizione' or budget_category = 'Quote iscrizione';

--    4c. I totali per tipo sono identici a quelli del blocco 0.
select type, count(*) as n, round(sum(amount), 2) as totale from public.transactions group by type order by type;

--    4d. Le 3 transazioni senza categoria sono rimaste 3 (2 cost per 353,47, 1 revenue per 39,16).
select type, count(*) as n, round(sum(amount), 2) as totale
  from public.transactions
 where category_id is null
 group by type order by type;
