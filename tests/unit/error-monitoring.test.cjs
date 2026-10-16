const test = require("node:test");
const assert = require("node:assert/strict");

const monitoring = require("../../shared/error-monitoring.js");
const collector = require("../../netlify/functions/client-error.cjs");

test("client error messages remove query values and email addresses", () => {
  const scrubbed = monitoring.scrub(
    "Failed https://example.com/game?seed=secret&email=user@example.com user@example.com",
  );
  assert.equal(scrubbed.includes("secret"), false);
  assert.equal(scrubbed.includes("user@example.com"), false);
  assert.equal(scrubbed.includes("[email]"), true);
});

test("first-party error collector validates method, origin, and report type", async () => {
  assert.equal((await collector.handler({ httpMethod: "GET", headers: {} })).statusCode, 405);
  assert.equal(
    (
      await collector.handler({
        body: JSON.stringify({ type: "javascript" }),
        headers: {},
        httpMethod: "POST",
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await collector.handler({
        body: JSON.stringify({ type: "javascript" }),
        headers: { origin: "https://example.com" },
        httpMethod: "POST",
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await collector.handler({
        body: JSON.stringify({ type: "unknown" }),
        headers: { origin: "https://neontablegames.com" },
        httpMethod: "POST",
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await collector.handler({
        body: "x".repeat(4097),
        headers: { origin: "https://www.neontablegames.com" },
        httpMethod: "POST",
      })
    ).statusCode,
    413,
  );
  assert.equal(
    (
      await collector.handler({
        body: JSON.stringify({ message: "Test error", type: "javascript" }),
        headers: { origin: "https://www.neontablegames.com" },
        httpMethod: "POST",
      })
    ).statusCode,
    202,
  );
});
