const pokerCore = window.NeonTableCore;
const pokerEngine = window.NeonThreeCardPokerEngine;
const POKER_PHASES = pokerCore.phases;
const pokerSettingsStore = window.NeonTableSettings.createSettings();
const pokerFeedback = window.NeonTableSettings.createFeedback(pokerSettingsStore);
let pokerSettings = pokerSettingsStore.get();
const pokerSessions = window.NeonSessionFramework;
const buildPokerShoe = pokerCore.createShoeBuilder(1, "blackjack");
const pokerStartingBankroll = 1000;
const pokerDealDelay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180;
const pokerSessionCounters = [
  "anteBonuses",
  "folds",
  "losses",
  "pairPlusWins",
  "pushes",
  "rounds",
  "wins",
];

function emptyPokerSession(bankroll = pokerStartingBankroll) {
  return pokerSessions.create({ bankroll, counters: pokerSessionCounters });
}

function sanitizePokerSession(session, bankroll) {
  return pokerSessions.sanitize(session, { bankroll, counters: pokerSessionCounters });
}

function sanitizePokerCard(card) {
  try {
    return pokerCore.createCard(card?.label, card?.suitName, "blackjack");
  } catch {
    return null;
  }
}

function sanitizePokerWager(wager) {
  const ante = Number(wager?.ante);
  const pairPlus = Number(wager?.pairPlus);
  if (!Number.isFinite(ante) || ante <= 0 || !Number.isFinite(pairPlus) || pairPlus < 0)
    return null;
  return { ante, pairPlus };
}

function sanitizePokerSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const wager = sanitizePokerWager(snapshot);
  if (!wager) return null;
  const playerCards = Array.isArray(snapshot.playerCards)
    ? snapshot.playerCards.map(sanitizePokerCard).filter(Boolean)
    : [];
  const dealerCards = Array.isArray(snapshot.dealerCards)
    ? snapshot.dealerCards.map(sanitizePokerCard).filter(Boolean)
    : [];
  const hasRound = playerCards.length === 3 && dealerCards.length === 3;
  return {
    ...wager,
    anteChips: Array.isArray(snapshot.anteChips) ? snapshot.anteChips : [wager.ante],
    betTarget: snapshot.betTarget === "pairPlus" ? "pairPlus" : "ante",
    dealerCards,
    pairPlusChips: Array.isArray(snapshot.pairPlusChips) ? snapshot.pairPlusChips : [],
    phase: hasRound ? POKER_PHASES.PLAYING : POKER_PHASES.BETTING,
    playerCards,
  };
}

const pokerStorage = pokerCore.createGameStorage("neontablegames.three-card-poker", {
  defaults: {
    bankroll: pokerStartingBankroll,
    highBankroll: pokerStartingBankroll,
    lastWager: null,
    session: emptyPokerSession(),
    snapshot: null,
  },
  sanitize(value) {
    const bankroll = Number(value.bankroll);
    const highBankroll = Number(value.highBankroll);
    const sanitizedBankroll =
      Number.isFinite(bankroll) && bankroll >= 0 ? bankroll : pokerStartingBankroll;
    return {
      bankroll: sanitizedBankroll,
      highBankroll:
        Number.isFinite(highBankroll) && highBankroll >= pokerStartingBankroll
          ? highBankroll
          : pokerStartingBankroll,
      lastWager: sanitizePokerWager(value.lastWager),
      session: sanitizePokerSession(value.session, sanitizedBankroll),
      snapshot: sanitizePokerSnapshot(value.snapshot),
    };
  },
});

const savedPoker = pokerStorage.read();
const savedPokerSnapshot = savedPoker.snapshot;

