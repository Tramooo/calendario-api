process.env.DATABASE_URL ||= "postgresql://utente:password@ep-test-pooler.eu-central-1.aws.neon.tech/neondb";

const { default: handler } = await import("../api/notes.mjs");

function createResponse() {
  return {
    statusCode: 0,
    payload: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };
}

async function call(request) {
  const response = createResponse();
  await handler({ headers: {}, query: {}, ...request }, response);

  return response;
}

const failures = [];

function expect(name, actual, expected) {
  if (actual !== expected) {
    failures.push(`${name}: atteso ${expected}, ottenuto ${actual}`);
    return;
  }

  console.log(`ok - ${name}`);
}

const unauthorizedCase = await (async () => {
  process.env.APP_TOKEN = "segreto";
  const response = await call({ method: "GET", query: { date: "2026-08-14" } });
  delete process.env.APP_TOKEN;

  return response;
})();

expect("richiesta senza token viene rifiutata", unauthorizedCase.statusCode, 401);

const methodCase = await call({ method: "DELETE" });
expect("metodo non consentito", methodCase.statusCode, 405);
expect("intestazione Allow presente", methodCase.headers.Allow, "GET, PUT");

const missingParamsCase = await call({ method: "GET" });
expect("GET senza parametri", missingParamsCase.statusCode, 400);

const badHiveCase = await call({
  method: "PUT",
  body: JSON.stringify({ hive: 42, date: "2026-08-14", body: "prova" }),
});
expect("numero arnia fuori intervallo", badHiveCase.statusCode, 400);

const badDateCase = await call({
  method: "PUT",
  body: JSON.stringify({ hive: 3, date: "14/08/2026", body: "prova" }),
});
expect("data in formato errato", badDateCase.statusCode, 400);

const longBodyCase = await call({
  method: "PUT",
  body: JSON.stringify({ hive: 3, date: "2026-08-14", body: "x".repeat(5001) }),
});
expect("nota troppo lunga", longBodyCase.statusCode, 400);

if (failures.length > 0) {
  console.error(`\n${failures.length} test falliti:`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("\nTutti i test superati.");
}
