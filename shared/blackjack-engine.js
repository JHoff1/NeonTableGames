(function initializeBlackjackEngine(global) {
  function handScore(cards) {
    let total = cards.reduce((sum, card) => sum + card.value, 0);
    let highAces = cards.filter((card) => card.label === "A").length;
    let acesAdjusted = 0;

    while (total > 21 && highAces > 0) {
      total -= 10;
      highAces -= 1;
      acesAdjusted += 1;
    }

    return {
      total,
      isSoft: highAces > 0,
      acesAdjusted,
    };
  }

  function handValue(cards) {
    return handScore(cards).total;
  }

  function handLabel(cards) {
    const score = handScore(cards);
    return score.isSoft ? `Soft ${score.total}` : String(score.total);
  }

  function dealerShouldHit(cards, { hitSoft17 = true } = {}) {
    const score = handScore(cards);
    return score.total < 17 || (hitSoft17 && score.total === 17 && score.isSoft);
  }

  function isNaturalBlackjack(hand) {
    return (
      Boolean(hand) && !hand.wasSplit && hand.cards.length === 2 && handValue(hand.cards) === 21
    );
  }

  function canDoubleHand(hand, bankroll) {
    return (
      Boolean(hand) && hand.status === "playing" && hand.cards.length === 2 && bankroll >= hand.bet
    );
  }

  function canSplitHand(hand, handCount, bankroll) {
    return (
      Boolean(hand) &&
      handCount === 1 &&
      hand.status === "playing" &&
      hand.cards.length === 2 &&
      hand.cards[0].value === hand.cards[1].value &&
      bankroll >= hand.bet
    );
  }

  function dealerShouldPlay(hands) {
    return hands.some((hand) => handValue(hand.cards) <= 21);
  }

  function settleHands(hands, dealerCards) {
    const dealerTotal = handValue(dealerCards);
    const dealerBlackjack = dealerCards.length === 2 && dealerTotal === 21;
    let totalPayout = 0;

    const settlements = hands.map((hand) => {
      const playerTotal = handValue(hand.cards);
      const playerBlackjack = isNaturalBlackjack(hand);
      let payout = 0;
      let result = "Lose";

      if (playerBlackjack && !dealerBlackjack) {
        payout = Math.floor(hand.bet * 2.5);
        result = "Blackjack";
      } else if (dealerBlackjack && !playerBlackjack) {
        result = "Dealer blackjack";
      } else if (playerTotal > 21) {
        result = "Bust";
      } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
        payout = hand.bet * 2;
        result = "Win";
      } else if (playerTotal === dealerTotal) {
        payout = hand.bet;
        result = "Push";
      }

      totalPayout += payout;
      return {
        payout,
        result,
        status: "settled",
      };
    });

    return {
      dealerBlackjack,
      dealerTotal,
      settlements,
      totalPayout,
    };
  }

  const api = {
    canDoubleHand,
    canSplitHand,
    dealerShouldHit,
    dealerShouldPlay,
    handLabel,
    handScore,
    handValue,
    isNaturalBlackjack,
    settleHands,
  };

  global.NeonBlackjackEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