const pokerState = {
  ante: savedPokerSnapshot?.ante || 0,
  anteChips: savedPokerSnapshot?.anteChips || [],
  bankroll: savedPoker.bankroll,
  betTarget: savedPokerSnapshot?.betTarget || "ante",
  dealSequenceId: 0,
  dealtCards: savedPokerSnapshot?.playerCards.length
    ? { dealer: [true, true, true], player: [true, true, true] }
    : { dealer: [], player: [] },
  dealerCards: savedPokerSnapshot?.dealerCards || [],
  dealerRevealed: savedPokerSnapshot?.dealerCards.map(() => false) || [],
  deck: buildPokerShoe(),
  highBankroll: savedPoker.highBankroll,
  lastWager: savedPoker.lastWager,
  message: savedPokerSnapshot?.playerCards.length
    ? "Round restored. Choose Play or Fold."
    : savedPokerSnapshot
      ? "Wagers restored. Deal when ready."
      : "Place an Ante to start a round.",
  pairPlus: savedPokerSnapshot?.pairPlus || 0,
  pairPlusChips: savedPokerSnapshot?.pairPlusChips || [],
  phase: savedPokerSnapshot?.phase || POKER_PHASES.BETTING,
  play: 0,
  playerCards: savedPokerSnapshot?.playerCards || [],
  playerRevealed: savedPokerSnapshot?.playerCards.map(() => true) || [],
  result: null,
  session: savedPoker.session,
  tutorial: {
    active: false,
    index: 0,
    instruction: "",
  },
};

const pokerEls = {
  ante: document.querySelector("#poker-ante"),
  anteStack: document.querySelector("#poker-ante-stack"),
  bankroll: document.querySelector("#poker-bankroll"),
  betTargets: [...document.querySelectorAll("[data-poker-bet]")],
  chips: [...document.querySelectorAll("[data-poker-chip]")],
  clear: document.querySelector("#poker-clear"),
  deal: document.querySelector("#poker-deal"),
  dealerHand: document.querySelector("#poker-dealer-hand"),
  dealerRank: document.querySelector("#poker-dealer-rank"),
  felt: document.querySelector("#poker-felt"),
  fold: document.querySelector("#poker-fold"),
  highBankroll: document.querySelector("#poker-high-bankroll"),
  message: document.querySelector("#poker-message"),
  newGame: document.querySelector("#poker-new-game"),
  next: document.querySelector("#poker-next"),
  pairPlus: document.querySelector("#poker-pair-plus"),
  pairPlusStack: document.querySelector("#poker-pair-plus-stack"),
  play: document.querySelector("#poker-play"),
  playStack: document.querySelector("#poker-play-stack"),
  playerHand: document.querySelector("#poker-player-hand"),
  playerRank: document.querySelector("#poker-player-rank"),
  rebet: document.querySelector("#poker-rebet"),
  resetSession: document.querySelector("#poker-reset-session"),
  result: document.querySelector("#poker-result"),
  sessionFolds: document.querySelector("#poker-session-folds"),
  sessionLosses: document.querySelector("#poker-session-losses"),
  sessionProfit: document.querySelector("#poker-session-profit"),
  sessionPushes: document.querySelector("#poker-session-pushes"),
  sessionRounds: document.querySelector("#poker-session-rounds"),
  sessionWins: document.querySelector("#poker-session-wins"),
  settingHaptics: document.querySelector("#poker-setting-haptics"),
  settingAutoReveal: document.querySelector("#poker-setting-auto-reveal"),
  settings: document.querySelector("#poker-settings"),
  settingsDialog: document.querySelector("#poker-settings-dialog"),
  settingSound: document.querySelector("#poker-setting-sound"),
  summary: document.querySelector("#poker-summary"),
  summaryContent: document.querySelector("#poker-summary-content"),
  summaryDialog: document.querySelector("#poker-summary-dialog"),
  tutorial: document.querySelector("#poker-tutorial"),
};

function pokerCard(label, suitName) {
  return pokerCore.createCard(label, suitName, "blackjack");
}

const pokerTutorialRounds = window.NeonThreeCardPokerTutorials.map((scenario) => ({
  ...scenario,
  dealer: scenario.dealer.map(([label, suit]) => pokerCard(label, suit)),
  player: scenario.player.map(([label, suit]) => pokerCard(label, suit)),
}));

