import { getSql } from "../lib/db.mjs";

const HIVE_COUNT = 10;
const MAX_BODY_LENGTH = 5000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

function isAuthorized(request) {
  const token = process.env.APP_TOKEN;

  return !token || request.headers["x-app-token"] === token;
}

function parseBody(request) {
  if (typeof request.body === "string") {
    return JSON.parse(request.body);
  }

  return request.body || {};
}

function toDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${date.getUTCFullYear()}-${month}-${day}`;
}

async function readDay(sql, date, response) {
  const rows = await sql`
    select hive_number, body from hive_notes where note_date = ${date}
  `;
  const notes = {};

  rows.forEach((row) => {
    notes[row.hive_number] = row.body;
  });

  return response.status(200).json({ date, notes });
}

async function readMonth(sql, month, response) {
  const rows = await sql`
    select distinct note_date
    from hive_notes
    where to_char(note_date, 'YYYY-MM') = ${month}
  `;

  return response.status(200).json({
    month,
    dates: rows.map((row) => toDateKey(row.note_date)),
  });
}

async function writeNote(sql, payload, response) {
  const hive = Number(payload.hive);
  const date = payload.date;
  const body = typeof payload.body === "string" ? payload.body.trim() : "";

  if (!Number.isInteger(hive) || hive < 1 || hive > HIVE_COUNT) {
    return response.status(400).json({ error: "Numero arnia non valido" });
  }

  if (typeof date !== "string" || !DATE_PATTERN.test(date)) {
    return response.status(400).json({ error: "Data non valida" });
  }

  if (body.length > MAX_BODY_LENGTH) {
    return response.status(400).json({ error: "Nota troppo lunga" });
  }

  if (body) {
    await sql`
      insert into hive_notes (hive_number, note_date, body)
      values (${hive}, ${date}, ${body})
      on conflict (hive_number, note_date)
      do update set body = excluded.body, updated_at = now()
    `;
  } else {
    await sql`
      delete from hive_notes where hive_number = ${hive} and note_date = ${date}
    `;
  }

  return response.status(200).json({ hive, date, saved: Boolean(body) });
}

export default async function handler(request, response) {
  if (!isAuthorized(request)) {
    return response.status(401).json({ error: "Non autorizzato" });
  }

  try {
    const sql = getSql();

    if (request.method === "GET") {
      const { date, month } = request.query;

      if (typeof date === "string" && DATE_PATTERN.test(date)) {
        return await readDay(sql, date, response);
      }

      if (typeof month === "string" && MONTH_PATTERN.test(month)) {
        return await readMonth(sql, month, response);
      }

      return response.status(400).json({ error: "Indicare date=YYYY-MM-DD o month=YYYY-MM" });
    }

    if (request.method === "PUT") {
      return await writeNote(sql, parseBody(request), response);
    }

    response.setHeader("Allow", "GET, PUT");

    return response.status(405).json({ error: "Metodo non consentito" });
  } catch (error) {
    console.error(error);

    return response.status(500).json({ error: "Errore del server" });
  }
}
