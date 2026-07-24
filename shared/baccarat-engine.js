(function initializeBaccaratEngine(global) {
  function handTotal(cards) {
    return cards.reduce((sum, card) => sum + card.baccaratValue, 0) % 10;
  }

  function isNatural(playerCards, bankerCards) {
    return handTotal(playerCards) >= 8 || handTotal(bankerCards) >= 8;
  }

  function playerShouldDraw(total) {
    return total <= 5;
  }

  function bankerShouldDraw(total, playerThirdValue = null) {
    if (playerThirdValue === null) return total <= 5;
    if (total <= 2) return true;
    if (total === 3) return playerThirdValue !== 8;
    if (total === 4) return playerThirdValue >= 2 && playerThirdValue <= 7;
    if (total === 5) return playerThirdValue >= 4 && playerThirdValue <= 7;
    if (total === 6) return playerThirdValue >= 6 && playerThirdValue <= 7;
    return false;
  }

  function outcome(playerCards, bankerCards) {
    const playerTotal = handTotal(playerCards);
    const bankerTotal = handTotal(bankerCards);
    if (playerTotal === bankerTotal) return "tie";
    return playerTotal > bankerTotal ? "player" : "banker";
  }

  function playRound(drawCard) {
    const playerCards = [drawCard()];
    const bankerCards = [drawCard()];
    playerCards.push(drawCard());
    bankerCards.push(drawCard());

    if (!isNatural(playerCards, bankerCards)) {
      let playerThirdCard = null;
      if (playerShouldDraw(handTotal(playerCards))) {
        playerThirdCard = drawCard();
        playerCards.push(playerThirdCard);
      }

      if (bankerShouldDraw(handTotal(bankerCards), playerThirdCard?.baccaratValue ?? null)) {
        bankerCards.push(drawCard());
      }
    }

    return {
      bankerCards,
      bankerTotal: handTotal(bankerCards),
      outcome: outcome(playerCards, bankerCards),
      playerCards,
      playerTotal: handTotal(playerCards),
    };
  }

  function roundCurrency(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function payoutFor(result, betType, amount) {
    if (result === "tie" && betType !== "tie") return amount;
    if (result !== betType) return 0;
    if (result === "tie") return amount * 9;
    if (result === "banker") return roundCurrency(amount * 1.95);
    return amount * 2;
  }

  const api = {
    bankerShouldDraw,
    handTotal,
    isNatural,
    outcome,
    payoutFor,
    playerShouldDraw,
    playRound,
  };

  global.NeonBaccaratEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
