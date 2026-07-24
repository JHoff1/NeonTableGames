const baccaratCore = window.NeonTableCore;
const baccaratEngine = window.NeonBaccaratEngine;
const GAME_PHASES = baccaratCore.phases;

const baccaratBankrollKey = "neontablegamesBaccaratBankroll";
const baccaratHighBankrollKey = "neontablegamesBaccaratHighBankroll";
const startingBankroll = 1000;

const baccaratStorage = baccaratCore.createGameStorage("neontablegames.baccarat", {
  defaults: {
    bankroll: startingBankroll,
    highBankroll: startingBankroll,
  },
  migrate(storage) {
    return {
      bankroll: baccaratCore.readStoredNumber(baccaratBankrollKey, startingBankroll, { storage }),
      highBankroll: baccaratCore.readStoredNumber(baccaratHighBankrollKey, startingBankroll, {
        storage,
      }),
    };
  },
  sanitize(value) {
    const bankroll = Number(value.bankroll);
    const highBankroll = Number(value.highBankroll);
    return {
      bankroll: Number.isFinite(bankroll) && bankroll >= 0 ? bankroll : startingBankroll,
      highBankroll:
        Number.isFinite(highBankroll) && highBankroll >= startingBankroll
          ? highBankroll
          : startingBankroll,
    };
  },
});

const savedBaccarat = baccaratStorage.read();

const baccaratState = {
  bankerCards: [],
  bankroll: savedBaccarat.bankroll,
  bet: 0,
  betChips: [],
  betType: "player",
  highBankroll: savedBaccarat.highBankroll,
  history: [],
  lastRevealedCard: "",
  message: "Choose Player, Banker, or Tie, then place a bet.",
  pendingRound: null,
  phase: GAME_PHASES.BETTING,
  playerCards: [],
  revealedCards: {
    banker: [],
    player: [],
  },
  result: null,
  shoe: baccaratCore.buildShoe(8, "baccarat"),
  tutorial: {
    active: false,
    index: 0,
    instruction: "",
    shoe: [],
  },
};

const baccaratEls = {
  bankerHand: document.querySelector("#banker-hand"),
  bankerTotal: document.querySelector("#banker-total"),
  bankroll: document.querySelector("#baccarat-bankroll"),
  bet: document.querySelector("#baccarat-bet"),
  betTargets: [...document.querySelectorAll("[data-bet-type]")],
  chips: [...document.querySelectorAll("[data-baccarat-chip]")],
  clear: document.querySelector("#baccarat-clear"),
  deal: document.querySelector("#baccarat-deal"),
  felt: document.querySelector("#baccarat-felt"),
  highBankroll: document.querySelector("#baccarat-high-bankroll"),
  history: document.querySelector("#baccarat-history"),
  message: document.querySelector("#baccarat-message"),
  newGame: document.querySelector("#baccarat-new-game"),
  next: document.querySelector("#baccarat-next"),
  playerHand: document.querySelector("#baccarat-player-hand"),
  playerTotal: document.querySelector("#baccarat-player-total"),
  result: document.querySelector("#baccarat-result"),
  shoe: document.querySelector("#baccarat-shoe"),
  tutorial: document.querySelector("#baccarat-tutorial"),
};