function savePoker() {
  if (pokerState.tutorial.active) return;
  const resumable =
    (pokerState.phase === POKER_PHASES.BETTING &&
      (pokerState.ante > 0 || pokerState.pairPlus > 0)) ||
    [POKER_PHASES.DEALING, POKER_PHASES.PLAYING].includes(pokerState.phase);
  pokerStorage.write({
    bankroll: pokerState.bankroll,
    highBankroll: pokerState.highBankroll,
    lastWager: pokerState.lastWager,
    session: pokerState.session,
    snapshot: resumable
      ? {
          ante: pokerState.ante,
          anteChips: pokerState.anteChips,
          betTarget: pokerState.betTarget,
          dealerCards: pokerState.dealerCards,
          pairPlus: pokerState.pairPlus,
          pairPlusChips: pokerState.pairPlusChips,
          playerCards: pokerState.playerCards,
        }
      : null,
  });
}

function drawPokerCard() {
  if (pokerState.deck.length < 12) pokerState.deck = buildPokerShoe();
  return pokerState.deck.pop();
}

function currentPokerFunds() {
  const active = [
    POKER_PHASES.BETTING,
    POKER_PHASES.DEALING,
    POKER_PHASES.PLAYING,
    POKER_PHASES.REVEALING,
  ].includes(pokerState.phase);
  return (
    pokerState.bankroll + (active ? pokerState.ante + pokerState.pairPlus + pokerState.play : 0)
  );
}

function selectPokerBet(target) {
  if (pokerState.phase !== POKER_PHASES.BETTING || pokerState.tutorial.active) return;
  pokerState.betTarget = target;
  pokerState.message =
    target === "ante"
      ? "Ante selected. This wager is required to deal."
      : "Pair Plus selected. This optional wager pays on a pair or better.";
  savePoker();
  renderPoker();
}

function addPokerBet(amount) {
  if (
    pokerState.phase !== POKER_PHASES.BETTING ||
    pokerState.tutorial.active ||
    amount > pokerState.bankroll
  )
    return;
  pokerState.bankroll -= amount;
  if (pokerState.betTarget === "ante") {
    pokerState.ante += amount;
    pokerState.anteChips.push(amount);
  } else {
    pokerState.pairPlus += amount;
    pokerState.pairPlusChips.push(amount);
  }
  pokerState.message = `${pokerCore.money(amount)} added to ${pokerState.betTarget === "ante" ? "Ante" : "Pair Plus"}.`;
  savePoker();
  renderPoker();
}

function clearPokerBets() {
  if (pokerState.phase !== POKER_PHASES.BETTING || pokerState.tutorial.active) return;
  pokerState.bankroll += pokerState.ante + pokerState.pairPlus;
  pokerState.ante = 0;
  pokerState.pairPlus = 0;
  pokerState.anteChips = [];
  pokerState.pairPlusChips = [];
  pokerState.message = "Place an Ante to start a round.";
  savePoker();
  renderPoker();
}

function waitForPokerDeal() {
  return new Promise((resolve) => window.setTimeout(resolve, pokerDealDelay));
}

async function dealPoker() {
  if (pokerState.phase !== POKER_PHASES.BETTING || pokerState.ante <= 0) return;
  const tutorialRound = pokerState.tutorial.active
    ? pokerTutorialRounds[pokerState.tutorial.index]
    : null;
  pokerState.playerCards = tutorialRound
    ? tutorialRound.player.map((card) => ({ ...card }))
    : [drawPokerCard(), drawPokerCard(), drawPokerCard()];
  pokerState.dealerCards = tutorialRound
    ? tutorialRound.dealer.map((card) => ({ ...card }))
    : [drawPokerCard(), drawPokerCard(), drawPokerCard()];
  pokerState.dealtCards = { dealer: [false, false, false], player: [false, false, false] };
  pokerState.dealerRevealed = [false, false, false];
  pokerState.playerRevealed = [false, false, false];
  pokerState.phase = POKER_PHASES.DEALING;
  const sequenceId = pokerState.dealSequenceId + 1;
  pokerState.dealSequenceId = sequenceId;
  pokerState.message = "Dealing cards...";
  savePoker();
  renderPoker();

  for (let index = 0; index < 3; index += 1) {
    for (const side of ["player", "dealer"]) {
      await waitForPokerDeal();
      if (pokerState.dealSequenceId !== sequenceId) return;
      pokerState.dealtCards[side][index] = true;
      pokerFeedback.cue("deal");
      renderPoker();
    }
  }

  if (pokerState.dealSequenceId !== sequenceId) return;
  pokerState.phase = POKER_PHASES.PLAYING;
  if (pokerSettings.autoRevealPoker) {
    pokerState.message = "Turning over your cards...";
    renderPoker();
    for (let index = 0; index < pokerState.playerCards.length; index += 1) {
      await waitForPokerDeal();
      if (pokerState.dealSequenceId !== sequenceId) return;
      revealPokerPlayerCard(index, false);
    }
  }
  finishPokerPlayerReveal();
}

