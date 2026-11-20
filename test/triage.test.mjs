import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import { createTriageServer } from "../src/server/app.mjs";

const server = createTriageServer();
const MANUAL_REVIEW = { status: "manual_review", topic: null, draft: null };
/** @type {string} */
let baseUrl;

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (!server.listening) return;

  const closed = once(server, "close");
  server.close();
  await closed;
});

/** @param {string} path */
function get(path) {
  return fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(3_000) });
}

/** @param {string | undefined} body */
function postTriage(body) {
  return fetch(`${baseUrl}/api/triage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: AbortSignal.timeout(3_000),
  });
}

/** @param {Response} response @param {string} topic */
async function assertReady(response, topic) {
  assert.equal(response.status, 200);
  /** @type {unknown} */
  const body = await response.json();
  assert.ok(body && typeof body === "object" && !Array.isArray(body));
  assert.deepEqual(Object.keys(body).sort(), ["draft", "status", "topic"]);
  assert.ok("status" in body && "topic" in body && "draft" in body);
  assert.equal(body.status, "ready");
  assert.equal(body.topic, topic);
  assert.ok(typeof body.draft === "string");
  assert.ok(body.draft.trim());
}

test("serves the page and its browser modules", async () => {
  const page = await get("/");
  assert.equal(page.status, 200);
  assert.equal(page.headers.get("content-type"), "text/html; charset=utf-8");
  assert.match(await page.text(), /src="\/triage\/index\.mjs"/);

  for (const path of ["/triage/index.mjs", "/triage/api.mjs", "/triage/view.mjs", "/shared/triage.mjs"]) {
    const module = await get(path);
    assert.equal(module.status, 200, path);
    assert.equal(module.headers.get("content-type"), "text/javascript; charset=utf-8", path);
    assert.ok((await module.text()).trim(), path);
  }
});

test("returns 404 for unknown paths and server modules", async () => {
  for (const path of ["/missing", "/server.mjs", "/mock-ai.mjs", "/src/triage/validation.mjs"]) {
    const response = await get(path);
    assert.equal(response.status, 404, path);
    assert.deepEqual(await response.json(), { status: "not_found" });
  }
});

test("returns a ready draft for each supported topic", async (context) => {
  const applications = [
    ["Доставка в Астану возможна?", "delivery"],
    ["  Подскажите стоимость услуги.  ", "pricing"],
    ["Как с вами связаться?", "other"],
  ];

  for (const [text, topic] of applications) {
    await context.test(topic, async () => {
      await assertReady(await postTriage(JSON.stringify({ text })), topic);
    });
  }
});

test("returns 400 for invalid input", async (context) => {
  /** @type {[name: string, body: string | undefined][]} */
  const cases = [
    ["malformed JSON", "{"],
    ["no request body", undefined],
    ["missing text", "{}"],
    ["null body", "null"],
    ["array body", "[]"],
    ["string body", '"Hello"'],
    ["number body", "42"],
    ["non-string text", '{"text":42}'],
    ["empty text", '{"text":""}'],
    ["whitespace-only text", JSON.stringify({ text: " \n\t " })],
  ];

  for (const [name, body] of cases) {
    await context.test(name, async () => {
      const response = await postTriage(body);
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { status: "invalid_input" });
    });
  }
});

test("routes every model failure to manual review and recovers", async (context) => {
  for (const marker of ["[error]", "[bad-json]", "[bad-topic]", "[empty-draft]", "[timeout]"]) {
    await context.test(marker, async () => {
      const started = performance.now();
      const response = await postTriage(JSON.stringify({ text: `Проверьте заявку ${marker}` }));
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), MANUAL_REVIEW);

      if (marker === "[timeout]") {
        const elapsed = performance.now() - started;
        assert.ok(elapsed >= 280 && elapsed < 1_100, `Timeout response took ${elapsed.toFixed(0)} ms`);
      }
    });
  }

  await context.test("valid request after a timeout", async () => {
    await assertReady(await postTriage(JSON.stringify({ text: "Подскажите цену" })), "pricing");
  });
});
