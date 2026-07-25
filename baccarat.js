const baccaratCore = window.NeonTableCore;
const baccaratEngine = window.NeonBaccaratEngine;
const baccaratSession = window.NeonBaccaratSession;
const GAME_PHASES = baccaratCore.phases;

const baccaratBankrollKey = "neontablegamesBaccaratBankroll";
const baccaratHighBankrollKey = "neontablegamesBaccaratHighBankroll";
const startingBankroll = 1000;
const baccaratHistoryLimit = 72;
const baccaratOutcomes = baccaratSession.outcomes;
const baccaratDealDelay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180;
const baccaratSettingsStore = window.NeonTableSettings.createSettings();
const baccaratFeedback = window.NeonTableSettings.createFeedback(baccaratSettingsStore);
const buildBaccaratShoe = baccaratCore.createShoeBuilder(8, "baccarat");
let baccaratSettings = baccaratSettingsStore.get();

function emptyBaccaratSession(bankroll = startingBankroll) {
  return baccaratSession.empty(bankroll);
}

function sanitizeBaccaratLastBet(lastBet) {
  const amount = Number(lastBet?.amount);
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !["player", "banker", "tie"].includes(lastBet?.type)
  ) {
    return null;
  }
  const chips = Array.isArray(lastBet.chips)
    ? lastBet.chips.map(Number).filter((chip) => Number.isFinite(chip) && chip > 0)
    : [];
  return {
    amount,
    chips: chips.length > 0 ? chips : [amount],
    type: lastBet.type,
  };
}

function sanitizeBaccaratCard(card) {
  try {
    return baccaratCore.createCard(card?.label, card?.suitName, "baccarat");
  } catch {
    return null;
  }
}

function sanitizeBaccaratSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const bet = Number(snapshot.bet);
  const playerCards = Array.isArray(snapshot.playerCards)
    ? snapshot.playerCards.map(sanitizeBaccaratCard).filter(Boolean)
    : [];
  const bankerCards = Array.isArray(snapshot.bankerCards)
    ? snapshot.bankerCards.map(sanitizeBaccaratCard).filter(Boolean)
    : [];
  const validBetType = baccaratOutcomes.has(snapshot.betType);
  if (!Number.isFinite(bet) || bet <= 0 || !validBetType) return null;

  const hasRound = playerCards.length >= 2 && bankerCards.length >= 2;
  return {
    bankerCards,
    bet,
    betChips: Array.isArray(snapshot.betChips)
      ? snapshot.betChips.map(Number).filter((chip) => Number.isFinite(chip) && chip > 0)
      : [bet],
    betType: snapshot.betType,
    pendingRound: hasRound
      ? {
          bankerCards,
          bankerTotal: baccaratEngine.handTotal(bankerCards),
          outcome: baccaratEngine.outcome(playerCards, bankerCards),
          playerCards,
          playerTotal: baccaratEngine.handTotal(playerCards),
        }
      : null,
    phase: hasRound ? GAME_PHASES.REVEALING : GAME_PHASES.BETTING,
    playerCards,
    revealedPlayer: hasRound
      ? playerCards.map((card, index) => snapshot.revealedPlayer?.[index] === true)
      : [],
  };
}