function finishPokerPlayerReveal() {
  if (pokerState.playerRevealed.some((revealed) => !revealed)) {
    pokerState.message = "Tap each face-down Player card to reveal your hand.";
    savePoker();
    renderPoker();
    return;
  }
  const playerRank = pokerEngine.rankHand(pokerState.playerCards).name;
  if (pokerState.tutorial.active) {
    const decision = pokerEngine.shouldPlay(pokerState.playerCards) ? "Play" : "Fold";
    pokerState.message = `${playerRank}. ${pokerEngine.strategyReason(pokerState.playerCards)} Basic strategy: ${decision}.`;
    const tutorialRound = pokerTutorialRounds[pokerState.tutorial.index];
    pokerState.tutorial.instruction = `${tutorialRound.intro}\nChoose ${tutorialRound.action === "play" ? "Play" : "Fold"} to continue.`;
  } else {
    pokerState.message = `${playerRank}. Choose Play or Fold.`;
  }
  savePoker();
  renderPoker();
}

function revealPokerPlayerCard(index, shouldFinish = true) {
  if (
    pokerState.phase !== POKER_PHASES.PLAYING ||
    pokerState.playerRevealed[index] ||
    pokerState.dealtCards.player[index] !== true
  )
    return;
  pokerState.playerRevealed[index] = true;
  pokerFeedback.cue("deal");
  if (shouldFinish) finishPokerPlayerReveal();
  else renderPoker();
}

async function settlePoker(folded) {
  if (pokerState.phase !== POKER_PHASES.PLAYING) return;
  if (
    pokerState.tutorial.active &&
    pokerTutorialRounds[pokerState.tutorial.index].action !== (folded ? "fold" : "play")
  )
    return;
  if (!folded) {
    if (pokerState.ante > pokerState.bankroll) return;
    pokerState.play = pokerState.ante;
    pokerState.bankroll -= pokerState.play;
  }

  pokerState.phase = POKER_PHASES.REVEALING;
  pokerState.message = folded
    ? "Hand folded. Revealing the Dealer..."
    : "Play wager placed. Revealing the Dealer...";
  renderPoker();
  for (let index = 0; index < pokerState.dealerCards.length; index += 1) {
    await waitForPokerDeal();
    if (pokerState.phase !== POKER_PHASES.REVEALING) return;
    pokerState.dealerRevealed[index] = true;
    pokerFeedback.cue("deal");
    renderPoker();
  }

  const settlement = pokerEngine.settleRound({
    ante: pokerState.ante,
    dealerCards: pokerState.dealerCards,
    folded,
    pairPlus: pokerState.pairPlus,
    play: pokerState.play,
    playerCards: pokerState.playerCards,
  });
  pokerState.bankroll = Math.round((pokerState.bankroll + settlement.totalPayout) * 100) / 100;
  pokerState.phase = POKER_PHASES.SETTLED;
  pokerState.result = settlement.result;
  if (!pokerState.tutorial.active) {
    pokerState.highBankroll = Math.max(pokerState.highBankroll, pokerState.bankroll);
    pokerState.lastWager = { ante: pokerState.ante, pairPlus: pokerState.pairPlus };
    const outcomeCounter =
      settlement.result === "Fold"
        ? "folds"
        : settlement.result === "Loss"
          ? "losses"
          : settlement.result === "Push"
            ? "pushes"
            : "wins";
    pokerState.session = pokerSessions.record(pokerState.session, {
      bankroll: pokerState.bankroll,
      increments: {
        anteBonuses: settlement.anteBonus ? 1 : 0,
        pairPlusWins: settlement.pairPlusPayout ? 1 : 0,
        rounds: 1,
        [outcomeCounter]: 1,
      },
    });
  }

  const playerName = pokerEngine.rankHand(pokerState.playerCards).name;
  const dealerName = pokerEngine.rankHand(pokerState.dealerCards).name;
  const extras = [];
  if (settlement.anteBonus) extras.push(`Ante Bonus ${pokerCore.money(settlement.anteBonus)}`);
  if (pokerState.pairPlus > 0) {
    extras.push(
      settlement.pairPlusPayout
        ? `Pair Plus paid ${pokerCore.money(settlement.pairPlusPayout)}`
        : "Pair Plus lost",
    );
  }
  pokerState.message = `${settlement.result}. Player ${playerName}; Dealer ${dealerName}.${extras.length ? ` ${extras.join(". ")}.` : ""}`;
  if (pokerState.tutorial.active) {
    const scenario = pokerTutorialRounds[pokerState.tutorial.index];
    const isLast = pokerState.tutorial.index === pokerTutorialRounds.length - 1;
    pokerState.tutorial.instruction = `${scenario.result}\n${isLast ? "Tutorial complete. Click New Game for normal play." : "Click Next Round to continue."}`;
  }
  pokerFeedback.cue(
    ["Win", "Dealer Does Not Qualify"].includes(settlement.result) ? "win" : "loss",
  );
  pokerFeedback.vibrate(
    ["Win", "Dealer Does Not Qualify"].includes(settlement.result) ? [20, 30, 20] : 20,
  );
  savePoker();
  renderPoker();
}

