---
date: 2026-07-06
session: 01
author: antonio
collaborators: []
tags: [pilotstore, storefront, staging, categorie, footer]
status: closed
duration_minutes: "?"
related: []
---

# apStore storefront: legali + footer premium + deploy staging apstore.sellpilot.it + PilotStore categorie & paginazione (cantiere B)

> Sessione lunga sullo storefront PilotStore (repo `FRA2721/apstore`) e sulla sua integrazione backend SellPilot. Commit storefront su `FRA2721/apstore@master`; step backend su `apstorenet/sellpilot.it@staging` (deploy su VPS staging via cherry-pick per via del drift).

## Cosa fatto
- **Pagine legali + compliance** (7 pagine: note-legali, privacy, cookie, condizioni-vendita, recesso+modulo, spedizioni, contatti) + cookie banner (`js/cookie.js`, linee guida Garante) + link di consenso di checkout/registrazione cablati alle pagine reali. Fix dati footer placeholder → dati reali Piccolo Antonio.
- **Fix store-vuoto**: home e catalogo mostravano 0 prodotti (mancava il tenant slug) → ora caricano i 506 prodotti PilotStore.
- **Footer premium unificato** su tutte le pagine: brand+tagline, 4 colonne (Negozio/Assistenza/Legale/Contatti), riga fiducia (garanzie + badge pagamenti), effetto **glass** (backdrop-filter), effetto hover "roulette" sui link, frecce inclinate → orizzontali/corte, "Made By SellPilot".
- **API base same-origin** (`data.js`): niente più hardcode `app.sellpilot.it` → `location.origin + /api` (env-agnostica, separazione prod/non-prod).
- **Deploy storefront su VPS staging**: `https://apstore.sellpilot.it` (vhost nginx `/var/www/pilotstore`, proxy `/api/pilot-store/` → backend staging :8000, DNS A Cloudflare, HTTPS certbot).
- **Mappa categorie store (bozza v0.2)**: ~24 categorie canoniche da famiglia/gruppo dei 4 fornitori (Esprinet 1185 fam / CG 98 / Runner 19 / Focelda 9). 4 passi: escludi fuori-perimetro → parola chiave su famiglia → fallback su gruppo per "ACCESSORI" → "Da rivedere". Applicata nel frontend (`data.js`): 506 prodotti → 12 categorie pulite. Copertura ~71% sul catalogo totale.
- **Spedizione**: gratis oltre €100, **€10** sotto (carrello + checkout + scheda prodotto + pagina Spedizioni); reso allineato a **14 giorni** (era "30gg"). Selettore checkout a 3 opzioni semplificato alla regola unica.
- **Cantiere B — Paginazione PilotStore** (backend SellPilot, `pilot_store_routes.py`, branch `staging`):
  - **Step 1**: `limit`/`offset` + `total` reale sulla route prodotti (retro-compatibile).
  - **Step 2**: `_map_categoria` portata in Python → `categoria_store` per item + filtro `?categoria=` + facet `categorie` (menu con conteggi) + esclusione fuori-perimetro.

## Decisioni
- **PilotStore pubblica via Master** (EAN-dedup, winner-selected fornitore più conveniente), non SKU grezzi. La mappa categoria è anche il **gate di pubblicazione** (fuori-perimetro non entra).
- **Perimetro store**: IT + ufficio/cancelleria; esclusi giocattoli, abbigliamento/DPI, servizi/garanzie, ricambi non-IT.
- **Ricarico 10% standard** (prezzo = costo × 1,10; senza commissioni ≈ margine). Tutti e 4 i fornitori.
- **Storefront env-agnostico** (same-origin): staging→backend staging, prod→prod. Locale/NAS abbandonati.
- **Catalogo pieno (~90k) NON pubblicabile alla cieca**: lo storefront carica tutto client-side → serve prima la **paginazione (B)**; e i prezzi in prod = soldi → staging-first.
- Categoria nel backend (non solo frontend): serve per navigare 90k per categoria e per il Master.

## Modifiche codice
- `FRA2721/apstore@master` (storefront): `0cb2bb8` legali+cookie+footer premium · `eeef853`/`ba46a24`/`ec3be37` Made By SellPilot + frecce · `8bc51b1` spedizione €100/reso 14 · `ae98d1c` footer glass · `baf6a7d` API same-origin · `fd91ec6` mappa categorie · `9b7127f`/`bba4dfd` spedizione €10 + checkout.
- `apstorenet/sellpilot.it@staging` (backend): `19c44b7` paginazione (limit/offset/total) · `8ed8fc7` categoria_store + filtro + facet. Deploy su VPS staging via cherry-pick (`4200d9e`, `2ee1073`).
- Infra: vhost nginx `pilotstore` + DNS `apstore.sellpilot.it` (Cloudflare) + certbot.

## Test
- Storefront: sito statico, nessun toolchain di test → verifica via browser/preview (categorie 12, spedizione, footer glass, consensi). 
- Backend: `py_compile` OK (parse col venv); smoke API su staging verde (paginazione `?limit`, filtro `?categoria=Notebook`→92, facet 12 categorie, escludi fuori-perimetro).

## TODO emersi
- **Cantiere B — Step 4**: rifare `data.js`/catalogo/index perché usino la nuova API (fetch per categoria/pagina/ricerca + menu dal facet) invece di scaricare tutto.
- **Step 2b**: memorizzare `categoria_store` in colonna + backfill (il calcolo runtime non regge 90k) — prerequisito prima di pubblicare tutto.
- Pubblicare i 4 fornitori al 10% su staging (regole pricing) → vedere il catalogo pieno → promuovere in prod.
- ⚠️ **Drift staging SellPilot**: `/var/www/sellpilot-app` su branch `staging` divergente (227 commit) + modifiche non committate (auth/main/models) → `deploy-staging.sh` fallisce, uso cherry-pick. Da ripulire (con Francesco).
- Revisione legale dei testi policy prima del go-live pubblico.
- Tempi di spedizione reali in `spedizioni.html` (ora placeholder 1-2/2-4 gg).
- Badge pagamenti (Visa/MC/PayPal/Bonifico) da confermare col gateway reale.
- Selettore spedizione checkout: chiarire "Ritiro €2,99" vs regola unica.
- Slug `apstore` hardcoded nel repo storefront → parametrizzare per multi-tenant.
- Sincronizzare l'avanzamento cantiere B (#134-139 / nuovo) nel `cantieri_admin` (questa sessione non ha girato in MODE sellpilot).