const baccaratStorage = baccaratCore.createGameStorage("neontablegames.baccarat", {
  defaults: {
    bankroll: startingBankroll,
    highBankroll: startingBankroll,
    history: [],
    lastBet: null,
    snapshot: null,
    session: emptyBaccaratSession(),
  },
  migrate(storage) {
    return {
      bankroll: baccaratCore.readStoredNumber(baccaratBankrollKey, startingBankroll, { storage }),
      highBankroll: baccaratCore.readStoredNumber(baccaratHighBankrollKey, startingBankroll, {
        storage,
      }),
      history: [],
      lastBet: null,
      snapshot: null,
      session: emptyBaccaratSession(),
    };
  },
  sanitize(value) {
    const bankroll = Number(value.bankroll);
    const highBankroll = Number(value.highBankroll);
    const sanitizedBankroll =
      Number.isFinite(bankroll) && bankroll >= 0 ? bankroll : startingBankroll;
    return {
      bankroll: sanitizedBankroll,
      highBankroll:
        Number.isFinite(highBankroll) && highBankroll >= startingBankroll
          ? highBankroll
          : startingBankroll,
      history: Array.isArray(value.history)
        ? value.history
            .filter((result) => baccaratOutcomes.has(result))
            .slice(-baccaratHistoryLimit)
        : [],
      lastBet: sanitizeBaccaratLastBet(value.lastBet),
      session: baccaratSession.sanitize(value.session, sanitizedBankroll),
      snapshot: sanitizeBaccaratSnapshot(value.snapshot),
    };
  },
});

const savedBaccarat = baccaratStorage.read();
const savedSnapshot = savedBaccarat.snapshot;

const baccaratState = {
  bankerCards: savedSnapshot?.bankerCards || [],
  bankroll: savedBaccarat.bankroll,
  bet: savedSnapshot?.bet || 0,
  betChips: savedSnapshot?.betChips || [],
  betType: savedSnapshot?.betType || "player",
  cutCard: 60 + Math.floor(Math.random() * 16),
  dealSequenceId: 0,
  dealtCards: savedSnapshot?.pendingRound
    ? {
        banker: savedSnapshot.bankerCards.map(() => true),
        player: savedSnapshot.playerCards.map(() => true),
      }
    : { banker: [], player: [] },
  highBankroll: savedBaccarat.highBankroll,
  history: savedBaccarat.history,
  lastBet: savedBaccarat.lastBet,
  lastDealtCard: "",
  lastRevealedCard: "",
  message: savedSnapshot?.pendingRound
    ? "Round restored. Flip the remaining Player cards."
    : savedSnapshot
      ? `${baccaratCore.money(savedSnapshot.bet)} on ${capitalize(savedSnapshot.betType)} restored. Deal when ready.`
      : "Choose Player, Banker, or Tie, then place a bet.",
  pendingRound: savedSnapshot?.pendingRound || null,
  phase: savedSnapshot?.phase || GAME_PHASES.BETTING,
  playerCards: savedSnapshot?.playerCards || [],
  revealedCards: {
    banker: savedSnapshot?.bankerCards.map(() => true) || [],
    player: savedSnapshot?.revealedPlayer || [],
  },
  result: null,
  session: savedBaccarat.session,
  shoe: buildBaccaratShoe(),
  shoeNumber: savedSnapshot ? 1 : 0,
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
  beadTab: document.querySelector("#bead-tab"),
  bigRoad: document.querySelector("#baccarat-big-road"),
  bigRoadTab: document.querySelector("#big-road-tab"),
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
  rebet: document.querySelector("#baccarat-rebet"),
  resetSession: document.querySelector("#baccarat-reset-session"),
  settingAutoReveal: document.querySelector("#setting-auto-reveal"),
  settingHaptics: document.querySelector("#setting-haptics"),
  settings: document.querySelector("#baccarat-settings"),
  settingsDialog: document.querySelector("#baccarat-settings-dialog"),
  settingSound: document.querySelector("#setting-sound"),
  sessionBankerWins: document.querySelector("#session-banker-wins"),
  sessionPeak: document.querySelector("#session-peak"),
  sessionPlayerWins: document.querySelector("#session-player-wins"),
  sessionProfit: document.querySelector("#session-profit"),
  sessionRounds: document.querySelector("#session-rounds"),
  sessionStreak: document.querySelector("#session-streak"),
  sessionTies: document.querySelector("#session-ties"),
  shoe: document.querySelector("#baccarat-shoe"),
  shoeStatus: document.querySelector("#baccarat-shoe-status"),
  summary: document.querySelector("#baccarat-summary"),
  summaryContent: document.querySelector("#session-summary-content"),
  summaryDialog: document.querySelector("#baccarat-summary-dialog"),
  tutorial: document.querySelector("#baccarat-tutorial"),
};

