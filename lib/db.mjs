import { neon } from "@neondatabase/serverless";

const POOLED_VARIABLES = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
];

const DIRECT_VARIABLES = [
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_URL",
];

let client;

function findConnectionString(variables) {
  const name = variables.find((variable) => process.env[variable]);

  if (!name) {
    throw new Error(
      `Nessuna connessione al database configurata: impostare una di ${variables.join(", ")}`,
    );
  }

  return process.env[name];
}

export function getSql() {
  if (!client) {
    client = neon(findConnectionString(POOLED_VARIABLES));
  }

  return client;
}

export function createDirectSql() {
  return neon(findConnectionString(DIRECT_VARIABLES));
}