const baccaratTutorialRounds = [
  {
    betType: "player",
    cards: [
      baccaratCard("4", "hearts"),
      baccaratCard("3", "clubs"),
      baccaratCard("5", "spades"),
      baccaratCard("4", "diamonds"),
    ],
    intro:
      "Start with a Player bet. Both sides receive two cards, and a natural 8 or 9 ends the round immediately.",
    result: "Player wins 9 to 7 with a natural 9. No third cards are drawn.",
  },
  {
    betType: "banker",
    cards: [
      baccaratCard("2", "hearts"),
      baccaratCard("A", "clubs"),
      baccaratCard("2", "spades"),
      baccaratCard("2", "diamonds"),
      baccaratCard("2", "clubs"),
      baccaratCard("6", "spades"),
    ],
    intro:
      "Now bet Banker. The Player draws automatically on 4, then the Banker decision uses the Player's third card.",
    result: "Banker wins 9 to 6. Banker bets pay 0.95 to 1 because a 5% commission is applied.",
  },
  {
    betType: "tie",
    cards: [
      baccaratCard("3", "hearts"),
      baccaratCard("4", "clubs"),
      baccaratCard("4", "spades"),
      baccaratCard("3", "diamonds"),
    ],
    intro: "Finish with a Tie bet. A Tie wins only when both final totals match.",
    result: "The round ties at 7. The Tie bet pays 8 to 1; Player and Banker bets would push.",
  },
];

function baccaratCard(label, suitName) {
  return baccaratCore.createCard(label, suitName, "baccarat");
}

function saveBaccaratBankroll() {
  if (baccaratState.tutorial.active) return;
  baccaratStorage.write({
    bankroll: baccaratState.bankroll,
    highBankroll: baccaratState.highBankroll,
  });
}

function updateBaccaratHighBankroll() {
  if (baccaratState.tutorial.active || baccaratState.bankroll <= baccaratState.highBankroll) return;
  baccaratState.highBankroll = baccaratState.bankroll;
  saveBaccaratBankroll();
}

function drawBaccaratCard() {
  if (baccaratState.tutorial.active && baccaratState.tutorial.shoe.length > 0) {
    return baccaratState.tutorial.shoe.shift();
  }
  if (baccaratState.shoe.length < 20) {
    baccaratState.shoe = baccaratCore.buildShoe(8, "baccarat");
  }
  return baccaratState.shoe.pop();
}

function selectBetType(type) {
  if (baccaratState.phase !== GAME_PHASES.BETTING || baccaratState.tutorial.active) return;
  baccaratState.betType = type;
  baccaratState.message =
    baccaratState.bet > 0
      ? `${baccaratCore.money(baccaratState.bet)} on ${capitalize(type)}. Deal when ready.`
      : `${capitalize(type)} selected. Place a bet.`;
  renderBaccarat();
}

function addBaccaratBet(amount) {
  if (baccaratState.phase !== GAME_PHASES.BETTING || baccaratState.tutorial.active) return;
  if (amount > baccaratState.bankroll) return;
  baccaratState.bankroll -= amount;
  baccaratState.bet += amount;
  baccaratState.betChips.push(amount);
  baccaratState.message = `${baccaratCore.money(baccaratState.bet)} on ${capitalize(baccaratState.betType)}. Deal when ready.`;
  renderBaccarat();
}

function clearBaccaratBet() {
  if (baccaratState.phase !== GAME_PHASES.BETTING || baccaratState.tutorial.active) return;
  baccaratState.bankroll += baccaratState.bet;
  baccaratState.bet = 0;
  baccaratState.betChips = [];
  baccaratState.message = `${capitalize(baccaratState.betType)} selected. Place a bet.`;
  renderBaccarat();
}

function dealBaccarat() {
  if (baccaratState.phase !== GAME_PHASES.BETTING || baccaratState.bet <= 0) return;
  const round = baccaratEngine.playRound(drawBaccaratCard);
  baccaratState.playerCards = round.playerCards;
  baccaratState.bankerCards = round.bankerCards;
  baccaratState.pendingRound = round;
  baccaratState.revealedCards = {
    banker: round.bankerCards.map(() => false),
    player: round.playerCards.map(() => false),
  };
  baccaratState.result = null;
  baccaratState.phase = GAME_PHASES.REVEALING;
  baccaratState.message = `Flip ${round.playerCards.length + round.bankerCards.length} face-down cards.`;
  if (baccaratState.tutorial.active) {
    const scenario = baccaratTutorialRounds[baccaratState.tutorial.index];
    baccaratState.tutorial.instruction = `${scenario.intro}\nFlip each face-down card to reveal the result.`;
  }
  renderBaccarat();
}