function nextPokerRound() {
  if (pokerState.phase !== POKER_PHASES.SETTLED) return;
  if (pokerState.tutorial.active) {
    pokerState.tutorial.index += 1;
    if (pokerState.tutorial.index < pokerTutorialRounds.length) {
      preparePokerTutorialRound();
      return;
    }
  }
  pokerState.ante = 0;
  pokerState.anteChips = [];
  pokerState.dealerCards = [];
  pokerState.pairPlus = 0;
  pokerState.pairPlusChips = [];
  pokerState.play = 0;
  pokerState.playerCards = [];
  pokerState.playerRevealed = [];
  pokerState.result = null;
  pokerState.phase = POKER_PHASES.BETTING;
  pokerState.message =
    pokerState.bankroll > 0
      ? "Place an Ante to start a round."
      : "You're out of chips. Start a new game to reset your bankroll.";
  savePoker();
  renderPoker();
}

function preparePokerTutorialRound() {
  const scenario = pokerTutorialRounds[pokerState.tutorial.index];
  pokerState.ante = scenario.ante;
  pokerState.anteChips = [scenario.ante];
  pokerState.bankroll = pokerStartingBankroll - scenario.ante - scenario.pairPlus;
  pokerState.betTarget = "ante";
  pokerState.dealerCards = [];
  pokerState.dealerRevealed = [];
  pokerState.dealtCards = { dealer: [], player: [] };
  pokerState.pairPlus = scenario.pairPlus;
  pokerState.pairPlusChips = scenario.pairPlus ? [scenario.pairPlus] : [];
  pokerState.phase = POKER_PHASES.BETTING;
  pokerState.play = 0;
  pokerState.playerCards = [];
  pokerState.playerRevealed = [];
  pokerState.result = null;
  pokerState.message = "Tutorial wagers are ready. Click Deal.";
  pokerState.tutorial.instruction = `${scenario.intro}\nClick Deal to see the hand.`;
  renderPoker();
}

function startPokerTutorial() {
  pokerState.dealSequenceId += 1;
  pokerState.tutorial.active = true;
  pokerState.tutorial.index = 0;
  preparePokerTutorialRound();
}

function stopPokerTutorial() {
  pokerState.dealSequenceId += 1;
  pokerState.tutorial.active = false;
  pokerState.tutorial.index = 0;
  pokerState.tutorial.instruction = "";
  if (new URLSearchParams(window.location.search).get("tutorial") === "1") {
    window.history.replaceState(null, "", pokerCore.removeQueryParam("tutorial"));
  }
}

