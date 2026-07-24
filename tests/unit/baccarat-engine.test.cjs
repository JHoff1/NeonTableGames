const test = require("node:test");
const assert = require("node:assert/strict");

const engine = require("../../shared/baccarat-engine.js");

const card = (baccaratValue) => ({ baccaratValue });

test("Baccarat totals use only the last digit", () => {
  assert.equal(engine.handTotal([card(7), card(8)]), 5);
  assert.equal(engine.handTotal([card(9), card(0), card(1)]), 0);
});

test("Player draws on 0 through 5 and stands on 6 or 7", () => {
  for (let total = 0; total <= 5; total += 1) assert.equal(engine.playerShouldDraw(total), true);
  assert.equal(engine.playerShouldDraw(6), false);
  assert.equal(engine.playerShouldDraw(7), false);
});

test("Banker third-card table matches the standard drawing rules", () => {
  assert.equal(engine.bankerShouldDraw(2, 9), true);
  assert.equal(engine.bankerShouldDraw(3, 8), false);
  assert.equal(engine.bankerShouldDraw(3, 7), true);
  assert.equal(engine.bankerShouldDraw(4, 1), false);
  assert.equal(engine.bankerShouldDraw(4, 2), true);
  assert.equal(engine.bankerShouldDraw(5, 3), false);
  assert.equal(engine.bankerShouldDraw(5, 4), true);
  assert.equal(engine.bankerShouldDraw(6, 5), false);
  assert.equal(engine.bankerShouldDraw(6, 6), true);
  assert.equal(engine.bankerShouldDraw(7, 7), false);
  assert.equal(engine.bankerShouldDraw(5, null), true);
  assert.equal(engine.bankerShouldDraw(6, null), false);
});

test("natural 8 or 9 prevents all third-card draws", () => {
  const shoe = [card(4), card(3), card(5), card(4), card(9)];
  const round = engine.playRound(() => shoe.shift());
  assert.equal(round.outcome, "player");
  assert.equal(round.playerTotal, 9);
  assert.equal(round.bankerTotal, 7);
  assert.equal(round.playerCards.length, 2);
  assert.equal(round.bankerCards.length, 2);
  assert.equal(shoe.length, 1);
});

test("Player and Banker third cards are dealt in order", () => {
  const shoe = [card(2), card(1), card(2), card(2), card(2), card(6)];
  const round = engine.playRound(() => shoe.shift());
  assert.equal(round.playerTotal, 6);
  assert.equal(round.bankerTotal, 9);
  assert.equal(round.playerCards.length, 3);
  assert.equal(round.bankerCards.length, 3);
  assert.equal(round.outcome, "banker");
});

test("payouts include returned stakes and exact Banker commission", () => {
  assert.equal(engine.payoutFor("player", "player", 25), 50);
  assert.equal(engine.payoutFor("banker", "banker", 25), 48.75);
  assert.equal(engine.payoutFor("tie", "tie", 25), 225);
  assert.equal(engine.payoutFor("tie", "player", 25), 25);
  assert.equal(engine.payoutFor("player", "banker", 25), 0);
});