function settleBaccaratRound() {
  const round = baccaratState.pendingRound;
  if (!round || baccaratState.phase !== GAME_PHASES.REVEALING) return;
  baccaratState.result = round.outcome;
  baccaratState.phase = GAME_PHASES.SETTLED;
  const payout = baccaratEngine.payoutFor(round.outcome, baccaratState.betType, baccaratState.bet);
  baccaratState.bankroll = Math.round((baccaratState.bankroll + payout) * 100) / 100;
  baccaratState.history.unshift(round.outcome);
  baccaratState.history = baccaratState.history.slice(0, 12);
  updateBaccaratHighBankroll();
  saveBaccaratBankroll();

  if (round.outcome === "tie" && baccaratState.betType !== "tie") {
    baccaratState.message = `Tie at ${round.playerTotal}. Your ${capitalize(baccaratState.betType)} bet pushes.`;
  } else if (round.outcome === baccaratState.betType) {
    baccaratState.message = `${capitalize(round.outcome)} wins. Player ${round.playerTotal}, Banker ${round.bankerTotal}. Paid ${baccaratCore.money(payout)}.`;
  } else {
    baccaratState.message = `${capitalize(round.outcome)} wins. Player ${round.playerTotal}, Banker ${round.bankerTotal}.`;
  }

  if (baccaratState.tutorial.active) {
    const scenario = baccaratTutorialRounds[baccaratState.tutorial.index];
    const isLast = baccaratState.tutorial.index === baccaratTutorialRounds.length - 1;
    baccaratState.tutorial.instruction = `${scenario.result}\n${isLast ? "Tutorial complete. Click New Game for normal play." : "Click Next Round to continue."}`;
  }
  renderBaccarat();
}

function unrevealedBaccaratCardCount() {
  return Object.values(baccaratState.revealedCards)
    .flat()
    .filter((revealed) => !revealed).length;
}

function revealBaccaratCard(side, index) {
  if (
    baccaratState.phase !== GAME_PHASES.REVEALING ||
    baccaratState.revealedCards[side]?.[index] !== false
  )
    return;
  baccaratState.revealedCards[side][index] = true;
  baccaratState.lastRevealedCard = `${side}-${index}`;
  const remaining = unrevealedBaccaratCardCount();

  if (remaining === 0) {
    settleBaccaratRound();
    return;
  }

  baccaratState.message = `Flip ${remaining} more ${remaining === 1 ? "card" : "cards"}.`;
  renderBaccarat();
}

function nextBaccaratRound() {
  if (baccaratState.phase !== GAME_PHASES.SETTLED) return;
  if (baccaratState.tutorial.active) {
    baccaratState.tutorial.index += 1;
    if (baccaratState.tutorial.index < baccaratTutorialRounds.length) {
      prepareBaccaratTutorialRound();
      return;
    }
  }

  baccaratState.bet = 0;
  baccaratState.betChips = [];
  baccaratState.playerCards = [];
  baccaratState.bankerCards = [];
  baccaratState.pendingRound = null;
  baccaratState.revealedCards = { banker: [], player: [] };
  baccaratState.result = null;
  baccaratState.phase = GAME_PHASES.BETTING;
  baccaratState.message =
    baccaratState.bankroll > 0
      ? `${capitalize(baccaratState.betType)} selected. Place a bet.`
      : "You're out of chips. Start a new game to reset your bankroll.";
  renderBaccarat();
}

