# Blocco C — Versionare lo schema reale con `supabase db pull`

Oggi il codice referenzia ~55 tabelle ma in `supabase/migrations/` ce ne sono
solo 6, create a mano. Questi comandi generano una **migrazione baseline**
con l'intero schema remoto, così da poterlo versionare e diffare da qui in poi.

Vanno eseguiti **da te** (servono login Supabase e password del database).
Tutti i comandi sono in sola lettura verso il DB remoto: `db pull` non
modifica nulla, scarica soltanto lo schema.

## Prerequisiti

- Project ref del progetto (Dashboard Supabase → Settings → General → Reference ID)
- Password del database (quella scelta alla creazione del progetto)

## Comandi (dalla root del repo)

```powershell
# 1. Login (apre il browser; in alternativa: $env:SUPABASE_ACCESS_TOKEN = "sbp_...")
npx supabase login

# 2. Inizializza la config locale (crea supabase/config.toml, non tocca migrations/)
npx supabase init

# 3. Collega il progetto remoto (chiede la password del DB)
npx supabase link --project-ref <PROJECT_REF>

# 4. Scarica lo schema remoto come migrazione baseline
npx supabase db pull
```

`db pull` crea `supabase/migrations/<timestamp>_remote_schema.sql` con tutto
lo schema (tabelle, RLS, funzioni, trigger).

## Caveat — migrazioni locali esistenti

Le 6 migrazioni già presenti in `supabase/migrations/` sono state applicate
a mano dal SQL Editor, quindi **non risultano** nella history remota
(`supabase_migrations.schema_migrations`). Al passo 4 la CLI potrebbe
chiederti di riconciliarle. Due opzioni:

**Opzione A (consigliata, più pulita):** archivia le vecchie migrazioni prima
del pull — il loro contenuto è comunque già dentro lo schema remoto che stai
scaricando:

```powershell
mkdir supabase/migrations-legacy
git mv supabase/migrations/*.sql supabase/migrations-legacy/
npx supabase db pull
```

**Opzione B:** segna le vecchie migrazioni come già applicate, poi pull:

```powershell
npx supabase migration repair --status applied 20260624 20260624 20260624 20260625 20260625
npx supabase db pull
```

(la CLI stampa i comandi `migration repair` esatti se servono — copia quelli).

## Dopo il pull

```powershell
git add supabase/
git commit -m "chore: baseline remote schema via supabase db pull"
git push origin fix/security-audit-round-1
```

Nota: `supabase/config.toml` può contenere impostazioni locali; è ok
committarlo. Non committare mai la password del DB o l'access token.
