import { neon } from "@neondatabase/serverless";

let client;

export function getSql() {
  if (!client) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL non configurata");
    }

    client = neon(connectionString);
  }

  return client;
}