function rebetAndDealPoker() {
  const wager = pokerState.lastWager;
  if (
    pokerState.phase !== POKER_PHASES.BETTING ||
    pokerState.tutorial.active ||
    pokerState.ante > 0 ||
    !wager ||
    wager.ante + wager.pairPlus > pokerState.bankroll
  )
    return;
  pokerState.ante = wager.ante;
  pokerState.anteChips = [wager.ante];
  pokerState.pairPlus = wager.pairPlus;
  pokerState.pairPlusChips = wager.pairPlus ? [wager.pairPlus] : [];
  pokerState.bankroll -= wager.ante + wager.pairPlus;
  dealPoker();
}

function resetPokerSession() {
  if (
    pokerState.tutorial.active ||
    pokerState.phase === POKER_PHASES.PLAYING ||
    (pokerState.phase === POKER_PHASES.BETTING && (pokerState.ante > 0 || pokerState.pairPlus > 0))
  )
    return;
  pokerState.session = emptyPokerSession(currentPokerFunds());
  pokerState.message = "Session statistics reset.";
  savePoker();
  renderPoker();
}

function newPokerGame() {
  stopPokerTutorial();
  pokerState.ante = 0;
  pokerState.anteChips = [];
  pokerState.bankroll = pokerStartingBankroll;
  pokerState.betTarget = "ante";
  pokerState.dealerCards = [];
  pokerState.dealerRevealed = [];
  pokerState.dealtCards = { dealer: [], player: [] };
  pokerState.deck = buildPokerShoe();
  pokerState.lastWager = null;
  pokerState.pairPlus = 0;
  pokerState.pairPlusChips = [];
  pokerState.phase = POKER_PHASES.BETTING;
  pokerState.play = 0;
  pokerState.playerCards = [];
  pokerState.playerRevealed = [];
  pokerState.result = null;
  pokerState.session = emptyPokerSession();
  pokerState.message = "Place an Ante to start a round.";
  savePoker();
  renderPoker();
}

function renderPokerHand(target, cards, side) {
  const rendered = cards.flatMap((card, index) => {
    if (pokerState.dealtCards[side]?.[index] !== true) return [];
    const hidden =
      side === "dealer"
        ? pokerState.dealerRevealed[index] !== true
        : pokerState.playerRevealed[index] !== true;
    const element = pokerCore.renderCard(card, { hidden });
    if (side === "player" && hidden && pokerState.phase === POKER_PHASES.PLAYING) {
      element.classList.add("reveal-card");
      element.setAttribute("role", "button");
      element.setAttribute("tabindex", "0");
      element.setAttribute("aria-label", `Reveal Player card ${index + 1}`);
      element.addEventListener("click", () => revealPokerPlayerCard(index));
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          revealPokerPlayerCard(index);
        }
      });
    }
    return [element];
  });
  target.replaceChildren(...rendered);
}

function renderPokerChipStack(target, chips) {
  target.replaceChildren(
    ...chips.slice(-4).map((amount) => {
      const chip = document.createElement("span");
      chip.className = "poker-stack-chip";
      chip.textContent = pokerCore.money(amount);
      return chip;
    }),
  );
}

function renderPokerTutorial() {
  pokerEls.felt.classList.toggle("tutorial-active", pokerState.tutorial.active);
  pokerEls.tutorial.hidden = !pokerState.tutorial.active;
  if (!pokerState.tutorial.active) {
    pokerEls.tutorial.replaceChildren();
    return;
  }
  const complete =
    pokerState.phase === POKER_PHASES.SETTLED &&
    pokerState.tutorial.index === pokerTutorialRounds.length - 1;
  const nextAction =
    pokerState.phase === POKER_PHASES.SETTLED
      ? complete
        ? "New Game"
        : "Next Round"
      : pokerState.phase === POKER_PHASES.PLAYING
        ? pokerTutorialRounds[pokerState.tutorial.index].action === "play"
          ? "Play"
          : "Fold"
        : "Deal";
  window.NeonTutorialUi.render({
    complete,
    container: pokerEls.tutorial,
    current: pokerState.tutorial.index + 1,
    instruction: pokerState.tutorial.instruction,
    nextAction,
    onRestart: startPokerTutorial,
    strategyHref: "../three-card-poker-rules/index.html#strategy-title",
    total: pokerTutorialRounds.length,
    unit: "Hand",
  });
}

