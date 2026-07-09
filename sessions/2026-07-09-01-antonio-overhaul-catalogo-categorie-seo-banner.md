---
date: 2026-07-09
session: 01
author: antonio
collaborators: [francesco]
tags: [storefront, catalogo, categorie, seo, ux]
status: closed
duration_minutes: 145
related: []
---

# Overhaul catalogo storefront: categorie auto-estendibili, sotto-categorie, UX/SEO, banner articoli

> Sessione lunga e interamente sullo storefront `apstore.sellpilot.it` (repo `FRA2721/apstore`, deploy su VPS staging 204.168.191.77 → `/var/www/pilotstore`, `git pull` manuale). 25 commit, tutti già pushati e deployati + verificati live.

## Cosa fatto
- **Intro splash rimossi**: tolto l'overlay full-screen di sezione (parola tipo Shop/Welcome) da tutte le 8 pagine.
- **Home / card categoria**: foto reali prodotto nelle card (da `url_foto`), rename "Shop by Category" → "Categorie", card più piccole e titolo meno bold.
- **Catalogo — redesign completo**: griglia fino a **6 card/riga uniformi** (fix colonne disuguali con `minmax(0,1fr)`), spaziatura card (gap 40/24), **paginazione a finestra di 10** + frecce, allineamento tutto a sinistra (gutter 40px), titolo sezione alleggerito (900→400), **dropdown "Ordina" custom minimal premium** con nomi cliente-friendly, sidebar filtri con **icone minimal SVG**, numeri senza bg grigio, slider prezzo sottile, rimossi i toggle vista griglia/lista, bottone carrello senza freccia/traslazione.
- **Categorie — tassonomia auto-estendibile**: ogni famiglia del gestionale genera il **suo scaffale dedicato** (nome curato se noto, altrimenti Title-Case automatico) → **mai più discarica "Altro"**; niente esclusioni di prodotti fuori-perimetro (es. "Rasoi", "Casa e Sicurezza"); videowall DVLED instradato su Monitor.
- **Sotto-categorie navigabili** (gerarchia 2° livello dai gruppi) con "Tutti" + conteggi; **"mostra tutte/meno"** categorie; **accordion filtri su mobile** (≤1024px).
- **Merchandising / SEO**: paragrafo introduttivo SEO per categoria + **meta dinamici** (title, description, canonical, Open Graph) per categoria/sotto-categoria.
- **Navigazione categorie client-side** (no reload, no scroll-to-top) con apparizione **fluida** delle sotto-categorie.
- **Banner articoli** con **carosello automatico in background** (crossfade + Ken Burns, dots, pausa su hover, testo sincronizzato) in cima al catalogo.

## Decisioni
- Categorie **auto-derivate dalla famiglia** del gestionale invece di lista chiusa: le famiglie note hanno nome curato, le nuove diventano automaticamente la loro categoria — così nessun nuovo tipo di prodotto finisce in "Altro" (che resta solo per prodotti senza famiglia).
- **Non escludere** i prodotti fuori-perimetro: si crea una categoria dedicata (scelta esplicita utente).
- **Animazioni solo su proprietà composite** (opacity/transform via CSS): `max-height` faceva jank (misurato a scatti), scartato.
- Tutte le modifiche catalogo sono **page-scoped** (via `#prodGrid`, `<style>` in `catalogo.html`) → home, blog, carrello non toccati.
- Fix cache: `Cache-Control: no-cache` sul vhost nginx `pilotstore` (fatto in sessione precedente, sfruttato qui per deploy visibili senza hard-refresh).

## Modifiche codice
25 commit `011ad29..dbf9cd7` (feat/fix/style/content). Principali:
- `catalogo.html` — grosso della sessione (griglia, paginazione, sidebar, sotto-categorie, SEO, banner, animazioni, dropdown ordina).
- `js/data.js` — mappatura categorie (`_mapCategoria` auto-estendibile, `_prettyCat`, regole "Rasoi"/"Casa e Sicurezza"/signage→Monitor), foto categoria da prodotto.
- `css/style.css` — card categoria home, sidebar-cats.
- `index.html` + 6 pagine (`articolo/blog/carrello/login/prodotto/registrati.html`) — rimozione intro splash.

## Test
Nessun toolchain (sito statico HTML/CSS/JS: niente package.json/pyproject). Verifica fatta **live** ad ogni step: deploy su VPS + smoke HTTP + ispezione DOM/computed-style via browser su `apstore.sellpilot.it`.

## TODO emersi
- Portare il frontend PilotStore sotto l'org **apstorenet** (repo attuale `FRA2721/apstore` personale di Francesco).
- Valutare: banner con **prodotti in evidenza** come alternativa/aggiunta agli articoli del blog; alleggerire il gradiente scuro del banner se si vuole più visibile lo sfondo.
- Estendere l'allineamento a sinistra e lo stile anche alle altre pagine (home, prodotto) per coerenza.
- Revisione testi (descrizioni categoria SEO, testi legali).
