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

Serve una sola variabile d'ambiente obbligatoria:

- `DATABASE_URL`: stringa di connessione Neon, quella "pooled"
  (`postgresql://...-pooler....neon.tech/neondb?sslmode=require`).

Variabile opzionale:

- `APP_TOKEN`: se impostata, l'API accetta solo richieste con l'intestazione `x-app-token`.
  Consigliata, perche altrimenti chiunque conosca l'indirizzo del sito puo leggere e scrivere note.
  Dopo averla impostata, apri il sito una volta con `?token=IL_TUO_TOKEN`: il browser lo memorizza.

## Primo avvio

1. Crea il progetto su [Neon](https://neon.com) e copia la connection string pooled.
2. In locale, copia `.env.example` in `.env` e incolla la stringa in `DATABASE_URL`.
3. Crea la tabella:

```bash
npm install
npm run migrate
```

4. Su Vercel, aggiungi `DATABASE_URL` (e `APP_TOKEN` se la usi) tra le Environment Variables del
   progetto, poi fai il deploy.

## Sviluppo locale

```bash
npm install -g vercel
npm run dev
```

`vercel dev` serve insieme la pagina e le funzioni in `api/`.

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