const baccaratTutorialRounds = window.NeonBaccaratTutorials.map((scenario) => ({
  ...scenario,
  cards: scenario.cards.map(([label, suitName]) => baccaratCard(label, suitName)),
}));

function baccaratCard(label, suitName) {
  return baccaratCore.createCard(label, suitName, "baccarat");
}

function saveBaccaratBankroll() {
  if (baccaratState.tutorial.active) return;
  const resumable =
    baccaratState.bet > 0 &&
    [GAME_PHASES.BETTING, GAME_PHASES.DEALING, GAME_PHASES.REVEALING].includes(baccaratState.phase);
  baccaratStorage.write({
    bankroll: baccaratState.bankroll,
    highBankroll: baccaratState.highBankroll,
    history: baccaratState.history,
    lastBet: baccaratState.lastBet,
    session: baccaratState.session,
    snapshot: resumable
      ? {
          bankerCards: baccaratState.bankerCards,
          bet: baccaratState.bet,
          betChips: baccaratState.betChips,
          betType: baccaratState.betType,
          phase: baccaratState.phase,
          playerCards: baccaratState.playerCards,
          revealedPlayer: baccaratState.revealedCards.player,
        }
      : null,
  });
}

function currentBaccaratFunds() {
  const wagerIsActive = [GAME_PHASES.BETTING, GAME_PHASES.DEALING, GAME_PHASES.REVEALING].includes(
    baccaratState.phase,
  );
  return baccaratState.bankroll + (wagerIsActive ? baccaratState.bet : 0);
}

function updateBaccaratSession(outcome) {
  if (baccaratState.tutorial.active) return;
  baccaratState.session = baccaratSession.record(
    baccaratState.session,
    outcome,
    baccaratState.bankroll,
  );
}

function resetBaccaratSession() {
  if (
    baccaratState.tutorial.active ||
    baccaratState.phase === GAME_PHASES.DEALING ||
    baccaratState.phase === GAME_PHASES.REVEALING ||
    (baccaratState.phase === GAME_PHASES.BETTING && baccaratState.bet > 0)
  )
    return;
  baccaratState.session = emptyBaccaratSession(currentBaccaratFunds());
  baccaratState.history = [];
  baccaratState.message = "Session statistics and Bead Plate reset.";
  saveBaccaratBankroll();
  renderBaccarat();
}

async function rebetAndDealBaccarat() {
  const previousBet = baccaratState.lastBet;
  if (
    baccaratState.phase !== GAME_PHASES.BETTING ||
    baccaratState.tutorial.active ||
    baccaratState.bet > 0 ||
    !previousBet ||
    previousBet.amount > baccaratState.bankroll
  )
    return;

  baccaratState.betType = previousBet.type;
  baccaratState.bet = previousBet.amount;
  baccaratState.betChips = [...previousBet.chips];
  baccaratState.bankroll -= previousBet.amount;
  baccaratState.message = `${baccaratCore.money(previousBet.amount)} on ${capitalize(previousBet.type)} repeated.`;
  saveBaccaratBankroll();
  renderBaccarat();
  await dealBaccarat();
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
    baccaratState.shoe = buildBaccaratShoe();
  }
  return baccaratState.shoe.pop();
}

function refreshBaccaratShoe() {
  baccaratState.shoe = buildBaccaratShoe();
  baccaratState.shoeNumber += 1;
  baccaratState.cutCard = 60 + Math.floor(Math.random() * 16);
}

function selectBetType(type) {
  if (baccaratState.phase !== GAME_PHASES.BETTING || baccaratState.tutorial.active) return;
  baccaratState.betType = type;
  baccaratState.message =
    baccaratState.bet > 0
      ? `${baccaratCore.money(baccaratState.bet)} on ${capitalize(type)}. Deal when ready.`
      : `${capitalize(type)} selected. Place a bet.`;
  saveBaccaratBankroll();
  renderBaccarat();
}

