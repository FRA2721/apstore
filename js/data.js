// ================================================
// ApStore — Dati Prodotti, Categorie, Blog
// ================================================

// CATEGORIES è DINAMICO: costruito a runtime dai prodotti reali del gestionale
// SellPilot (campo `famiglia` = categoria, `gruppo` = sotto-categoria). Niente più
// categorie/conteggi hardcoded. Popolato da _rebuildCategories() dopo il merge API.
const CATEGORIES = [];

// slug stabile da una famiglia ("INFORMATICA E COMPONENTISTICA" -> "informatica-e-componentistica")
function _catSlug(s) {
  return (s || '').toString().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // togli accenti
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'altro';
}

// icona euristica per famiglia (fallback 📦); display "grezzo", nome famiglia as-is
function _catIcon(fam) {
  const f = (fam || '').toLowerCase();
  if (/notebook|tablet/.test(f))                 return '💻';
  if (/smartphone|navigat/.test(f))              return '📱';
  if (/monitor/.test(f))                         return '🖥️';
  if (/stampant|plotter|fax|multifunzione/.test(f)) return '🖨️';
  if (/networking|sorvegli/.test(f))             return '📡';
  if (/server|personal computer/.test(f))        return '🗄️';
  if (/cavi/.test(f))                            return '🔌';
  if (/software/.test(f))                        return '💿';
  if (/ufficio|consumabil/.test(f))             return '🖇️';
  if (/home entertainment|televisor|audio/.test(f)) return '📺';
  if (/elettrodom|regalo|epilat|rasoi/.test(f)) return '🏠';
  if (/informatica|component/.test(f))           return '🖥️';
  return '📦';
}

// Ricostruisce CATEGORIES (in place, così tutti i riferimenti restano validi) dai
// prodotti reali: una voce per famiglia, conteggio reale, gruppi come sotto-filtri.
function _rebuildCategories() {
  const map = new Map();
  PRODUCTS.forEach(function (p) {
    if (!p._famiglia) return;
    let e = map.get(p.category);
    if (!e) {
      e = { id: p.category, name: p._famiglia, icon: _catIcon(p._famiglia), img: '', count: 0, sub: [], _seen: {} };
      map.set(p.category, e);
    }
    e.count++;
    if (p.sub && !e._seen[p.sub]) { e._seen[p.sub] = true; e.sub.push(p.sub); }
  });
  const arr = Array.from(map.values()).sort(function (a, b) { return b.count - a.count; });
  arr.forEach(function (e) { delete e._seen; e.sub.sort(); });
  CATEGORIES.length = 0;
  arr.forEach(function (c) { CATEGORIES.push(c); });
}

// Catalogo demo rimosso (18/06/2026): il sito mostra SOLO i prodotti reali dal gestionale
// SellPilot, iniettati a runtime da _mergeSpProducts via l'API /pilot-store/v/<slug>/products.
const PRODUCTS = [];

// ── Integrazione SellPilot API ─────────────────────────────────────────────
// Configurazione: imposta APSTORE_TENANT_SLUG prima di caricare data.js
// oppure tramite <script>window.APSTORE_TENANT_SLUG = 'tuo-slug';</script>
// API base: same-origin per default (ogni ambiente parla col PROPRIO backend
// SellPilot, che nginx proxia sotto /api) — override opzionale via
// window.APSTORE_API_BASE per servire lo storefront da un host senza backend.
const _SP_API   = (typeof window !== 'undefined' && window.APSTORE_API_BASE)
                  || ((typeof location !== 'undefined' ? location.origin : '') + '/api');
const _SP_SLUG  = (typeof window !== 'undefined' && window.APSTORE_TENANT_SLUG) || '';
const _SP_KEY   = 'apstore_sp_products_v1';

(function () {
  if (!_SP_SLUG) return; // slug non configurato: nessuna integrazione

  // 1. Merge immediato da sessionStorage — prodotti visibili senza attendere la rete
  try {
    const cached = JSON.parse(sessionStorage.getItem(_SP_KEY) || '[]');
    if (cached.length) _mergeSpProducts(cached);
  } catch (_) {}

  // 2. Fetch fresco dall'API — aggiorna cache e UI se già renderizzata
  fetch(_SP_API + '/pilot-store/v/' + _SP_SLUG + '/products', {
    signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !Array.isArray(data.items)) return;
      try { sessionStorage.setItem(_SP_KEY, JSON.stringify(data.items)); } catch (_) {}
      _mergeSpProducts(data.items);
      _afterSpMerge();
    })
    .catch(function () {}); // fail silenzioso — il sito funziona anche senza API

  // Notifica le pagine: prima il menu categorie (dinamico), poi la griglia prodotti.
  // Hook opzionali: ogni pagina registra solo quelli che la riguardano.
  function _afterSpMerge() {
    if (typeof window.__apstoreRenderCategories === 'function') window.__apstoreRenderCategories();
    if (typeof window.__apstoreRender === 'function') window.__apstoreRender();
  }

  function _mergeSpProducts(items) {
    var existing = {};
    PRODUCTS.forEach(function (p) { if (p._spId) existing[p._spId] = true; });
    var maxId = PRODUCTS.reduce(function (m, p) { return Math.max(m, p.id); }, 0);
    var idx = 0;
    items.forEach(function (p) {
      if (existing[p.id]) return;
      existing[p.id] = true; // evita doppioni anche all'interno dello stesso payload
      var fam = p.famiglia || '';
      PRODUCTS.push({
        id:        maxId + (++idx),
        _spId:     p.id,
        name:      p.titolo || 'Prodotto',
        brand:     p.marca  || '',
        category:  _catSlug(fam),   // categoria reale dal gestionale (famiglia)
        _famiglia: fam,             // nome famiglia grezzo per il menu dinamico
        sub:       p.gruppo || '',  // sotto-categoria reale (gruppo)
        price:     p.prezzo || 0,
        oldPrice:  null,
        rating:    4.5,
        reviews:   0,
        badge:     null,
        icon:      _catIcon(fam),
        sku:       p.sku    || ('SP-' + p.id),
        stock:     p.stock_disponibile !== 'Esaurito',
        desc:      p.descrizione || '',
        img:       p.url_foto   || '',
        specs:     {},
        _sp:       true,
      });
    });
    _rebuildCategories(); // ricostruisci il menu categorie dai prodotti reali
  }
})();

