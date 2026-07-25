const test = require("node:test");
const assert = require("node:assert/strict");

const core = require("../../shared/game-core.js");
const blackjack = require("../../shared/blackjack-engine.js");
const baccarat = require("../../shared/baccarat-engine.js");
const poker = require("../../shared/three-card-poker-engine.js");

function drawFrom(shoe) {
  const card = shoe.pop();
  assert.ok(card, "shoe should contain another card");
  return card;
}

test("hundreds of seeded shoes remain complete and contain no duplicate physical cards", () => {
  for (let seed = 0; seed < 250; seed += 1) {
    const shoe = core.buildShoe(1, "blackjack", { seed: `integrity-${seed}` });
    assert.equal(shoe.length, 52);
    assert.equal(new Set(shoe.map((card) => `${card.label}-${card.suitName}`)).size, 52);
    shoe.forEach((card) => {
      assert.ok(core.ranks.some((rank) => rank.label === card.label));
      assert.ok(core.suits.some((suit) => suit.name === card.suitName));
      assert.ok(Number.isFinite(card.value));
    });
  }
});

test("seeded Blackjack simulation preserves payout bounds and plausible aggregate return", () => {
  const rounds = 12000;
  const wager = 10;
  let payouts = 0;
  for (let round = 0; round < rounds; round += 1) {
    const shoe = core.buildShoe(1, "blackjack", { seed: `blackjack-sim-${round}` });
    const player = {
      bet: wager,
      cards: [drawFrom(shoe), drawFrom(shoe)],
      status: "playing",
      wasSplit: false,
    };
    const dealer = [drawFrom(shoe), drawFrom(shoe)];
    while (blackjack.handValue(player.cards) < 17) player.cards.push(drawFrom(shoe));
    if (!blackjack.isNaturalBlackjack(player)) {
      while (blackjack.dealerShouldHit(dealer)) dealer.push(drawFrom(shoe));
    }
    const settlement = blackjack.settleHands([player], dealer);
    assert.ok(settlement.totalPayout >= 0 && settlement.totalPayout <= wager * 2.5);
    payouts += settlement.totalPayout;
  }
  const returnRate = payouts / (rounds * wager);
  assert.ok(returnRate > 0.88 && returnRate < 1.02, `Blackjack return was ${returnRate}`);
});

test("seeded Baccarat simulation keeps Banker commission accounting within expected bounds", () => {
  const rounds = 12000;
  const wager = 10;
  let payouts = 0;
  for (let round = 0; round < rounds; round += 1) {
    const shoe = core.buildShoe(1, "baccarat", { seed: `baccarat-sim-${round}` });
    const result = baccarat.playRound(() => drawFrom(shoe));
    const payout = baccarat.payoutFor(result.outcome, "banker", wager);
    assert.ok(payout >= 0 && payout <= wager * 2);
    payouts += payout;
  }
  const returnRate = payouts / (rounds * wager);
  assert.ok(returnRate > 0.95 && returnRate < 1.02, `Baccarat return was ${returnRate}`);
});

test("seeded Poker strategy simulation balances every committed wager and payout", () => {
  const rounds = 12000;
  const ante = 10;
  let committed = 0;
  let payouts = 0;
  for (let round = 0; round < rounds; round += 1) {
    const shoe = core.buildShoe(1, "blackjack", { seed: `poker-sim-${round}` });
    const playerCards = [drawFrom(shoe), drawFrom(shoe), drawFrom(shoe)];
    const dealerCards = [drawFrom(shoe), drawFrom(shoe), drawFrom(shoe)];
    const folded = !poker.shouldPlay(playerCards);
    const play = folded ? 0 : ante;
    const settlement = poker.settleRound({
      ante,
      dealerCards,
      folded,
      pairPlus: 0,
      play,
      playerCards,
    });
    const roundCommitted = ante + play;
    assert.ok(settlement.totalPayout >= 0);
    assert.ok(settlement.totalPayout <= ante * 9);
    committed += roundCommitted;
    payouts += settlement.totalPayout;
  }
  const returnRate = payouts / committed;
  assert.ok(returnRate > 0.9 && returnRate < 1.02, `Poker return was ${returnRate}`);
});