function addBaccaratBet(amount) {
  if (baccaratState.phase !== GAME_PHASES.BETTING || baccaratState.tutorial.active) return;
  if (amount > baccaratState.bankroll) return;
  baccaratState.bankroll -= amount;
  baccaratState.bet += amount;
  baccaratState.betChips.push(amount);
  baccaratState.message = `${baccaratCore.money(baccaratState.bet)} on ${capitalize(baccaratState.betType)}. Deal when ready.`;
  saveBaccaratBankroll();
  renderBaccarat();
}

function clearBaccaratBet() {
  if (baccaratState.phase !== GAME_PHASES.BETTING || baccaratState.tutorial.active) return;
  baccaratState.bankroll += baccaratState.bet;
  baccaratState.bet = 0;
  baccaratState.betChips = [];
  baccaratState.message = `${capitalize(baccaratState.betType)} selected. Place a bet.`;
  saveBaccaratBankroll();
  renderBaccarat();
}

function baccaratDealOrder(round) {
  const order = [
    { index: 0, side: "player" },
    { index: 0, side: "banker" },
    { index: 1, side: "player" },
    { index: 1, side: "banker" },
  ];
  if (round.playerCards.length === 3) order.push({ index: 2, side: "player" });
  if (round.bankerCards.length === 3) order.push({ index: 2, side: "banker" });
  return order;
}

function waitForBaccaratDeal() {
  return new Promise((resolve) => window.setTimeout(resolve, baccaratDealDelay));
}

async function dealBaccarat() {
  if (baccaratState.phase !== GAME_PHASES.BETTING || baccaratState.bet <= 0) return;
  if (!baccaratState.tutorial.active && baccaratState.shoe.length <= baccaratState.cutCard) {
    refreshBaccaratShoe();
  }
  const round = baccaratEngine.playRound(drawBaccaratCard);
  const sequenceId = baccaratState.dealSequenceId + 1;
  baccaratState.dealSequenceId = sequenceId;
  baccaratState.playerCards = round.playerCards;
  baccaratState.bankerCards = round.bankerCards;
  baccaratState.pendingRound = round;
  baccaratState.dealtCards = {
    banker: round.bankerCards.map(() => false),
    player: round.playerCards.map(() => false),
  };
  baccaratState.revealedCards = {
    banker: round.bankerCards.map(() => true),
    player: round.playerCards.map(() => false),
  };
  baccaratState.result = null;
  baccaratState.phase = GAME_PHASES.DEALING;
  baccaratState.message = "Dealing cards...";
  saveBaccaratBankroll();
  baccaratFeedback.cue("deal");
  if (baccaratState.tutorial.active) {
    const scenario = baccaratTutorialRounds[baccaratState.tutorial.index];
    baccaratState.tutorial.instruction = `${scenario.intro}\nWatch the cards deal in table order.`;
  }
  renderBaccarat();

  for (const step of baccaratDealOrder(round)) {
    await waitForBaccaratDeal();
    if (sequenceId !== baccaratState.dealSequenceId) return;
    baccaratState.dealtCards[step.side][step.index] = true;
    baccaratState.lastDealtCard = `${step.side}-${step.index}`;
    baccaratState.message = `Dealing ${capitalize(step.side)} card ${step.index + 1}...`;
    baccaratFeedback.cue("deal");
    renderBaccarat();
  }

  if (sequenceId !== baccaratState.dealSequenceId) return;
  baccaratState.phase = GAME_PHASES.REVEALING;
  baccaratState.message = `Flip ${round.playerCards.length} Player ${round.playerCards.length === 1 ? "card" : "cards"}.`;
  if (baccaratState.tutorial.active) {
    const scenario = baccaratTutorialRounds[baccaratState.tutorial.index];
    baccaratState.tutorial.instruction = `${scenario.intro}\nThe Banker hand is visible. Flip each Player card to reveal the result.`;
  }
  saveBaccaratBankroll();
  renderBaccarat();
  if (baccaratSettings.autoRevealPlayer) await autoRevealBaccaratPlayer();
}