const BLOG_POSTS = [

  /* ── COMPONENTI PC ── */
  {
    id: 1,
    title: 'Guida completa al PC da gaming 2026: build da €800 a €3.000',
    category: 'Componenti PC',
    excerpt: 'Tre configurazioni complete testate sul campo: entry-level, mid-range e top di gamma. GPU, CPU, RAM e storage per ogni budget con benchmark reali su titoli AAA.',
    date: '15 Giu 2026', readTime: '8 min', icon: '🖥️', img: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&h=260&fit=crop&q=80',
    body: `
      <h2>Perché costruire un PC nel 2026?</h2>
      <p>Il mercato dei processori e delle schede video è tornato in equilibrio dopo anni di crisi. Prezzi più accessibili, disponibilità ampia e un'offerta competitiva tra AMD e Intel (lato CPU) e AMD vs NVIDIA (lato GPU) rendono il 2026 uno dei migliori momenti degli ultimi cinque anni per assemblare un PC.</p>

      <h2>Build Entry-Level — €800</h2>
      <ul>
        <li><strong>CPU:</strong> AMD Ryzen 5 7600 — 6 core, 5.1 GHz boost</li>
        <li><strong>GPU:</strong> NVIDIA RTX 4060 8GB</li>
        <li><strong>RAM:</strong> 16GB DDR5 5600MHz</li>
        <li><strong>Storage:</strong> Samsung 970 Evo 1TB NVMe</li>
        <li><strong>PSU:</strong> Corsair CV650 80+ Bronze</li>
      </ul>
      <p>Con questa configurazione giochi a 1080p con dettagli alti su qualsiasi titolo AAA 2026, framerati costanti sopra i 100fps su Cyberpunk 2077 e oltre i 144fps su shooter competitivi.</p>

      <h2>Build Mid-Range — €1.500</h2>
      <ul>
        <li><strong>CPU:</strong> Intel Core i7-14700K — 20 core, 5.6 GHz boost</li>
        <li><strong>GPU:</strong> NVIDIA RTX 4070 Super 12GB</li>
        <li><strong>RAM:</strong> 32GB DDR5 6000MHz</li>
        <li><strong>Storage:</strong> Samsung 990 Pro 2TB NVMe</li>
        <li><strong>PSU:</strong> Corsair RM850x 80+ Gold</li>
      </ul>
      <p>La build ideale per il gaming a 1440p con ray-tracing abilitato. DLSS 4 con Frame Generation porta i framerati a livelli impensabili fino a pochi anni fa.</p>

      <h2>Build Top di Gamma — €3.000</h2>
      <ul>
        <li><strong>CPU:</strong> AMD Ryzen 9 7950X — 16 core, 5.7 GHz boost</li>
        <li><strong>GPU:</strong> ASUS ROG RTX 4080 Super 16GB</li>
        <li><strong>RAM:</strong> 64GB DDR5 6000MHz</li>
        <li><strong>Storage:</strong> 2× Samsung 990 Pro 2TB in RAID</li>
        <li><strong>PSU:</strong> Corsair HX1200 80+ Platinum</li>
      </ul>
      <p>Gaming 4K con ray-tracing massimo, editing video 8K in tempo reale, rendering 3D professionale. Una macchina che non sente i limiti del software attuale.</p>

      <div style="background:var(--indigo-soft);border-left:3px solid var(--indigo);border-radius:0 var(--radius-sm) var(--radius-sm) 0;padding:16px 20px;margin:24px 0;">
        💡 <strong>Consiglio ApStore:</strong> Acquistando i singoli componenti su ApStore risparmi mediamente il 12–18% rispetto ai kit preassemblati. Tutti i componenti qui citati sono disponibili con spedizione in 24h.
      </div>

      <h2>Conclusione</h2>
      <p>Qualunque sia il tuo budget, esiste una build 2026 adatta alle tue esigenze. La chiave è non sovra-investire in componenti che vanno oltre le tue necessità reali — una RTX 4060 è sufficiente per il 1080p, e sprecare €500 in più per una 4070 ha senso solo se giochi a 1440p.</p>
    `
  },
  {
    id: 2,
    title: 'AMD vs Intel 2026: quale processore scegliere per gaming e produzione?',
    category: 'Componenti PC',
    excerpt: 'Confronto tecnico tra Ryzen 9000 e Intel Core Ultra 200: efficienza energetica, multi-thread, gaming puro e valore sul lungo periodo. Chi vince nel 2026?',
    date: '8 Giu 2026', readTime: '6 min', icon: '⚡', img: 'https://images.unsplash.com/photo-1591799268116-b9da23dfd4f5?w=400&h=260&fit=crop&q=80',
    body: `
      <h2>Il contesto del 2026</h2>
      <p>AMD ha lanciato l'architettura Zen 5 con il Ryzen 9000 series, mentre Intel ha risposto con i Core Ultra 200 (Arrow Lake) che portano un'architettura ibrida matura e migliorata. La guerra dei processori è più equilibrata che mai.</p>

      <h2>Gaming puro: chi vince?</h2>
      <p>Nei giochi a 1080p CPU-bound (es. CS2, Valorant, Minecraft), Intel Core i9-14900K mantiene un leggero vantaggio grazie alle frequenze elevatissime sui P-core. Nei giochi che sfruttano molti thread o in sessioni prolungate, AMD recupera grazie alla migliore efficienza termica.</p>

      <h2>Produzione e lavoro: AMD domina</h2>
      <p>Nel rendering, encoding video, compilazione e workload AI/ML, il Ryzen 9 7950X con 16 core fisici batte qualsiasi Intel consumer. Il rapporto prestazioni/prezzo nella produzione favorisce AMD in modo netto.</p>

      <h2>Verdetto</h2>
      <p><strong>Solo gaming:</strong> Intel Core i7-14700K al miglior prezzo.<br>
      <strong>Gaming + produzione:</strong> AMD Ryzen 9 7900X o 7950X senza dubbi.<br>
      <strong>Budget entry:</strong> AMD Ryzen 5 7600 rimane imbattibile come rapporto qualità/prezzo.</p>
    `
  },

  /* ── FOTOGRAFIA ── */
  {
    id: 3,
    title: 'Le migliori fotocamere mirrorless del 2026: guida all\'acquisto completa',
    category: 'Fotografia',
    excerpt: 'Sony A7 IV, Nikon Z8, Canon EOS R6 Mark III a confronto. Sensori, autofocus AI, video 4K/8K e autonomia: tutto quello che devi sapere prima di spendere.',
    date: '12 Giu 2026', readTime: '10 min', icon: '📸', img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=260&fit=crop&q=80',
    body: `
      <h2>Il mercato mirrorless nel 2026</h2>
      <p>Le DSLR sono definitivamente tramontate. Il mercato mirrorless è maturo: Sony, Canon e Nikon offrono sistemi completi con ottiche di qualità e body avanzatissimi. La vera novità del 2026 è l'autofocus AI di terza generazione, capace di riconoscere soggetti specifici con precisione millimetrica anche in condizioni di luce difficile.</p>

      <h2>Sony Alpha A7 IV — Il riferimento</h2>
      <p>Con il sensore BSI CMOS da 33MP, IBIS a 5 assi e video 4K 60fps senza crop, la A7 IV è il riferimento assoluto per il full frame sotto i €2.500. L'AF Eye Detection funziona su persone, animali e veicoli con un'affidabilità impressionante.</p>
      <ul>
        <li>✓ Sensore eccellente in condizioni di scarsa luce</li>
        <li>✓ Dual slot SD UHS-II</li>
        <li>✓ Compatibilità con l'intero ecosistema E-mount Sony</li>
        <li>✗ Autonomia media (circa 580 scatti)</li>
      </ul>

      <h2>Nikon Z8 — Per i professionisti</h2>
      <p>Il corpo della Z9 con il prezzo ridotto. Sensore stacked BSI CMOS da 45.7MP, video 8K RAW in-camera, blackout assente. Una bestia per fotografi naturalisti e sportivi.</p>

      <h2>Canon EOS R6 Mark III — Per i video creator</h2>
      <p>Canon ha migliorato drasticamente l'autonomia (oltre 1.000 scatti) e ha introdotto lo shooting 6K overcampionato da 24MP. Ideale per chi fa sia foto che video con un sistema unico.</p>

      <h2>Quale scegliere?</h2>
      <p>Se la foto è la tua priorità: <strong>Sony A7 IV</strong>. Se fai anche video professionali: <strong>Canon R6 III</strong>. Se sei un professionista full-time: <strong>Nikon Z8</strong>.</p>
    `
  },
  {
    id: 4,
    title: 'DJI Mini 4 Pro vs Mini 3 Pro: vale l\'upgrade nel 2026?',
    category: 'Fotografia',
    excerpt: 'Confronto diretto tra i due droni più popolari di DJI nella fascia sub-250g. Obstable avoidance omnidirezionale, ActiveTrack 360° e video HDR: le differenze che contano.',
    date: '3 Giu 2026', readTime: '7 min', icon: '🚁', img: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=260&fit=crop&q=80',
    body: `
      <h2>Perché il limite dei 249g conta</h2>
      <p>In Italia e in Europa, i droni sotto i 250g godono di una regolamentazione più semplice (categoria A1 del regolamento UE). Entrambi i droni restano sotto questa soglia critica, rendendoli la scelta intelligente per chi vuole volare senza troppa burocrazia.</p>

      <h2>Le novità del Mini 4 Pro</h2>
      <p>La differenza principale è l'obstacle avoidance omnidirezionale: il Mini 4 Pro ha sensori su tutti e 4 i lati (avanti, indietro, destra, sinistra) contro il solo avanti/indietro del Mini 3 Pro. In ambienti complessi come boschi o zone urbane, questa feature fa la differenza tra un volo sicuro e un crash.</p>

      <h2>Video: 4K 100fps</h2>
      <p>Il Mini 4 Pro può girare a 4K 100fps per slow motion spettacolari. Il Mini 3 Pro si ferma a 4K 60fps. Per i video creator che amano il rallenty cinematografico, questo è un upgrade significativo.</p>

      <h2>Vale l'upgrade?</h2>
      <p><strong>Se hai già il Mini 3 Pro:</strong> solo se fai voli in ambienti complessi o vuoi il 4K 100fps.<br>
      <strong>Se stai acquistando ora:</strong> sì, il Mini 4 Pro a €759 è la scelta giusta senza compromessi.</p>
    `
  },

  /* ── GAMING ── */
  {
    id: 5,
    title: 'I migliori giochi del 2026: cosa aspettarsi dalla nuova generazione',
    category: 'Gaming',
    excerpt: 'Da GTA VI a Elder Scrolls VII, passando per i nuovi titoli first-party PlayStation e Xbox. Il 2026 è l\'anno della next-gen vera: ecco cosa sta arrivando e su quale piattaforma.',
    date: '14 Giu 2026', readTime: '7 min', icon: '🎮', img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=260&fit=crop&q=80',
    body: `
      <h2>Il 2026: anno del gaming next-gen</h2>
      <p>Dopo anni di titoli cross-gen, il 2026 segna finalmente il distacco dalle console old-gen. Gli sviluppatori possono ora puntare su PS5 e Xbox Series X come target principale, sfruttando SSD ultra-veloci, ray-tracing hardware e audio spaziale.</p>

      <h2>I titoli più attesi</h2>
      <ul>
        <li><strong>GTA VI (Rockstar Games)</strong> — L'uscita più attesa di sempre. Open world di Miami con livello di dettaglio mai visto, fisica avanzata e multiplayer rivisto da zero.</li>
        <li><strong>Death Stranding 2 (Kojima)</strong> — Il sequel del capolavoro di Kojima, con grafica fotorealistica e narrazione ancora più ambiziosa.</li>
        <li><strong>Avowed (Obsidian)</strong> — RPG first-person nel mondo di Pillars of Eternity, esclusiva Xbox/PC.</li>
        <li><strong>Monster Hunter Wilds (Capcom)</strong> — Il capitolo più ambizioso della saga, con ecosistemi dinamici e cacce multiplayer rinnovate.</li>
      </ul>

      <h2>PC vs Console nel 2026</h2>
      <p>Il gap si riduce sempre più. Con una RTX 4070 Super e un Ryzen 7 7700X, un PC mid-range supera PS5 in risoluzione e framerati. La vera differenza resta la libreria di esclusive: se ami i first-party Sony, PS5 rimane insostituibile.</p>

      <h2>Hardware consigliato</h2>
      <p>Per giocare ai titoli 2026 al meglio: monitor 1440p 144Hz (come ASUS ROG Swift OLED), headset wireless (SteelSeries Nova Pro) e mouse di precisione (Razer DeathAdder V3). Tutto disponibile su ApStore.</p>
    `
  },
  {
    id: 6,
    title: 'Setup gaming da 0: guida completa alla postazione perfetta 2026',
    category: 'Gaming',
    excerpt: 'Monitor, sedia, scrivania, illuminazione e accessori: tutto quello che serve per creare la postazione gaming ideale, dall\'entry-level fino al setup pro da streamer.',
    date: '7 Giu 2026', readTime: '9 min', icon: '🕹️', img: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=260&fit=crop&q=80',
    body: `
      <h2>La scrivania: la base di tutto</h2>
      <p>Una scrivania elettrica regolabile in altezza come la Flexispot E7 Pro ti permette di lavorare sia seduto che in piedi, riducendo la fatica nelle sessioni lunghe. Dimensioni minime consigliate: 140×70cm per avere spazio per monitor, tastiera, mouse e accessori senza sentirsi stretti.</p>

      <h2>La sedia: investimento sulla salute</h2>
      <p>Dopo 4–6 ore di sessioni intensive, una sedia economica causa dolori alla schiena. La Secretlab TITAN Evo XL offre supporto lombare regolabile, braccioli 4D e materiale SoftWeave traspirante. Vale ogni centesimo se passi molte ore davanti al PC.</p>

      <h2>Il monitor: il punto focale</h2>
      <p>Per il gaming competitivo: 1080p 240Hz. Per l'esperienza visiva: 1440p 165Hz con pannello IPS/OLED. Il top del 2026 è l'ASUS ROG Swift OLED 27" a 360Hz: colori assoluti e tempi di risposta impercettibili.</p>

      <h2>Audio: spesso sottovalutato</h2>
      <p>Un headset di qualità come lo SteelSeries Arctis Nova Pro Wireless fa la differenza nel gaming competitivo (senti i passi nemici prima) e nell'immersione nei titoli single-player. Il microfono ClearCast è perfetto anche per lo streaming.</p>

      <h2>Illuminazione</h2>
      <p>Una striscia LED RGB dietro il monitor riduce l'affaticamento visivo nelle sessioni notturne. I kit Philips Hue Play o le strisce RGB Govee offrono sincronizzazione con il gioco per un'esperienza immersiva totale.</p>
    `
  },

  /* ── ELETTRODOMESTICI ── */
  {
    id: 7,
    title: 'Smart Home 2026: i migliori elettrodomestici connessi per ogni stanza',
    category: 'Elettrodomestici',
    excerpt: 'Dalla cucina al bagno: una panoramica completa degli elettrodomestici smart più utili del 2026. Cosa vale davvero l\'acquisto e cosa è solo gadget inutile.',
    date: '5 Giu 2026', readTime: '8 min', icon: '🏠', img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=260&fit=crop&q=80',
    body: `
      <h2>La smart home nel 2026: finalmente matura</h2>
      <p>Dopo anni di promesse, l'ecosistema smart home è finalmente interoperabile grazie allo standard Matter, supportato da Apple, Google, Amazon e Samsung. Un dispositivo certificato Matter funziona con qualsiasi hub, senza lock-in.</p>

      <h2>Cucina: cosa comprare</h2>
      <ul>
        <li><strong>Macchina da caffè:</strong> De Longhi La Specialista Arte — macinacaffè integrato, controllo temperatura preciso, app per personalizzare le ricette. Il barista in casa.</li>
        <li><strong>Forno:</strong> Bosch Serie 8 con steam assist — cottura a vapore integrata, 13 funzioni di cottura, precaldamento rapido in 5 minuti.</li>
        <li><strong>Frigorifero:</strong> Samsung Family Hub con display touchscreen integrato — lista della spesa automatica, telecamera interna accessibile da smartphone.</li>
      </ul>

      <h2>Lavanderia: automazione totale</h2>
      <p>La Samsung WW11BB con AI EcoWash riconosce il tipo di tessuto, la quantità di bucato e imposta automaticamente il programma ottimale. Risparmio idrico fino al 30% rispetto ai modelli tradizionali. L'app ti avvisa quando il bucato è finito.</p>

      <h2>Pulizia: robot e non solo</h2>
      <p>Il Dyson V15 Detect con laser che rivela le particelle di polvere invisibili all'occhio è la scelta definitiva per chi soffre di allergie. L'autonomia di 60 minuti basta per appartamenti fino a 120mq.</p>

      <h2>Cosa evitare</h2>
      <p>Elettrodomestici smart con app proprietarie non standard (senza Matter), frigoriferi con display Android integrato a prezzo premium ma con supporto software garantito solo 2–3 anni, e qualsiasi "smart" gadget che si connette solo via Bluetooth.</p>
    `
  },
  {
    id: 8,
    title: 'Macchine da caffè 2026: espresso, capsule o filtro? La guida definitiva',
    category: 'Elettrodomestici',
    excerpt: 'Confronto tra i principali sistemi: espresso manuale, superautomatica, Nespresso e caffè filtro. Costi reali a lungo termine, qualità nella tazza e facilità d\'uso.',
    date: '28 Mag 2026', readTime: '6 min', icon: '☕', img: 'https://images.unsplash.com/photo-1495474745390-23648d9e46ee?w=400&h=260&fit=crop&q=80',
    body: `
      <h2>Il costo reale per tazza</h2>
      <p>Il fattore spesso ignorato nell'acquisto di una macchina da caffè è il costo per tazza nel lungo periodo:</p>
      <ul>
        <li><strong>Capsule Nespresso:</strong> €0.40–0.60 per tazza</li>
        <li><strong>Superautomatica con grani:</strong> €0.15–0.25 per tazza</li>
        <li><strong>Espresso manuale con macinino:</strong> €0.10–0.20 per tazza</li>
        <li><strong>Caffè filtro (V60, Chemex):</strong> €0.08–0.15 per tazza</li>
      </ul>
      <p>Chi beve 2 caffè al giorno su una macchina a capsule, spende €250–450 in capsule ogni anno. Con grani di qualità e una superautomatica, la spesa scende a €100–180.</p>

      <h2>De Longhi La Specialista Arte: il meglio del manuale</h2>
      <p>Macinacaffè integrato con 8 impostazioni di macinatura, pompa da 15 bar, controllo temperatura digitale e accessori professionali inclusi. L'espresso che produce rivaleggia con bar di fascia media.</p>

      <h2>Chi sceglie cosa</h2>
      <p><strong>Vuoi il miglior espresso possibile:</strong> De Longhi Specialista Arte + macinino separato.<br>
      <strong>Vuoi comodità massima:</strong> superautomatica De Longhi o Jura.<br>
      <strong>Bevi poco e veloce:</strong> Nespresso Vertuo Next.<br>
      <strong>Ami l'esperienza del caffè specialty:</strong> caffè filtro con V60 o AeroPress.</p>
    `
  },

  /* ── MONITOR ── */
  {
    id: 9,
    title: 'Monitor OLED vs IPS nel 2026: quale tecnologia scegliere?',
    category: 'Monitor',
    excerpt: 'OLED ha conquistato il mercato dei monitor da gaming e produzione. Ma vale il prezzo premium rispetto agli IPS? Analisi approfondita con dati reali su contrasto, uniformità e burn-in.',
    date: '1 Giu 2026', readTime: '7 min', icon: '🖥', img: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=260&fit=crop&q=80',
    body: `
      <h2>OLED arriva sul desktop</h2>
      <p>Dopo aver dominato i TV per anni, la tecnologia OLED ha raggiunto la maturità anche sui monitor da 27–32 pollici. I pannelli QD-OLED di Samsung e i W-OLED di LG offrono prestazioni cromatiche e di contrasto impossibili per qualsiasi IPS.</p>

      <h2>I vantaggi dell'OLED</h2>
      <ul>
        <li><strong>Contrasto:</strong> nero assoluto vs grigio scuro degli IPS (infinito:1 vs 1000:1 tipico)</li>
        <li><strong>Tempi di risposta:</strong> 0.1ms vs 1ms degli IPS migliori</li>
        <li><strong>Colori:</strong> copertura DCI-P3 99%+ vs 90–95% degli IPS premium</li>
        <li><strong>Gaming:</strong> motion blur praticamente assente</li>
      </ul>

      <h2>Gli svantaggi da considerare</h2>
      <ul>
        <li><strong>Burn-in:</strong> il rischio esiste con elementi statici prolungati (barre di sistema, HUD fissi). I pannelli moderni hanno mitigazioni, ma il rischio non è zero</li>
        <li><strong>Luminosità:</strong> picco elevato (1000nit+) ma brillantezza sostenuta inferiore agli IPS in HDR</li>
        <li><strong>Prezzo:</strong> 2–3× il costo di un IPS equivalente</li>
      </ul>

      <h2>Verdetto 2026</h2>
      <p>Per gaming e multimedia: <strong>OLED senza dubbi</strong> se il budget lo permette.<br>
      Per lavoro con elementi statici 8+ ore/giorno (spreadsheet, coding): <strong>IPS rimane più sicuro</strong>.<br>
      Il miglior compromesso sul mercato: LG 27GP950-B 4K IPS 144Hz (su ApStore a €549).</p>
    `
  },

  /* ── SMARTPHONE ── */
  {
    id: 10,
    title: 'iPhone 16 Pro vs Galaxy S25 Ultra: confronto definitivo 2026',
    category: 'Smartphone',
    excerpt: 'Il duello più atteso dell\'anno. Fotocamera, batteria, prestazioni AI e aggiornamenti software: analisi tecnica dettagliata per aiutarti a scegliere il flagship giusto per te.',
    date: '10 Giu 2026', readTime: '8 min', icon: '📱', img: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&h=260&fit=crop&q=80',
    body: `
      <h2>Design e display</h2>
      <p>L'iPhone 16 Pro introduce il Dynamic Island evoluto e il display Super Retina XDR da 6.3" con ProMotion 120Hz. Il Samsung S25 Ultra porta un display Dynamic AMOLED da 6.9" con luminosità di picco superiore (2600nit vs 2000nit).</p>

      <h2>Fotocamera: il cuore della scelta</h2>
      <p>Samsung vince in versatilità con il sistema quad-camera: 200MP principale, teleobiettivo periscopico 10× e grandangolo 12MP. Apple risponde con la qualità computazionale del chip A18 Pro: i video con il sistema ProCamera sono semplicemente i migliori dello smartphone in circolazione.</p>

      <h2>Intelligenza Artificiale</h2>
      <p>Apple Intelligence (iOS 18) integra l'AI direttamente nel sistema operativo con elaborazione on-device. Galaxy AI di Samsung è più versatile nelle funzioni ma elabora molti compiti in cloud. Per la privacy: Apple vince nettamente.</p>

      <h2>Ecosistema e aggiornamenti</h2>
      <p>Apple garantisce 6 anni di aggiornamenti iOS. Samsung ha migliorato (4 anni di OS) ma resta indietro. Se hai Mac, AirPods e iPad, l'iPhone 16 Pro si integra in modo impareggiabile.</p>

      <h2>Chi sceglie cosa</h2>
      <p><strong>Ecosystem Apple:</strong> iPhone 16 Pro senza pensarci.<br>
      <strong>Android e fotografia:</strong> Galaxy S25 Ultra.<br>
      <strong>Budget ottimizzato:</strong> Galaxy S25 base o iPhone 16 standard.</p>
    `
  },

  /* ── NETWORKING ── */
  {
    id: 11,
    title: 'Wi-Fi 6E e Wi-Fi 7 nel 2026: vale l\'upgrade del router?',
    category: 'Networking',
    excerpt: 'La banda dei 6GHz ha cambiato le regole del wireless domestico. Latenza ultra-bassa, velocità fino a 11Gbps teorici e multi-link operation: tutto quello che devi sapere prima di acquistare.',
    date: '25 Mag 2026', readTime: '6 min', icon: '📡', img: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=260&fit=crop&q=80',
    body: `
      <h2>Wi-Fi 6E: la banda dei 6GHz</h2>
      <p>La vera novità del Wi-Fi 6E non è la velocità in sé, ma la banda dei 6GHz praticamente deserta. Mentre i 2.4GHz e i 5GHz sono spesso saturi in condomini e uffici, i 6GHz offrono canali puliti e latenze costantemente sotto i 5ms.</p>

      <h2>Wi-Fi 7: MLO cambia tutto</h2>
      <p>Multi-Link Operation (MLO) permette ai dispositivi Wi-Fi 7 di usare simultaneamente più bande. Il risultato: velocità aggregate fino a 36Gbps teorici, latenza ridotta ulteriormente e failover automatico se una banda è congestionata.</p>

      <h2>Vale l'upgrade nel 2026?</h2>
      <p><strong>Se hai ancora Wi-Fi 5 (802.11ac):</strong> sì, l'upgrade a Wi-Fi 6E è significativo, specialmente se hai molti dispositivi connessi contemporaneamente.</p>
      <p><strong>Se hai già Wi-Fi 6:</strong> aspetta Wi-Fi 7 se stai usando dispositivi compatibili (iPhone 15 Pro+, Galaxy S24+, MacBook 2024+).</p>

      <h2>Il consiglio ApStore</h2>
      <p>L'ASUS ZenWiFi Pro ET12 (Wi-Fi 6E, Tri-Band) a €449 è la scelta ideale per appartamenti e case fino a 200mq. Con velocità fino a 11Gbps sulla banda dei 6GHz e mesh nativa, è a prova di futuro per almeno 5 anni.</p>
    `
  },

  /* ── BUSINESS / SELLPILOT ── */
  {
    id: 12,
    title: 'SellPilot & E-commerce: come automatizzare le vendite online con AI nel 2026',
    category: 'Business',
    excerpt: 'Come integrare strumenti di sales intelligence e AI nel tuo store per massimizzare le conversioni, automatizzare il follow-up clienti e scalare il business senza aumentare il team.',
    date: '20 Mag 2026', readTime: '10 min', icon: '🚀', img: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=260&fit=crop&q=80',
    body: `
      <h2>L'e-commerce nel 2026: la sfida dell'automazione</h2>
      <p>Con la saturazione dei canali pubblicitari tradizionali e il costo di acquisizione clienti in continua crescita, l'unico modo per scalare un e-commerce in modo profittevole è automatizzare i processi ripetitivi e concentrare l'energia umana sulle decisioni strategiche.</p>

      <h2>Cosa fa SellPilot</h2>
      <p>SellPilot.it è una piattaforma di sales intelligence per e-commerce che combina CRM, automazione email/SMS, analytics predittivi e integrazione multi-canale (Amazon, eBay, Shopify, WooCommerce). Pensata per PMI e store indipendenti che vogliono strumenti enterprise senza i costi enterprise.</p>

      <h2>I tre pilastri dell'automazione</h2>
      <ul>
        <li><strong>Sequenze di follow-up automatiche:</strong> Quando un cliente abbandona il carrello, SellPilot invia automaticamente una sequenza personalizzata (email + SMS + remarketing) con il timing ottimizzato dall'AI. Tasso di recupero medio: 18–25%.</li>
        <li><strong>Lead scoring predittivo:</strong> L'AI analizza il comportamento degli utenti sul sito e assegna un punteggio di conversione. I clienti con score alto vengono contattati per primi dal team commerciale.</li>
        <li><strong>Repricing dinamico:</strong> I prezzi si aggiornano automaticamente in base alla concorrenza, alle giacenze e alla domanda stagionale. Margine medio migliorato del 7–12%.</li>
      </ul>

      <h2>Integrazione con ApStore</h2>
      <p>Il sito che stai navigando è costruito su ApStore, il frontend e-commerce. SellPilot gestisce il backend CRM, le campagne automatizzate e l'analytics. Insieme formano un ecosistema completo per vendere online senza sprechi.</p>

      <h2>Come iniziare</h2>
      <p>Visita <a href="https://sellpilot.it" style="color:var(--indigo);">sellpilot.it</a> per una demo gratuita. In 30 minuti vedrai esattamente quanti ricavi stai lasciando sul tavolo con i processi manuali attuali.</p>
    `
  },
];

