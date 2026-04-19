# HFBS Dashboard

Dashboard per l'Executive Education di H-FARM Business School. Legge i dati da un Google Apps Script Web App (il "datalake") e li visualizza in otto tab: Panoramica, Per prodotto, Marketing, Insights, Qualità, P&L Prodotti, P&L OP, Monitor fonti.

## Struttura del progetto

```
index.html               Shell HTML (mount point + tab)
styles/
  main.css               Tutto lo stile
src/
  config.js              URL datalake di default + costanti app
  constants.js           Mapping intake, tipi corso, stage, colori
  state.js               Stato condiviso (DL, filtri, cache)
  main.js                Entry point: setup, tab switching, refresh
  utils/
    format.js            fE, fEk, fD, fDshort
    normalize.js         nI, nP, dTS, cSt, bC
    dom.js               Helper DOM
  data/
    schema.js            Validazione chiavi del datalake
    fetch.js             Fetch + fallback JSONP
    buildCorsi.js        Pipeline di aggregazione corsi
    helpers.js           Spend, campagne, GA4, brochure, ritardi, overlap
  charts/
    dailyChart.js        Trend giornaliero campagne
  tabs/
    panoramica.js
    prodotto.js
    marketing.js
    insights.js
    qualita.js
    pl.js
    plop.js
    monitor.js
.github/workflows/
  deploy.yml             Deploy automatico su GitHub Pages
```

## Come funziona

- L'entry point [`src/main.js`](src/main.js) orchestra tutto: al `DOMContentLoaded` monta i listener dei tab, espone l'URL del datalake nel pannello nascosto e lancia `refreshData()`.
- Il refresh chiama il datalake (fetch + fallback JSONP su errore CORS), valida lo schema e scrive il risultato in `state.DL`.
- `buildCorsi()` fonde tutte le fonti in una lista di corsi normalizzati (con cache invalidata a ogni refresh).
- Ogni tab è un modulo autonomo: prende `state`, produce HTML, lo inietta nel proprio contenitore.

## Configurazione datalake

L'URL di default è in [`src/config.js`](src/config.js):

```js
export const DEFAULT_DATALAKE_URL = 'https://script.google.com/macros/s/.../exec';
```

Per cambiarlo:
- **Una tantum dall'UI**: click sul bottone **URL** nell'header → incolla nuovo URL → "Salva e carica". Viene memorizzato in `localStorage` (chiave `hfarm_datalake_url`) e ha priorità sul default.
- **Permanente**: modifica `DEFAULT_DATALAKE_URL` in `src/config.js` e fai commit.

## Sviluppo locale

I moduli ES richiedono un server HTTP (non funzionano con `file://`). Qualsiasi server statico va bene:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

Apri `http://localhost:8080/`.

## Deploy

Il deploy è automatico: ogni push su `main` triggera [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) che pubblica la cartella radice su GitHub Pages.

**Setup iniziale (una volta sola):**
1. Repository Settings → Pages → Source: **GitHub Actions**
2. Fai il primo push su `main`: il workflow publica il sito all'URL `https://<user>.github.io/<repo>/`

Nessuna build: è tutto HTML/CSS/JS servito statico.

## Come aggiornare

**Modifica a un tab:** tocca solo il modulo corrispondente in `src/tabs/<nome>.js`, commit, push. Ogni tab è isolato — non rischi regressioni altrove.

**Nuova metrica calcolata sui corsi:** aggiungi un campo in [`src/data/buildCorsi.js`](src/data/buildCorsi.js), poi leggilo nei tab che servono.

**Cambio schema del datalake:** aggiorna la lista `EXPECTED_KEYS` in [`src/data/schema.js`](src/data/schema.js). I warning compaiono in console se il datalake non rispetta più lo schema atteso (non blocca il rendering).

**Nuovo tab:**
1. Crea `src/tabs/<nome>.js` con una funzione `render<Nome>()`
2. Aggiungi il tab in `index.html` (voce nei `.tabs` + `<div class="tab-panel" id="tab-<nome>">`)
3. Registra il render in `main.js` (import + branch in `switchTab` o dentro `renderAll`)

**Modifica stili:** tutto in [`styles/main.css`](styles/main.css). Le variabili CSS (colori, radius, font) sono in cima nel blocco `:root`.
