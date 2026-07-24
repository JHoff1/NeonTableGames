const test = require("node:test");
const assert = require("node:assert/strict");

const core = require("../../shared/game-core.js");

test("shared game phases are immutable and consistent", () => {
  assert.deepEqual(core.phases, {
    BETTING: "betting",
    PLAYING: "playing",
    REVEALING: "revealing",
    SETTLED: "settled",
  });
  assert.equal(Object.isFrozen(core.phases), true);
});

test("buildShoe creates a complete standard deck", () => {
  const deck = core.buildShoe(1, "blackjack");
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck.map((card) => `${card.label}-${card.suitName}`)).size, 52);
});

test("buildShoe supports an eight-deck Baccarat shoe", () => {
  const shoe = core.buildShoe(8, "baccarat");
  assert.equal(shoe.length, 416);
  assert.equal(shoe.filter((card) => card.label === "A").length, 32);
});

test("card values adapt to each game", () => {
  assert.equal(core.createCard("K", "spades", "blackjack").value, 10);
  assert.equal(core.createCard("K", "spades", "baccarat").value, 0);
  assert.equal(core.createCard("A", "hearts", "blackjack").value, 11);
  assert.equal(core.createCard("A", "hearts", "baccarat").value, 1);
});

test("money keeps commission cents only when needed", () => {
  assert.equal(core.money(1000), "$1,000");
  assert.equal(core.money(48.75), "$48.75");
});

test("stored numbers validate missing, invalid, and valid values", () => {
  const values = new Map();
  const storage = {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };

  assert.equal(core.readStoredNumber("bankroll", 1000, { storage }), 1000);
  values.set("bankroll", "not-a-number");
  assert.equal(core.readStoredNumber("bankroll", 1000, { storage }), 1000);
  core.writeStoredNumber("bankroll", 1425.5, { storage });
  assert.equal(core.readStoredNumber("bankroll", 1000, { storage }), 1425.5);
});

test("versioned game storage migrates, sanitizes, and restores records", () => {
  const values = new Map([["legacyBankroll", "1250"]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const gameStorage = core.createGameStorage("neon.test", {
    defaults: { bankroll: 1000 },
    migrate: (legacyStorage) => ({
      bankroll: Number(legacyStorage.getItem("legacyBankroll")),
    }),
    sanitize: (value) => ({
      bankroll: Number.isFinite(Number(value.bankroll)) ? Number(value.bankroll) : 1000,
    }),
    storage,
    version: 2,
  });

  assert.deepEqual(gameStorage.read(), { bankroll: 1250 });
  assert.equal(JSON.parse(values.get("neon.test")).version, 2);

  gameStorage.write({ bankroll: 1800 });
  assert.deepEqual(gameStorage.read(), { bankroll: 1800 });
});