function renderPokerSession() {
  const session = pokerState.session;
  const profit = pokerSessions.profit(session, currentPokerFunds(), {
    disabled: pokerState.tutorial.active,
  });
  pokerEls.sessionRounds.textContent = String(session.rounds);
  pokerEls.sessionWins.textContent = String(session.wins);
  pokerEls.sessionLosses.textContent = String(session.losses);
  pokerEls.sessionPushes.textContent = String(session.pushes);
  pokerEls.sessionFolds.textContent = String(session.folds);
  pokerEls.sessionProfit.textContent = pokerCore.money(profit);
  pokerEls.sessionProfit.className = profit > 0 ? "positive" : profit < 0 ? "negative" : "";
}

function openPokerSummary() {
  const session = pokerState.session;
  const profit = pokerSessions.profit(session, currentPokerFunds(), {
    disabled: pokerState.tutorial.active,
  });
  const decided = session.wins + session.losses;
  const winRate = decided ? Math.round((session.wins / decided) * 100) : 0;
  return [
    { label: "Rounds played", value: String(session.rounds) },
    {
      className: profit > 0 ? "positive" : profit < 0 ? "negative" : "",
      label: "Session result",
      value: pokerCore.money(profit),
    },
    { label: "Win rate", value: `${winRate}%` },
    { label: "Folds", value: String(session.folds) },
    { label: "Pair Plus wins", value: String(session.pairPlusWins) },
    { label: "Ante Bonuses", value: String(session.anteBonuses) },
    { label: "Peak bankroll", value: pokerCore.money(session.largestBankroll) },
  ];
}

function renderPoker() {
  const hasPlayerCards =
    pokerState.playerCards.length === 3 && pokerState.phase !== POKER_PHASES.DEALING;
  const showDealer = pokerState.phase === POKER_PHASES.SETTLED;
  renderPokerHand(pokerEls.playerHand, pokerState.playerCards, "player");
  renderPokerHand(pokerEls.dealerHand, pokerState.dealerCards, "dealer");
  renderPokerChipStack(pokerEls.anteStack, pokerState.anteChips);
  renderPokerChipStack(pokerEls.pairPlusStack, pokerState.pairPlusChips);
  renderPokerChipStack(pokerEls.playStack, pokerState.play ? [pokerState.play] : []);
  renderPokerTutorial();
  pokerEls.playerRank.textContent = hasPlayerCards
    ? pokerEngine.rankHand(pokerState.playerCards).name
    : "Waiting";
  pokerEls.dealerRank.textContent = showDealer
    ? pokerEngine.rankHand(pokerState.dealerCards).name
    : pokerState.phase === POKER_PHASES.REVEALING
      ? "Revealing"
      : pokerState.dealerCards.length
        ? "Hidden"
        : "Waiting";
  pokerEls.bankroll.textContent = pokerCore.money(pokerState.bankroll);
  pokerEls.ante.textContent = pokerCore.money(pokerState.ante);
  pokerEls.pairPlus.textContent = pokerCore.money(pokerState.pairPlus);
  pokerEls.highBankroll.textContent = pokerCore.money(pokerState.highBankroll);
  pokerEls.message.textContent = pokerState.message;
  pokerEls.result.hidden = !pokerState.result;
  pokerEls.result.className = pokerState.result
    ? `poker-result ${pokerState.result.toLowerCase().replaceAll(" ", "-")}`
    : "poker-result";
  pokerEls.result.textContent = pokerState.result || "";
  renderPokerSession();

  const betting = pokerState.phase === POKER_PHASES.BETTING;
  const playing = pokerState.phase === POKER_PHASES.PLAYING;
  const playerRevealed = pokerState.playerRevealed.every(Boolean);
  pokerEls.betTargets.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.pokerBet === pokerState.betTarget));
    button.disabled = !betting || pokerState.tutorial.active;
  });
  pokerEls.chips.forEach((button) => {
    button.disabled =
      !betting ||
      pokerState.tutorial.active ||
      Number(button.dataset.pokerChip) > pokerState.bankroll;
  });
  pokerEls.clear.disabled =
    !betting || pokerState.tutorial.active || pokerState.ante + pokerState.pairPlus === 0;
  pokerEls.deal.disabled = !betting || pokerState.ante <= 0;
  const tutorialAction = pokerState.tutorial.active
    ? pokerTutorialRounds[pokerState.tutorial.index].action
    : "";
  pokerEls.fold.disabled =
    !playing || !playerRevealed || (pokerState.tutorial.active && tutorialAction !== "fold");
  pokerEls.play.disabled =
    !playing ||
    !playerRevealed ||
    pokerState.ante > pokerState.bankroll ||
    (pokerState.tutorial.active && tutorialAction !== "play");
  pokerEls.next.disabled =
    pokerState.phase !== POKER_PHASES.SETTLED ||
    (pokerState.tutorial.active && pokerState.tutorial.index === pokerTutorialRounds.length - 1);
  pokerEls.rebet.disabled =
    !betting ||
    pokerState.ante > 0 ||
    !pokerState.lastWager ||
    pokerState.lastWager.ante + pokerState.lastWager.pairPlus > pokerState.bankroll;
  pokerEls.resetSession.disabled =
    pokerState.tutorial.active ||
    playing ||
    pokerState.phase === POKER_PHASES.REVEALING ||
    (betting && (pokerState.ante > 0 || pokerState.pairPlus > 0));
  pokerEls.summary.disabled = pokerState.tutorial.active;
  pokerEls.newGame.disabled =
    pokerState.tutorial.active &&
    pokerState.phase !== POKER_PHASES.SETTLED &&
    pokerState.tutorial.index < pokerTutorialRounds.length - 1;
}

