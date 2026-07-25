const test = require("node:test");
const assert = require("node:assert/strict");
const session = require("../../baccarat/session.js");

test("records Baccarat outcomes and calculates a session summary", () => {
  let current = session.empty(1000);
  current = session.record(current, "player", 1025);
  current = session.record(current, "player", 1050);
  current = session.record(current, "tie", 1050);

  const summary = session.summary(current, 1050);
  assert.equal(summary.rounds, 3);
  assert.equal(summary.playerWins, 2);
  assert.equal(summary.ties, 1);
  assert.equal(summary.streakResult, "tie");
  assert.equal(summary.streakCount, 1);
  assert.equal(summary.largestBankroll, 1050);
  assert.equal(summary.profit, 50);
  assert.equal(summary.playerRate, 1);
  assert.equal(summary.tieRate, 1 / 3);
});

test("Big Road groups streaks vertically and attaches ties", () => {
  const road = session.createBigRoad(["tie", "player", "player", "tie", "banker", "banker"]);

  assert.deepEqual(road.cells, [
    { column: 0, outcome: "player", row: 0, ties: 1 },
    { column: 0, outcome: "player", row: 1, ties: 1 },
    { column: 1, outcome: "banker", row: 0, ties: 0 },
    { column: 1, outcome: "banker", row: 1, ties: 0 },
  ]);
});

test("Big Road turns long streaks into the next columns", () => {
  const road = session.createBigRoad(Array(8).fill("banker"));
  assert.deepEqual(
    road.cells.map(({ column, row }) => [column, row]),
    [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [0, 5],
      [1, 5],
      [2, 5],
    ],
  );
});

test("Big Road preserves ties before the first decided outcome", () => {
  assert.deepEqual(session.createBigRoad(["tie", "tie"]), {
    cells: [],
    leadingTies: 2,
  });
});