/* ── CART ── */
const Cart = {
  items: JSON.parse(localStorage.getItem('apstore_cart') || '[]'),
  add(productId, qty = 1) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    const existing = this.items.find(i => i.id === productId);
    if (existing) { existing.qty += qty; } else { this.items.push({ id: productId, qty }); }
    this.save();
    showToast(`${product.name.slice(0, 34)}… aggiunto al carrello`, 'success');
    updateCartBadge();
  },
  remove(productId) { this.items = this.items.filter(i => i.id !== productId); this.save(); updateCartBadge(); },
  updateQty(productId, qty) { const item = this.items.find(i => i.id === productId); if (item) { item.qty = Math.max(1, qty); this.save(); } },
  getTotal() { return this.items.reduce((sum, item) => { const p = PRODUCTS.find(pr => pr.id === item.id); return sum + (p ? p.price * item.qty : 0); }, 0); },
  getCount() { return this.items.reduce((s, i) => s + i.qty, 0); },
  save() { localStorage.setItem('apstore_cart', JSON.stringify(this.items)); }
};

const Wishlist = {
  items: JSON.parse(localStorage.getItem('apstore_wish') || '[]'),
  toggle(id) {
    if (this.items.includes(id)) { this.items = this.items.filter(i => i !== id); showToast('Rimosso dai preferiti', 'info'); }
    else { this.items.push(id); showToast('Aggiunto ai preferiti ♥', 'success'); }
    localStorage.setItem('apstore_wish', JSON.stringify(this.items));
  },
  has(id) { return this.items.includes(id); }
};