async function autoRevealBaccaratPlayer() {
  while (
    baccaratState.phase === GAME_PHASES.REVEALING &&
    baccaratState.revealedCards.player.includes(false)
  ) {
    await waitForBaccaratDeal();
    const index = baccaratState.revealedCards.player.indexOf(false);
    revealBaccaratCard("player", index);
  }
}

function settleBaccaratRound() {
  const round = baccaratState.pendingRound;
  if (!round || baccaratState.phase !== GAME_PHASES.REVEALING) return;
  baccaratState.result = round.outcome;
  baccaratState.phase = GAME_PHASES.SETTLED;
  const payout = baccaratEngine.payoutFor(round.outcome, baccaratState.betType, baccaratState.bet);
  baccaratState.bankroll = Math.round((baccaratState.bankroll + payout) * 100) / 100;
  baccaratState.history.push(round.outcome);
  baccaratState.history = baccaratState.history.slice(-baccaratHistoryLimit);
  if (!baccaratState.tutorial.active) {
    baccaratState.lastBet = {
      amount: baccaratState.bet,
      chips: [...baccaratState.betChips],
      type: baccaratState.betType,
    };
  }
  updateBaccaratSession(round.outcome);
  updateBaccaratHighBankroll();
  saveBaccaratBankroll();
  baccaratFeedback.cue(round.outcome === baccaratState.betType ? "win" : "loss");
  baccaratFeedback.vibrate(round.outcome === baccaratState.betType ? [20, 30, 20] : 20);

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

  baccaratState.message = `Flip ${remaining} more Player ${remaining === 1 ? "card" : "cards"}.`;
  saveBaccaratBankroll();
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
  baccaratState.dealtCards = { banker: [], player: [] };
  baccaratState.pendingRound = null;
  baccaratState.revealedCards = { banker: [], player: [] };
  baccaratState.result = null;
  baccaratState.phase = GAME_PHASES.BETTING;
  baccaratState.message =
    baccaratState.bankroll > 0
      ? `${capitalize(baccaratState.betType)} selected. Place a bet.`
      : "You're out of chips. Start a new game to reset your bankroll.";
  saveBaccaratBankroll();
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
  baccaratState.dealtCards = { banker: [], player: [] };
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
  baccaratState.dealSequenceId += 1;
  baccaratState.tutorial.active = true;
  baccaratState.tutorial.index = 0;
  baccaratState.history = [];
  prepareBaccaratTutorialRound();
}

function stopBaccaratTutorial() {
  baccaratState.dealSequenceId += 1;
  baccaratState.tutorial.active = false;
  baccaratState.tutorial.index = 0;
  baccaratState.tutorial.instruction = "";
  baccaratState.tutorial.shoe = [];
  if (new URLSearchParams(window.location.search).get("tutorial") === "1") {
    window.history.replaceState(null, "", baccaratCore.removeQueryParam("tutorial"));
  }
}

function newBaccaratGame(resetBankroll = true) {
  stopBaccaratTutorial();
  if (resetBankroll) {
    baccaratState.bankroll = startingBankroll;
  }
  baccaratState.bet = 0;
  baccaratState.betChips = [];
  baccaratState.betType = "player";
  baccaratState.playerCards = [];
  baccaratState.bankerCards = [];
  baccaratState.dealtCards = { banker: [], player: [] };
  baccaratState.pendingRound = null;
  baccaratState.revealedCards = { banker: [], player: [] };
  baccaratState.result = null;
  if (resetBankroll) {
    baccaratState.history = [];
    baccaratState.lastBet = null;
    baccaratState.session = emptyBaccaratSession(startingBankroll);
  }
  baccaratState.phase = GAME_PHASES.BETTING;
  refreshBaccaratShoe();
  baccaratState.message = "Choose Player, Banker, or Tie, then place a bet.";
  saveBaccaratBankroll();
  renderBaccarat();
}

