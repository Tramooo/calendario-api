const CONNECTION_VARIABLES = [
  "DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
];

const savedEnvironment = Object.fromEntries(
  CONNECTION_VARIABLES.map((variable) => [variable, process.env[variable]]),
);

function clearConnectionVariables() {
  CONNECTION_VARIABLES.forEach((variable) => delete process.env[variable]);
}

const failures = [];

function expect(name, actual, expected) {
  if (actual !== expected) {
    failures.push(`${name}: atteso ${expected}, ottenuto ${actual}`);
    return;
  }

  console.log(`ok - ${name}`);
}

const { createDirectSql, getSql } = await import("../lib/db.mjs");

clearConnectionVariables();

let missingMessage = "";

try {
  createDirectSql();
} catch (error) {
  missingMessage = error.message;
}

expect(
  "errore chiaro se nessuna variabile e impostata",
  missingMessage.startsWith("Nessuna connessione al database configurata"),
  true,
);

process.env.POSTGRES_URL = "postgresql://utente:password@ep-legacy-pooler.aws.neon.tech/neondb";
expect(
  "la variabile legacy POSTGRES_URL viene accettata",
  typeof createDirectSql(),
  "function",
);

process.env.DATABASE_URL_UNPOOLED = "postgresql://utente:password@ep-direct.aws.neon.tech/neondb";
expect("connessione diretta disponibile", typeof createDirectSql(), "function");

process.env.DATABASE_URL = "postgresql://utente:password@ep-pooled-pooler.aws.neon.tech/neondb";
expect("connessione pooled disponibile", typeof getSql(), "function");

Object.entries(savedEnvironment).forEach(([variable, value]) => {
  if (value === undefined) {
    delete process.env[variable];
  } else {
    process.env[variable] = value;
  }
});

if (failures.length > 0) {
  console.error(`\n${failures.length} test falliti:`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("\nTutti i test superati.");
}
