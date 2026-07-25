const test = require("node:test");
const assert = require("node:assert/strict");
const sessions = require("../../shared/session-framework.js");

test("shared sessions sanitize counters, record outcomes, and calculate profit", () => {
  const base = sessions.create({ bankroll: 1000, counters: ["rounds", "wins"] });
  const updated = sessions.record(base, {
    bankroll: 1050,
    increments: { rounds: 1, wins: 1 },
  });
  assert.equal(updated.rounds, 1);
  assert.equal(updated.wins, 1);
  assert.equal(updated.largestBankroll, 1050);
  assert.equal(sessions.profit(updated, 1025), 25);
  assert.equal(sessions.profit(updated, 1025, { disabled: true }), 0);
});
