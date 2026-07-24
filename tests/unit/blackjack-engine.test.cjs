const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("../../shared/blackjack-engine.js");

const card = (label, value) => ({ label, value });
const hand = (cards, bet = 25, wasSplit = false) => ({
  bet,
  cards,
  status: "playing",
  wasSplit,
});

test("Blackjack hand scoring handles hard and soft aces", () => {
  assert.deepEqual(engine.handScore([card("A", 11), card("6", 6)]), {
    total: 17,
    isSoft: true,
    acesAdjusted: 0,
  });
  assert.equal(engine.handValue([card("A", 11), card("6", 6), card("10", 10)]), 17);
  assert.equal(engine.handLabel([card("A", 11), card("7", 7)]), "Soft 18");
});

test("Dealer hits soft 17 under the implemented table rules", () => {
  assert.equal(engine.dealerShouldHit([card("A", 11), card("6", 6)]), true);
  assert.equal(engine.dealerShouldHit([card("10", 10), card("7", 7)]), false);
  assert.equal(engine.dealerShouldHit([card("A", 11), card("6", 6)], { hitSoft17: false }), false);
});

test("Natural blackjack excludes split hands", () => {
  const blackjackCards = [card("A", 11), card("K", 10)];
  assert.equal(engine.isNaturalBlackjack(hand(blackjackCards)), true);
  assert.equal(engine.isNaturalBlackjack(hand(blackjackCards, 25, true)), false);
});

test("Double and split eligibility use hand shape and bankroll", () => {
  const pair = hand([card("8", 8), card("8", 8)]);
  assert.equal(engine.canDoubleHand(pair, 25), true);
  assert.equal(engine.canDoubleHand(pair, 20), false);
  assert.equal(engine.canSplitHand(pair, 1, 25), true);
  assert.equal(engine.canSplitHand(pair, 2, 25), false);
});

test("Settlement covers blackjack, win, push, loss, and bust payouts", () => {
  const dealer20 = [card("10", 10), card("Q", 10)];
  const natural = engine.settleHands([hand([card("A", 11), card("K", 10)])], dealer20);
  assert.equal(natural.totalPayout, 62);
  assert.equal(natural.settlements[0].result, "Blackjack");

  const mixed = engine.settleHands(
    [
      hand([card("10", 10), card("K", 10)]),
      hand([card("10", 10), card("9", 9)]),
      hand([card("10", 10), card("7", 7), card("8", 8)]),
    ],
    dealer20,
  );
  assert.deepEqual(
    mixed.settlements.map((item) => item.result),
    ["Push", "Lose", "Bust"],
  );
  assert.equal(mixed.totalPayout, 25);

  const dealerBust = engine.settleHands(
    [hand([card("10", 10), card("8", 8)])],
    [card("10", 10), card("6", 6), card("8", 8)],
  );
  assert.equal(dealerBust.settlements[0].result, "Win");
  assert.equal(dealerBust.totalPayout, 50);
});
