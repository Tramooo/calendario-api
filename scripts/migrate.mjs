import { readFile } from "node:fs/promises";
import { getSql } from "../lib/db.mjs";

const schemaPath = new URL("../db/schema.sql", import.meta.url);
const sql = getSql();
const statements = (await readFile(schemaPath, "utf8"))
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

for (const statement of statements) {
  await sql.query(statement);
  console.log(`eseguito: ${statement.split("\n")[0]}`);
}

console.log(`Migrazione completata (${statements.length} istruzioni).`);
