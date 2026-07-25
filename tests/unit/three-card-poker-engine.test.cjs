const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("../../shared/three-card-poker-engine.js");

const card = (label, suitName = "spades") => ({ label, suitName });

test("Three Card Poker ranks use straight above flush", () => {
  assert.equal(engine.rankHand([card("A"), card("2"), card("3")]).name, "Straight Flush");
  assert.equal(engine.rankHand([card("A"), card("9"), card("4")]).name, "Flush");
  assert.equal(
    engine.rankHand([card("7", "spades"), card("6", "hearts"), card("5", "clubs")]).name,
    "Straight",
  );
  assert.equal(
    engine.compareHands(
      [card("7", "spades"), card("6", "hearts"), card("5", "clubs")],
      [card("A"), card("9"), card("4")],
    ),
    1,
  );
});

test("pairs and kickers break ties correctly", () => {
  assert.equal(
    engine.compareHands(
      [card("8"), card("8", "hearts"), card("A")],
      [card("8"), card("8", "clubs"), card("K")],
    ),
    1,
  );
});

test("dealer qualifies with queen-high or better", () => {
  assert.equal(engine.dealerQualifies([card("Q"), card("5", "hearts"), card("2", "clubs")]), true);
  assert.equal(
    engine.dealerQualifies([card("J"), card("10", "hearts"), card("8", "clubs")]),
    false,
  );
  assert.equal(engine.dealerQualifies([card("2"), card("2", "hearts"), card("3", "clubs")]), true);
});

test("Q-6-4 strategy recommendation handles the boundary", () => {
  assert.equal(engine.shouldPlay([card("Q"), card("6", "hearts"), card("4", "clubs")]), true);
  assert.equal(engine.shouldPlay([card("Q"), card("6", "hearts"), card("3", "clubs")]), false);
  assert.equal(engine.shouldPlay([card("K"), card("2", "hearts"), card("3", "clubs")]), true);
  assert.equal(engine.shouldPlay([card("J"), card("9", "hearts"), card("7", "clubs")]), false);
  assert.equal(
    engine.strategyReason([card("Q"), card("6", "hearts"), card("4", "clubs")]),
    "Q-6-4 meets the minimum Play threshold.",
  );
});

test("settlement handles wins, non-qualifying dealers, bonuses, and folds", () => {
  const straight = [card("7", "spades"), card("6", "hearts"), card("5", "clubs")];
  const dealer = [card("Q"), card("8", "hearts"), card("2", "clubs")];
  const win = engine.settleRound({
    ante: 10,
    dealerCards: dealer,
    pairPlus: 5,
    play: 10,
    playerCards: straight,
  });
  assert.equal(win.result, "Win");
  assert.equal(win.anteBonus, 10);
  assert.equal(win.pairPlusPayout, 35);
  assert.equal(win.totalPayout, 85);

  const noQualify = engine.settleRound({
    ante: 10,
    dealerCards: [card("J"), card("8", "hearts"), card("2", "clubs")],
    play: 10,
    playerCards: [card("Q"), card("6", "hearts"), card("4", "clubs")],
  });
  assert.equal(noQualify.result, "Dealer Does Not Qualify");
  assert.equal(noQualify.totalPayout, 30);

  const fold = engine.settleRound({
    ante: 10,
    dealerCards: dealer,
    folded: true,
    pairPlus: 5,
    playerCards: [card("9"), card("9", "hearts"), card("2")],
  });
  assert.equal(fold.totalPayout, 10);
});
