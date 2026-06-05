# ConvocaApp v17

Versione con interfaccia grafica migliorata: header più moderno, navigazione compatta, card più pulite, calendario più leggibile, tabelle e popup ridisegnati.

Funzionalità principali mantenute dalla v16:
- calendario eventi singoli e periodici
- allenamenti e partite collegati al calendario
- convocazioni con editor PDF
- statistiche giocatori/portieri e disciplina
- sponsor con storico spese
- modalità staff/editor

Accesso staff demo: password `staff`.


Versione 19: restyling dello sfondo globale con gradienti e glow decorativi per un look più moderno e meno piatto.


Versione 20: aggiunta manutenzione statistiche con pulizia dati orfani e ricalcolo da eventi esistenti.


## Versione 21 PWA

Questa versione aggiunge:
- `manifest.webmanifest`
- `service-worker.js`
- icone app 192/512 px
- supporto installazione su schermata Home Android/iPhone

### Come aggiornare Netlify senza sprecare deploy
Carica questa versione solo quando vuoi sostituire quella online:
Netlify → sito → Deploys → drag and drop della cartella `convoca-app-v21-pwa`.

### Installazione telefono
iPhone: apri con Safari → Condividi → Aggiungi alla schermata Home.
Android: apri con Chrome → tre puntini → Installa app / Aggiungi a schermata Home.


## Versione 22 Mobile

Correzioni:
- calendario adattato meglio a smartphone;
- celle mese uniformi a 7 colonne, senza scorrimento orizzontale;
- eventi più compatti su telefono;
- aggiornato service worker/cache per evitare versioni vecchie;
- aggiunto `_headers` per ridurre cache Netlify.

Se dopo il deploy vedi ancora la vecchia versione:
1. apri il link in finestra anonima;
2. su iPhone elimina l'icona dalla Home e aggiungila di nuovo;
3. su Android cancella dati sito o disinstalla la PWA e reinstallala;
4. aspetta qualche minuto e riapri il link pubblico `.netlify.app`.


## Versione 23 Mobile Fix

Correzioni rispetto alla schermata inviata:
- meta viewport forzato;
- blocco overflow orizzontale;
- header/nav/container adattati al 100% del telefono;
- calendario a 7 colonne reali, celle uniformi;
- eventi compatti senza deformare le celle;
- agenda mobile leggibile sotto al calendario;
- cache service worker aggiornata a v23.

Dopo il deploy su Netlify, se il telefono mostra ancora la vecchia versione, elimina l'app dalla schermata Home e riaprila da Safari/Chrome.


## Versione 24 Force Update

Build: v24-force-update-20260605

Questa versione:
- mostra un badge in basso con la versione;
- include `VERSION.txt` per verificare il deploy;
- cancella cache e vecchi service worker al primo caricamento;
- forza un reload automatico la prima volta.

Test dopo deploy:
1. apri `https://TUO-SITO.netlify.app/VERSION.txt`
2. deve comparire `v24-force-update-20260605`
3. apri poi il sito normale.


## Versione 25 Cache Bust

Build: v25-cache-bust-20260605

Questa versione rinomina gli asset:
- `styles-v25.css`
- `app-v25.js`

Serve a impedire che Safari/iPhone/PWA continui a caricare vecchi file `styles.css` e `app.js`.

Test:
1. apri `/VERSION.txt`;
2. deve indicare `v25-cache-bust-20260605`;
3. apri il sito con `?resetassets=1`;
4. se i dati interni sembrano vecchi, usa il pulsante `Reset dati locali`.


## Versione 26 - Supabase Sync

Build: v26-supabase-sync-20260605

Questa versione sincronizza tutto lo stato dell'app su Supabase nella tabella `app_state`.

### Procedura
1. Supabase → SQL Editor → New query.
2. Incolla ed esegui il contenuto di `supabase-setup.sql`.
3. Apri `config.js`.
4. Inserisci:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
5. Carica la cartella su Netlify.

### Prima sincronizzazione
Apri l'app dal PC dove vedi i dati corretti, ad esempio i 25 giocatori.
Clicca in basso:
`Carica questo PC sul cloud`.

Poi apri dal telefono e clicca:
`Scarica cloud`.

Da quel momento i dispositivi leggono e salvano lo stesso archivio.