/* ── UTILITIES ── */
function showToast(msg, type = 'info') {
  let c = document.querySelector('.toast-container');
  if (!c) { c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); }
  const icons = { success: '✓', error: '✕', info: 'i' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span style="font-weight:900;font-size:.9rem;">${icons[type]}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, 3000);
}

function updateCartBadge() {
  const n = Cart.getCount();
  document.querySelectorAll('#cartBadge, .cart-badge').forEach(el => {
    el.textContent = n;
    el.style.display = n > 0 ? 'flex' : 'none';
  });
}

function formatPrice(n) { return '€' + n.toFixed(2).replace('.', ','); }

function renderStars(r) {
  const full = Math.floor(r);
  let s = '★'.repeat(full);
  if (r % 1 >= 0.5) s += '½';
  return s;
}

const CAT_GRADIENT = {
  'componenti-pc':   'linear-gradient(135deg,#eef0ff 0%,#c7d2fe 100%)',
  'elettrodomestici':'linear-gradient(135deg,#fffbeb 0%,#fde68a 100%)',
  'fotografia-video':'linear-gradient(135deg,#ecfdf5 0%,#a7f3d0 100%)',
  'gaming':          'linear-gradient(135deg,#fdf2f8 0%,#fbcfe8 100%)',
  'arredo':          'linear-gradient(135deg,#f0fdf4 0%,#bbf7d0 100%)',
  'networking':      'linear-gradient(135deg,#fff7ed 0%,#fed7aa 100%)',
  'smartphone':      'linear-gradient(135deg,#f0f9ff 0%,#bae6fd 100%)',
  'monitor':         'linear-gradient(135deg,#f5f3ff 0%,#ddd6fe 100%)',
};

