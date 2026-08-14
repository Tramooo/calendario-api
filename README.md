# Diario Arnie

App per tenere traccia delle attivita svolte nelle arnie, con database Neon (Postgres) e API
serverless su Vercel.

## Funzionalita

- Interfaccia su una sola schermata fissa, senza scorrimento verticale.
- Titolo illustrato con ape e fregio a nido d'ape, piu api decorative animate.
- Selettore della data con frecce per scorrere i giorni.
- Clic sulla data: si apre il calendario per scegliere un giorno preciso.
- 10 arnie in 2 file da 5, ognuna con icona numerata e propria casella di testo.
- Ogni casella salva da sola le attivita del giorno selezionato, senza pulsanti.
- Pallino sui giorni del calendario che hanno gia delle note.
- Le note sono salvate su Neon, con copia locale nel browser per l'uso senza rete.

## Struttura

- `index.html`, `styles.css`, `app.js`: interfaccia statica.
- `api/notes.mjs`: API per leggere e salvare le note.
- `lib/db.mjs`: connessione a Neon.
- `db/schema.sql`: tabella `hive_notes`.
- `scripts/migrate.mjs`: crea la tabella sul database.
- `scripts/test-api.mjs`: test delle risposte dell'API.

## Configurazione

Se usi Neon tramite l'integrazione del Marketplace di Vercel non devi impostare nulla a mano:
l'integrazione inietta da sola `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (diretta) e le
vecchie `POSTGRES_*`. L'app riconosce tutti questi nomi e preferisce la connessione pooled per le
richieste, quella diretta per le migrazioni.

Se invece colleghi Neon a mano, basta impostare `DATABASE_URL` con la connection string pooled.

Variabile opzionale, ma consigliata:

- `APP_TOKEN`: se impostata, l'API accetta solo richieste con l'intestazione `x-app-token`.
  Senza di essa chiunque conosca l'indirizzo del sito puo leggere e scrivere le note.
  Dopo averla aggiunta su Vercel, apri il sito una volta con `?token=IL_TUO_TOKEN`: il browser lo
  memorizza e continui a usare l'app normalmente.

## Primo avvio

La tabella va creata una sola volta. Due modi equivalenti.

Dalla console Neon: apri il progetto, vai nell'SQL Editor e incolla il contenuto di
`db/schema.sql`.

Oppure dal tuo computer, scaricando le variabili dal progetto Vercel:

```bash
npm install
npx vercel link
npx vercel env pull .env.local
npm run migrate
```

Fatto questo, il deploy su Vercel funziona senza altri passaggi.

## Sviluppo locale

```bash
npx vercel dev
```

`vercel dev` serve insieme la pagina e le funzioni in `api/`, usando le variabili di `.env.local`.

## Verifiche

```bash
npm run check
npm test
```

## Note tecniche

- Una nota per arnia e per giorno: chiave primaria `(hive_number, note_date)`.
- Svuotare la casella di testo cancella la riga dal database.
- Senza rete l'app mostra l'ultima copia locale e mette le modifiche in coda, inviandole appena la
  connessione torna disponibile.