pokerEls.betTargets.forEach((button) =>
  button.addEventListener("click", () => selectPokerBet(button.dataset.pokerBet)),
);
pokerEls.chips.forEach((button) =>
  button.addEventListener("click", () => addPokerBet(Number(button.dataset.pokerChip))),
);
pokerEls.clear.addEventListener("click", clearPokerBets);
pokerEls.deal.addEventListener("click", dealPoker);
pokerEls.fold.addEventListener("click", () => settlePoker(true));
pokerEls.play.addEventListener("click", () => settlePoker(false));
pokerEls.next.addEventListener("click", nextPokerRound);
pokerEls.rebet.addEventListener("click", rebetAndDealPoker);
pokerEls.resetSession.addEventListener("click", resetPokerSession);
pokerEls.newGame.addEventListener("click", newPokerGame);
window.NeonSessionFramework.bindSummaryDialog({
  content: pokerEls.summaryContent,
  dialog: pokerEls.summaryDialog,
  getRows: openPokerSummary,
  trigger: pokerEls.summary,
});
window.NeonTableSettings.bindSettingsDialog({
  controls: {
    autoRevealPoker: pokerEls.settingAutoReveal,
    haptics: pokerEls.settingHaptics,
    sound: pokerEls.settingSound,
  },
  dialog: pokerEls.settingsDialog,
  onChange(settings) {
    pokerSettings = settings;
  },
  store: pokerSettingsStore,
  trigger: pokerEls.settings,
});
pokerCore.setupTooltips();
pokerCore.setupSeedDebugIndicator();
pokerCore.setupCrossTabSync({
  isActive: () =>
    [POKER_PHASES.DEALING, POKER_PHASES.PLAYING, POKER_PHASES.REVEALING].includes(
      pokerState.phase,
    ) ||
    (pokerState.phase === POKER_PHASES.BETTING && (pokerState.ante > 0 || pokerState.pairPlus > 0)),
  key: pokerStorage.key,
});
if (new URLSearchParams(window.location.search).get("tutorial") === "1") {
  startPokerTutorial();
} else {
  renderPoker();
}