function renderProductCard(p) {
  const disc  = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : null;
  const badge = p.badge ? `<span class="product-card-badge badge-${p.badge === 'NEW' ? 'new' : 'promo'}">${p.badge}</span>` : '';
  const bg    = CAT_GRADIENT[p.category] || 'linear-gradient(135deg,#f3f4f6,#e5e7eb)';
  return `<div class="product-card">
  <a href="prodotto.html?id=${p.id}" style="text-decoration:none;color:inherit;display:block;">
    <div class="product-card-img" style="background:${bg}">${badge}<span class="prod-emoji">${p.icon}</span>${p.img ? `<img src="${p.img}" alt="${p.name}" loading="lazy" onerror="this.remove()">` : ''}</div>
    <div class="product-card-body">
      <div class="product-category">${p.sub}</div>
      <div class="product-name">${p.name}</div>
      <div class="product-price-row">
        <span class="price-now">${formatPrice(p.price)}</span>
        <span class="product-price-right">
          ${p.oldPrice ? `<span class="price-was">${formatPrice(p.oldPrice)}</span>` : ''}
          ${disc ? `<span class="price-save">-${disc}%</span>` : ''}
        </span>
      </div>
    </div>
  </a>
  <div class="product-card-footer">
    <button class="btn-add-cart" onclick="Cart.add(${p.id})"><span class="btn-add-cart-label">${p.stock ? 'Aggiungi al carrello' : 'Avvisami'}</span><span class="btn-add-cart-arrow">→</span></button>
  </div>
</div>`;
}

document.addEventListener('DOMContentLoaded', () => { updateCartBadge(); });