function prepareBaccaratTutorialRound() {
  const scenario = baccaratTutorialRounds[baccaratState.tutorial.index];
  baccaratState.bankroll = startingBankroll - 25;
  baccaratState.bet = 25;
  baccaratState.betChips = [25];
  baccaratState.betType = scenario.betType;
  baccaratState.playerCards = [];
  baccaratState.bankerCards = [];
  baccaratState.pendingRound = null;
  baccaratState.revealedCards = { banker: [], player: [] };
  baccaratState.result = null;
  baccaratState.phase = GAME_PHASES.BETTING;
  baccaratState.tutorial.shoe = scenario.cards.map((card) => ({ ...card }));
  baccaratState.tutorial.instruction = `${scenario.intro}\nClick Deal to play the round.`;
  baccaratState.message = `${baccaratCore.money(25)} on ${capitalize(scenario.betType)}.`;
  renderBaccarat();
}

function startBaccaratTutorial() {
  baccaratState.tutorial.active = true;
  baccaratState.tutorial.index = 0;
  prepareBaccaratTutorialRound();
}

function stopBaccaratTutorial() {
  baccaratState.tutorial.active = false;
  baccaratState.tutorial.index = 0;
  baccaratState.tutorial.instruction = "";
  baccaratState.tutorial.shoe = [];
  if (new URLSearchParams(window.location.search).get("tutorial") === "1") {
    window.history.replaceState(null, "", window.location.pathname);
  }
}

function newBaccaratGame(resetBankroll = true) {
  stopBaccaratTutorial();
  if (resetBankroll) {
    baccaratState.bankroll = startingBankroll;
    saveBaccaratBankroll();
  }
  baccaratState.bet = 0;
  baccaratState.betChips = [];
  baccaratState.betType = "player";
  baccaratState.playerCards = [];
  baccaratState.bankerCards = [];
  baccaratState.pendingRound = null;
  baccaratState.revealedCards = { banker: [], player: [] };
  baccaratState.result = null;
  baccaratState.history = [];
  baccaratState.phase = GAME_PHASES.BETTING;
  baccaratState.shoe = baccaratCore.buildShoe(8, "baccarat");
  baccaratState.message = "Choose Player, Banker, or Tie, then place a bet.";
  renderBaccarat();
}

function capitalize(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function renderBaccaratHand(target, cards, side) {
  const cardElements = cards.map((card, index) => {
    const revealed = baccaratState.revealedCards[side]?.[index] !== false;
    const cardElement = baccaratCore.renderCard(card, { hidden: !revealed });
    if (!revealed) {
      cardElement.classList.add("reveal-card");
      cardElement.dataset.cardIndex = String(index);
      cardElement.dataset.cardSide = side;
      cardElement.setAttribute("role", "button");
      cardElement.setAttribute("tabindex", "0");
      cardElement.setAttribute("aria-label", `Flip ${side} card ${index + 1}`);
      cardElement.addEventListener("click", () => revealBaccaratCard(side, index));
      cardElement.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          revealBaccaratCard(side, index);
        }
      });
    } else if (baccaratState.lastRevealedCard === `${side}-${index}`) {
      cardElement.classList.add("card-flipped");
    }
    return cardElement;
  });
  target.replaceChildren(...cardElements);
}

function renderBaccaratHistory() {
  baccaratEls.history.replaceChildren();
  baccaratState.history.forEach((result, index) => {
    const marker = document.createElement("span");
    marker.className = `history-marker ${result}`;
    marker.setAttribute("role", "listitem");
    marker.textContent = result.charAt(0).toUpperCase();
    marker.setAttribute("aria-label", `${capitalize(result)} result ${index + 1}`);
    baccaratEls.history.append(marker);
  });
}

function renderBaccaratTutorial() {
  baccaratEls.felt.classList.toggle("tutorial-active", baccaratState.tutorial.active);
  baccaratEls.tutorial.hidden = !baccaratState.tutorial.active;
  if (!baccaratState.tutorial.active) {
    baccaratEls.tutorial.replaceChildren();
    return;
  }
  baccaratEls.tutorial.innerHTML = `
    <span>Tutorial Round ${baccaratState.tutorial.index + 1} of ${baccaratTutorialRounds.length}</span>
    <p>${baccaratState.tutorial.instruction.replace(/\n/g, "<br>")}</p>
  `;
}