function capitalize(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function renderBaccaratHand(target, cards, side) {
  const cardElements = cards.flatMap((card, index) => {
    if (baccaratState.dealtCards[side]?.[index] !== true) return [];
    const revealed = baccaratState.revealedCards[side]?.[index] !== false;
    const cardElement = baccaratCore.renderCard(card, { hidden: !revealed });
    if (baccaratState.lastDealtCard === `${side}-${index}`) {
      cardElement.classList.add("card-dealt");
    }
    if (!revealed && baccaratState.phase === GAME_PHASES.REVEALING) {
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
    } else if (revealed && baccaratState.lastRevealedCard === `${side}-${index}`) {
      cardElement.classList.add("card-flipped");
    }
    return [cardElement];
  });
  target.replaceChildren(...cardElements);
}

function renderBaccaratHistory() {
  baccaratEls.history.replaceChildren();
  baccaratState.history.forEach((result, index) => {
    const marker = document.createElement("span");
    marker.className = `history-marker ${result}`;
    marker.textContent = result.charAt(0).toUpperCase();
    marker.setAttribute("aria-label", `Round ${index + 1}: ${capitalize(result)}`);
    baccaratEls.history.append(marker);
  });

  baccaratEls.bigRoad.replaceChildren();
  const road = baccaratSession.createBigRoad(baccaratState.history);
  road.cells.forEach((cell, index) => {
    const marker = document.createElement("span");
    marker.className = `big-road-marker ${cell.outcome}`;
    marker.style.gridColumn = String(cell.column + 1);
    marker.style.gridRow = String(cell.row + 1);
    marker.setAttribute(
      "aria-label",
      `Road result ${index + 1}: ${capitalize(cell.outcome)}${cell.ties ? ` with ${cell.ties} ${cell.ties === 1 ? "tie" : "ties"}` : ""}`,
    );
    marker.setAttribute("role", "img");
    if (cell.ties) {
      const tieCount = document.createElement("small");
      tieCount.textContent = String(cell.ties);
      marker.append(tieCount);
    }
    baccaratEls.bigRoad.append(marker);
  });
  if (road.leadingTies) {
    const marker = document.createElement("span");
    marker.className = "big-road-marker tie-only";
    marker.setAttribute(
      "aria-label",
      `${road.leadingTies} leading ${road.leadingTies === 1 ? "tie" : "ties"}`,
    );
    marker.setAttribute("role", "img");
    marker.textContent = String(road.leadingTies);
    baccaratEls.bigRoad.append(marker);
  }
}

function renderBaccaratSession() {
  const session = baccaratSession.summary(baccaratState.session, currentBaccaratFunds());
  const profit = session.profit;
  baccaratEls.sessionRounds.textContent = String(session.rounds);
  baccaratEls.sessionPlayerWins.textContent = String(session.playerWins);
  baccaratEls.sessionBankerWins.textContent = String(session.bankerWins);
  baccaratEls.sessionTies.textContent = String(session.ties);
  baccaratEls.sessionStreak.textContent = session.streakCount
    ? `${capitalize(session.streakResult)} x${session.streakCount}`
    : "-";
  baccaratEls.sessionPeak.textContent = baccaratCore.money(session.largestBankroll);
  baccaratEls.sessionProfit.textContent = baccaratCore.money(profit);
  baccaratEls.sessionProfit.className = profit > 0 ? "positive" : profit < 0 ? "negative" : "";
}

function baccaratShoeStatus() {
  const remaining = baccaratState.shoe.length;
  if (remaining <= baccaratState.cutCard)
    return `Shoe ${baccaratState.shoeNumber} - shuffle next round`;
  if (remaining <= baccaratState.cutCard + 90)
    return `Shoe ${baccaratState.shoeNumber} - cut card approaching`;
  if (remaining >= 400) return `8 decks - fresh shoe ${baccaratState.shoeNumber}`;
  return `Shoe ${baccaratState.shoeNumber} - in play`;
}

function switchBaccaratRoad(name) {
  const showBead = name === "bead";
  baccaratEls.beadTab.setAttribute("aria-selected", String(showBead));
  baccaratEls.bigRoadTab.setAttribute("aria-selected", String(!showBead));
  baccaratEls.beadTab.tabIndex = showBead ? 0 : -1;
  baccaratEls.bigRoadTab.tabIndex = showBead ? -1 : 0;
  baccaratEls.history.hidden = !showBead;
  baccaratEls.bigRoad.hidden = showBead;
}

function handleRoadTabKeydown(event) {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  const nextRoad = event.currentTarget === baccaratEls.beadTab ? "big-road" : "bead";
  switchBaccaratRoad(nextRoad);
  (nextRoad === "bead" ? baccaratEls.beadTab : baccaratEls.bigRoadTab).focus();
}

function openBaccaratSummary() {
  const summary = baccaratSession.summary(baccaratState.session, currentBaccaratFunds());
  const percent = (value) => `${Math.round(value * 100)}%`;
  return [
    { label: "Rounds played", value: String(summary.rounds) },
    {
      className: summary.profit > 0 ? "positive" : summary.profit < 0 ? "negative" : "",
      label: "Session result",
      value: baccaratCore.money(summary.profit),
    },
    {
      label: "Player wins",
      value: `${summary.playerWins} (${percent(summary.playerRate)})`,
    },
    {
      label: "Banker wins",
      value: `${summary.bankerWins} (${percent(summary.bankerRate)})`,
    },
    { label: "Ties", value: `${summary.ties} (${percent(summary.tieRate)})` },
    {
      label: "Current streak",
      value: summary.streakCount
        ? `${capitalize(summary.streakResult)} x${summary.streakCount}`
        : "-",
    },
    { label: "Peak bankroll", value: baccaratCore.money(summary.largestBankroll) },
  ];
}

function renderBaccaratTutorial() {
  baccaratEls.felt.classList.toggle("tutorial-active", baccaratState.tutorial.active);
  baccaratEls.tutorial.hidden = !baccaratState.tutorial.active;
  if (!baccaratState.tutorial.active) {
    baccaratEls.tutorial.replaceChildren();
    return;
  }
  const complete =
    baccaratState.phase === GAME_PHASES.SETTLED &&
    baccaratState.tutorial.index === baccaratTutorialRounds.length - 1;
  const nextAction =
    baccaratState.phase === GAME_PHASES.SETTLED
      ? complete
        ? "New Game"
        : "Next Round"
      : baccaratState.phase === GAME_PHASES.REVEALING
        ? "Reveal Player cards"
        : "Deal";
  window.NeonTutorialUi.render({
    complete,
    container: baccaratEls.tutorial,
    current: baccaratState.tutorial.index + 1,
    instruction: baccaratState.tutorial.instruction,
    nextAction,
    onRestart: startBaccaratTutorial,
    strategyHref: "../baccarat-rules/index.html",
    total: baccaratTutorialRounds.length,
    unit: "Round",
  });
}

function renderBaccarat() {
  renderBaccaratHand(baccaratEls.playerHand, baccaratState.playerCards, "player");
  renderBaccaratHand(baccaratEls.bankerHand, baccaratState.bankerCards, "banker");
  renderBaccaratHistory();
  renderBaccaratSession();
  renderBaccaratTutorial();

  baccaratEls.bankroll.textContent = baccaratCore.money(baccaratState.bankroll);
  baccaratEls.highBankroll.textContent = baccaratCore.money(baccaratState.highBankroll);
  baccaratEls.bet.textContent = baccaratCore.money(baccaratState.bet);
  baccaratEls.shoe.textContent = String(baccaratState.shoe.length);
  baccaratEls.shoeStatus.textContent = baccaratShoeStatus();
  const visiblePlayerCards = baccaratState.playerCards.filter(
    (card, index) =>
      baccaratState.dealtCards.player[index] === true &&
      baccaratState.revealedCards.player[index] !== false,
  );
  const visibleBankerCards = baccaratState.bankerCards.filter(
    (card, index) =>
      baccaratState.dealtCards.banker[index] === true &&
      baccaratState.revealedCards.banker[index] !== false,
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
  baccaratEls.rebet.disabled =
    baccaratState.phase !== GAME_PHASES.BETTING ||
    baccaratState.tutorial.active ||
    baccaratState.bet > 0 ||
    !baccaratState.lastBet ||
    baccaratState.lastBet.amount > baccaratState.bankroll;
  baccaratEls.next.disabled =
    baccaratState.phase !== GAME_PHASES.SETTLED ||
    (baccaratState.tutorial.active &&
      baccaratState.tutorial.index === baccaratTutorialRounds.length - 1);
  baccaratEls.newGame.disabled =
    baccaratState.tutorial.active &&
    baccaratState.phase !== GAME_PHASES.SETTLED &&
    baccaratState.tutorial.index < baccaratTutorialRounds.length - 1;
  baccaratEls.resetSession.disabled =
    baccaratState.tutorial.active ||
    baccaratState.phase === GAME_PHASES.DEALING ||
    baccaratState.phase === GAME_PHASES.REVEALING ||
    (baccaratState.phase === GAME_PHASES.BETTING && baccaratState.bet > 0);
  baccaratState.lastDealtCard = "";
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
baccaratEls.rebet.addEventListener("click", rebetAndDealBaccarat);
baccaratEls.resetSession.addEventListener("click", resetBaccaratSession);
baccaratEls.newGame.addEventListener("click", () => newBaccaratGame());
baccaratEls.beadTab.addEventListener("click", () => switchBaccaratRoad("bead"));
baccaratEls.bigRoadTab.addEventListener("click", () => switchBaccaratRoad("big-road"));
baccaratEls.beadTab.addEventListener("keydown", handleRoadTabKeydown);
baccaratEls.bigRoadTab.addEventListener("keydown", handleRoadTabKeydown);
window.NeonSessionFramework.bindSummaryDialog({
  content: baccaratEls.summaryContent,
  dialog: baccaratEls.summaryDialog,
  getRows: openBaccaratSummary,
  trigger: baccaratEls.summary,
});
window.NeonTableSettings.bindSettingsDialog({
  controls: {
    autoRevealPlayer: baccaratEls.settingAutoReveal,
    haptics: baccaratEls.settingHaptics,
    sound: baccaratEls.settingSound,
  },
  dialog: baccaratEls.settingsDialog,
  onChange(settings) {
    baccaratSettings = settings;
  },
  store: baccaratSettingsStore,
  trigger: baccaratEls.settings,
});
baccaratCore.setupTooltips();
baccaratCore.setupSeedDebugIndicator();
baccaratCore.setupCrossTabSync({
  isActive: () =>
    [GAME_PHASES.DEALING, GAME_PHASES.REVEALING].includes(baccaratState.phase) ||
    (baccaratState.phase === GAME_PHASES.BETTING && baccaratState.bet > 0),
  key: baccaratStorage.key,
});

if (new URLSearchParams(window.location.search).get("tutorial") === "1") {
  startBaccaratTutorial();
} else {
  if (savedSnapshot) {
    renderBaccarat();
    if (baccaratSettings.autoRevealPlayer && baccaratState.phase === GAME_PHASES.REVEALING) {
      autoRevealBaccaratPlayer();
    }
  } else {
    newBaccaratGame(false);
  }
}
