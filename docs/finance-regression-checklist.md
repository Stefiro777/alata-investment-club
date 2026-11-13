# Finance: cosa deve continuare a funzionare

Checklist da passare a schermo dopo il rifacimento di `/admin/finance`. Le regole di fondo sono
in `lib/finance-view.ts` e coperte da `lib/finance-view.test.ts` (`npm test`); qui c'e' cio' che
solo lo schermo puo' dimostrare. Ogni punto dice cosa fare e cosa deve succedere.

## Transactions

1. **Aggiungere.** "Add transaction", Revenue, data, importo `12,50`, descrizione, categoria, salva.
   La riga compare nel mese giusto, con `+` e l'importo; entrate e saldo del riepilogo salgono.
2. **Aggiungere un costo.** Stessa cosa con Cost: riga con `-`, uscite e saldo si aggiornano.
3. **Validazione.** Descrizione vuota, importo vuoto, `0` o negativo: non salva.
4. **Rimborso manuale.** Cost + "refund": la riga e' etichettata come rimborso e conta tra le uscite.
5. **Modificare.** Apri una riga con Edit: tutti i campi sono precompilati (un rimborso si riapre come
   Cost con la spunta). Cambia importo e salva: la riga e i totali si aggiornano.
6. **Eliminare.** Delete chiede conferma, poi la riga sparisce e i totali scendono. "No" non cancella nulla.
7. **Nuova categoria.** Dal form, scrivi un nome e aggiungila: viene selezionata. Le categorie offerte
   dipendono dal tipo (revenue / cost).
8. **Ricevuta.** Dal form, "Upload" di un file: l'URL compare nel campo; salva. La riga mostra il link
   alla ricevuta e si apre in una nuova scheda. Un URL scritto a mano funziona uguale.
9. **Rimborso Stripe.** Solo i pagamenti Stripe di evento, merch o career, non gia' rimborsati, mostrano
   "Refund". Non lo mostrano: membership, costi, righe manuali, pagamenti con rimborso. Il dialogo
   riporta l'importo lordo e le note per tipo; "Cancel" non fa nulla; la conferma crea una nuova riga
   di rimborso e la riga originale risulta "refunded".
10. **Lordo e fee.** Le righe Stripe mostrano lordo e fee sotto l'importo netto.
11. **Mesi.** Le frecce e le pillole cambiano mese; ogni pillola mostra il saldo del mese; si parte dal
    mese corrente. Gli importi sono in `€` con due decimali.

## Budget

12. **Periodo.** Monthly / Quarterly / Yearly e le frecce: il nome del periodo cambia (es. `Novembre 2026`,
    `Q4 2026`, `2026`); non si va oltre il periodo corrente.
13. **Numeri.** Entrate, uscite e saldo del periodo, saldo cumulativo, una riga per categoria usata e
    "(Non categorizzato)" in fondo.
14. **PDF.** "Download PDF" scarica `bilancio-<periodo>.pdf` (es. `bilancio-Q4-2026.pdf`) con gli stessi
    numeri dell'anteprima, nel formato di `lib/pdf-branding.ts`. L'anteprima A4 resta invariata.

## Documents e Quotes

15. **Documents.** Elenco, upload e download dei documenti come prima (`/admin/archive` ora reindirizza
    qui con `?tab=documents`).
16. **Quotes.** Nuovo preventivo, anteprima, invio e storico come prima.

## Non devono cambiare

- Nessuna colonna, tabella o policy (nessun SQL in questo lavoro).
- Le API `/api/finance/refund`, `/api/finance/upload`, `/api/finance/pdf` e `lib/pdf-branding.ts`.