function renderBaccarat() {
  renderBaccaratHand(baccaratEls.playerHand, baccaratState.playerCards, "player");
  renderBaccaratHand(baccaratEls.bankerHand, baccaratState.bankerCards, "banker");
  renderBaccaratHistory();
  renderBaccaratTutorial();

  baccaratEls.bankroll.textContent = baccaratCore.money(baccaratState.bankroll);
  baccaratEls.highBankroll.textContent = baccaratCore.money(baccaratState.highBankroll);
  baccaratEls.bet.textContent = baccaratCore.money(baccaratState.bet);
  baccaratEls.shoe.textContent = String(baccaratState.shoe.length);
  const visiblePlayerCards = baccaratState.playerCards.filter(
    (card, index) => baccaratState.revealedCards.player[index] !== false,
  );
  const visibleBankerCards = baccaratState.bankerCards.filter(
    (card, index) => baccaratState.revealedCards.banker[index] !== false,
  );
  baccaratEls.playerTotal.textContent = visiblePlayerCards.length
    ? String(baccaratEngine.handTotal(visiblePlayerCards))
    : "0";
  baccaratEls.bankerTotal.textContent = visibleBankerCards.length
    ? String(baccaratEngine.handTotal(visibleBankerCards))
    : "0";
  baccaratEls.message.textContent = baccaratState.message;

  baccaratEls.result.hidden = !baccaratState.result;
  baccaratEls.result.className = baccaratState.result
    ? `baccarat-result ${baccaratState.result}`
    : "baccarat-result";
  baccaratEls.result.textContent = baccaratState.result
    ? `${capitalize(baccaratState.result)} ${baccaratState.result === "tie" ? "" : "Wins"}`.trim()
    : "";

  baccaratEls.betTargets.forEach((button) => {
    const selected = button.dataset.betType === baccaratState.betType;
    button.setAttribute("aria-pressed", String(selected));
    button.disabled = baccaratState.phase !== GAME_PHASES.BETTING || baccaratState.tutorial.active;
  });
  baccaratEls.chips.forEach((button) => {
    const amount = Number(button.dataset.baccaratChip);
    button.disabled =
      baccaratState.phase !== GAME_PHASES.BETTING ||
      baccaratState.tutorial.active ||
      amount > baccaratState.bankroll;
  });
  baccaratEls.clear.disabled =
    baccaratState.phase !== GAME_PHASES.BETTING ||
    baccaratState.bet === 0 ||
    baccaratState.tutorial.active;
  baccaratEls.deal.disabled =
    baccaratState.phase !== GAME_PHASES.BETTING || baccaratState.bet === 0;
  baccaratEls.next.disabled =
    baccaratState.phase !== GAME_PHASES.SETTLED ||
    (baccaratState.tutorial.active &&
      baccaratState.tutorial.index === baccaratTutorialRounds.length - 1);
  baccaratEls.newGame.disabled =
    baccaratState.tutorial.active &&
    baccaratState.phase !== GAME_PHASES.SETTLED &&
    baccaratState.tutorial.index < baccaratTutorialRounds.length - 1;
  baccaratState.lastRevealedCard = "";
}

baccaratEls.betTargets.forEach((button) => {
  button.addEventListener("click", () => selectBetType(button.dataset.betType));
});
baccaratEls.chips.forEach((button) => {
  button.addEventListener("click", () => addBaccaratBet(Number(button.dataset.baccaratChip)));
});
baccaratEls.clear.addEventListener("click", clearBaccaratBet);
baccaratEls.deal.addEventListener("click", dealBaccarat);
baccaratEls.next.addEventListener("click", nextBaccaratRound);
baccaratEls.newGame.addEventListener("click", () => newBaccaratGame());
baccaratCore.setupTooltips();

if (new URLSearchParams(window.location.search).get("tutorial") === "1") {
  startBaccaratTutorial();
} else {
  newBaccaratGame(false);
}
