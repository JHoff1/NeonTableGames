(function initializeThreeCardPokerEngine(global) {
  const rankValues = Object.freeze({
    A: 14,
    K: 13,
    Q: 12,
    J: 11,
    10: 10,
    9: 9,
    8: 8,
    7: 7,
    6: 6,
    5: 5,
    4: 4,
    3: 3,
    2: 2,
  });

  const categoryNames = Object.freeze([
    "High Card",
    "Pair",
    "Flush",
    "Straight",
    "Three of a Kind",
    "Straight Flush",
  ]);

  function rankHand(cards) {
    if (!Array.isArray(cards) || cards.length !== 3) {
      throw new Error("Three Card Poker hands must contain exactly three cards.");
    }

    const values = cards.map((card) => rankValues[card.label]).sort((a, b) => b - a);
    const counts = new Map();
    values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    const groups = [...counts.entries()].sort(
      ([firstValue, firstCount], [secondValue, secondCount]) =>
        secondCount - firstCount || secondValue - firstValue,
    );
    const flush = cards.every((card) => card.suitName === cards[0].suitName);
    const unique = [...new Set(values)];
    const wheel = unique.length === 3 && unique[0] === 14 && unique[1] === 3 && unique[2] === 2;
    const straight =
      unique.length === 3 &&
      (wheel || (unique[0] - unique[1] === 1 && unique[1] - unique[2] === 1));
    const straightHigh = wheel ? 3 : values[0];

    let category = 0;
    let tiebreak = values;
    if (straight && flush) {
      category = 5;
      tiebreak = [straightHigh];
    } else if (groups[0][1] === 3) {
      category = 4;
      tiebreak = [groups[0][0]];
    } else if (straight) {
      category = 3;
      tiebreak = [straightHigh];
    } else if (flush) {
      category = 2;
    } else if (groups[0][1] === 2) {
      category = 1;
      tiebreak = [groups[0][0], groups[1][0]];
    }

    return {
      category,
      name: categoryNames[category],
      tiebreak,
    };
  }

  function compareHands(playerCards, dealerCards) {
    const player = rankHand(playerCards);
    const dealer = rankHand(dealerCards);
    if (player.category !== dealer.category) return player.category > dealer.category ? 1 : -1;
    const length = Math.max(player.tiebreak.length, dealer.tiebreak.length);
    for (let index = 0; index < length; index += 1) {
      if (player.tiebreak[index] !== dealer.tiebreak[index]) {
        return player.tiebreak[index] > dealer.tiebreak[index] ? 1 : -1;
      }
    }
    return 0;
  }

  function dealerQualifies(cards) {
    const hand = rankHand(cards);
    return hand.category > 0 || hand.tiebreak[0] >= 12;
  }

  function anteBonusMultiplier(cards) {
    const category = rankHand(cards).category;
    if (category === 5) return 5;
    if (category === 4) return 4;
    if (category === 3) return 1;
    return 0;
  }

  function pairPlusMultiplier(cards) {
    const category = rankHand(cards).category;
    return [0, 1, 3, 6, 30, 40][category];
  }

  function shouldPlay(cards) {
    const hand = rankHand(cards);
    if (hand.category > 0) return true;
    const [high, middle, low] = hand.tiebreak;
    if (high !== 12) return high > 12;
    if (middle !== 6) return middle > 6;
    return low >= 4;
  }

  function strategyReason(cards) {
    const hand = rankHand(cards);
    if (hand.category > 0) return `${hand.name} always plays.`;
    const [high, middle, low] = hand.tiebreak;
    if (high > 12) return `${high === 14 ? "Ace" : "King"}-high always plays.`;
    if (high < 12) return "Jack-high or lower folds without a pair.";
    if (middle > 6) return "Queen-seven or better plays.";
    if (middle < 6) return "Queen-five or lower folds.";
    return low >= 4
      ? "Q-6-4 meets the minimum Play threshold."
      : `Q-6-${low} is below the Q-6-4 threshold.`;
  }

  function settleRound({ ante, dealerCards, folded = false, pairPlus = 0, play = 0, playerCards }) {
    const pairPlusMultiplierValue = pairPlusMultiplier(playerCards);
    const pairPlusPayout = pairPlusMultiplierValue ? pairPlus * (pairPlusMultiplierValue + 1) : 0;

    if (folded) {
      return {
        anteBonus: 0,
        antePayout: 0,
        comparison: -1,
        dealerQualifies: dealerQualifies(dealerCards),
        pairPlusPayout,
        playPayout: 0,
        result: "Fold",
        totalPayout: pairPlusPayout,
      };
    }

    const qualifies = dealerQualifies(dealerCards);
    const comparison = compareHands(playerCards, dealerCards);
    const anteBonus = ante * anteBonusMultiplier(playerCards);
    let antePayout = 0;
    let playPayout = 0;
    let result = "Loss";

    if (!qualifies) {
      antePayout = ante * 2;
      playPayout = play;
      result = "Dealer Does Not Qualify";
    } else if (comparison > 0) {
      antePayout = ante * 2;
      playPayout = play * 2;
      result = "Win";
    } else if (comparison === 0) {
      antePayout = ante;
      playPayout = play;
      result = "Push";
    }

    return {
      anteBonus,
      antePayout,
      comparison,
      dealerQualifies: qualifies,
      pairPlusPayout,
      playPayout,
      result,
      totalPayout: antePayout + playPayout + anteBonus + pairPlusPayout,
    };
  }

  const api = {
    anteBonusMultiplier,
    categoryNames,
    compareHands,
    dealerQualifies,
    pairPlusMultiplier,
    rankHand,
    settleRound,
    shouldPlay,
    strategyReason,
  };

  global.NeonThreeCardPokerEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
