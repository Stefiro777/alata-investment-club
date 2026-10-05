# cv-uploads: da bucket pubblico a privato (step finale, manuale)

Il codice è già pronto e funziona **prima e dopo** questo passaggio:
i nuovi upload salvano il *path* (non l'URL pubblico) e ogni lettura (admin,
creatore dell'offerta, team career, email) passa da signed URL generati lato
server. I vecchi URL pubblici continuano a funzionare finché il bucket è
pubblico, e vengono comunque convertiti in signed URL dal codice.

Nulla di tutto questo è stato eseguito: lo lanci tu quando vuoi.

## 0. Prerequisito
Il codice con i signed URL deve essere in produzione (push fatto) e verificato:
- candidatura con CV da `/dashboard/jobs` (il CV si apre da "Candidature ricevute" e da `/admin/jobs`);
- prenotazione career con CV (il link nella mail al mentor si apre; in `/dashboard/career/bookings` il CV si apre).

## 1. Conversione degli URL storici in path (8 righe oggi: 5 candidature, 3 booking)
```bash
# dry run: stampa cosa cambierebbe, non scrive nulla
node --env-file=.env.local scripts/convert-cv-urls-to-paths.mjs

# applica
node --env-file=.env.local scripts/convert-cv-urls-to-paths.mjs --apply
```
Lo script è idempotente, verifica che l'oggetto esista nel bucket prima di
toccare la riga e stampa il valore originale (serve per un eventuale rollback).

## 2. Rendere privato il bucket (SQL editor di Supabase)
```sql
update storage.buckets set public = false where name = 'cv-uploads';
```
La policy di INSERT "Authenticated users can upload CV" resta (gli upload
dal browser continuano a funzionare). Non esistono policy di SELECT per
`cv-uploads`: le letture avvengono solo con il service role (signed URL).

## 3. Verifica
- un vecchio URL pubblico, aperto in una finestra anonima, deve dare errore;
- da `/admin/jobs` il pulsante "Scarica CV" apre il file;
- una nuova prenotazione career con CV: il link nella mail del mentor si apre.

## Rollback
```sql
update storage.buckets set public = true where name = 'cv-uploads';
```
I path salvati nel DB restano validi (il codice li legge comunque).
Per ritornare agli URL pubblici nelle righe, usa il log del dry-run/apply del punto 1.
