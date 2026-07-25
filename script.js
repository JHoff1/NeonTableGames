const gameCore = window.NeonTableCore;
const blackjackEngine = window.NeonBlackjackEngine;
const GAME_PHASES = gameCore.phases;
const blackjackSettingsStore = window.NeonTableSettings.createSettings();
const blackjackFeedback = window.NeonTableSettings.createFeedback(blackjackSettingsStore);
const blackjackSessions = window.NeonSessionFramework;
const buildBlackjackShoe = gameCore.createShoeBuilder(1, "blackjack");

const highBankrollKey = "neontablegamesHighBankroll";
const legacyHighBankrollKey = "blackjackHighBankroll";
const bankrollKey = "neontablegamesBankroll";
const startingBankroll = 1000;
const blackjackSessionCounters = ["blackjacks", "losses", "pushes", "rounds", "splits", "wins"];

function emptyBlackjackSession(bankroll = startingBankroll) {
  return blackjackSessions.create({ bankroll, counters: blackjackSessionCounters });
}

function sanitizeBlackjackCard(card) {
  try {
    return gameCore.createCard(card?.label, card?.suitName, "blackjack");
  } catch {
    return null;
  }
}

function sanitizeBlackjackWager(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function sanitizeBlackjackSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const bankroll = Number(snapshot.bankroll);
  const bet = Number(snapshot.bet);
  const dealer = Array.isArray(snapshot.dealer)
    ? snapshot.dealer.map(sanitizeBlackjackCard).filter(Boolean)
    : [];
  const deck = Array.isArray(snapshot.deck)
    ? snapshot.deck.map(sanitizeBlackjackCard).filter(Boolean)
    : [];
  const hands = Array.isArray(snapshot.hands)
    ? snapshot.hands
        .map((hand) => {
          const cards = Array.isArray(hand?.cards)
            ? hand.cards.map(sanitizeBlackjackCard).filter(Boolean)
            : [];
          const handBet = Number(hand?.bet);
          if (cards.length < 2 || !Number.isFinite(handBet) || handBet <= 0) return null;
          return {
            bet: handBet,
            cards,
            result: typeof hand.result === "string" ? hand.result : "",
            status: ["playing", "waiting", "stood", "bust"].includes(hand.status)
              ? hand.status
              : "playing",
            wasSplit: Boolean(hand.wasSplit),
          };
        })
        .filter(Boolean)
    : [];
  const phase = snapshot.phase === GAME_PHASES.PLAYING ? GAME_PHASES.PLAYING : GAME_PHASES.BETTING;
  const validPlaying = phase === GAME_PHASES.PLAYING && hands.length > 0 && dealer.length >= 2;
  const validBetting = phase === GAME_PHASES.BETTING && Number.isFinite(bet) && bet > 0;
  if (!Number.isFinite(bankroll) || bankroll < 0 || (!validPlaying && !validBetting)) return null;
  return {
    activeHand: Math.min(
      Math.max(Number(snapshot.activeHand) || 0, 0),
      Math.max(hands.length - 1, 0),
    ),
    bankroll,
    bet: validBetting ? bet : 0,
    betChips: Array.isArray(snapshot.betChips)
      ? snapshot.betChips.map(Number).filter((chip) => Number.isFinite(chip) && chip > 0)
      : [],
    dealer,
    deck,
    hands,
    phase,
  };
}

const blackjackStorage = gameCore.createGameStorage("neontablegames.blackjack", {
  defaults: {
    bankroll: startingBankroll,
    highBankroll: startingBankroll,
    lastWager: null,
    session: emptyBlackjackSession(),
    snapshot: null,
  },
  migrate(storage) {
    const legacyHighBankroll = gameCore.readStoredNumber(legacyHighBankrollKey, startingBankroll, {
      storage,
    });
    return {
      bankroll: gameCore.readStoredNumber(bankrollKey, startingBankroll, { storage }),
      highBankroll: Math.max(
        startingBankroll,
        gameCore.readStoredNumber(highBankrollKey, legacyHighBankroll, { storage }),
      ),
      lastWager: null,
      session: emptyBlackjackSession(
        gameCore.readStoredNumber(bankrollKey, startingBankroll, { storage }),
      ),
      snapshot: null,
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
      lastWager: sanitizeBlackjackWager(value.lastWager),
      session: blackjackSessions.sanitize(value.session, {
        bankroll: Number.isFinite(bankroll) && bankroll >= 0 ? bankroll : startingBankroll,
        counters: blackjackSessionCounters,
      }),
      snapshot: sanitizeBlackjackSnapshot(value.snapshot),
    };
  },
});

const savedBlackjack = blackjackStorage.read();
const savedBlackjackSnapshot = savedBlackjack.snapshot;

const state = {
  bankroll: savedBlackjackSnapshot?.bankroll ?? savedBlackjack.bankroll,
  highBankroll: savedBlackjack.highBankroll,
  session: savedBlackjack.session,
  lastWager: savedBlackjack.lastWager,
  bet: savedBlackjackSnapshot?.bet || 0,
  betChips: savedBlackjackSnapshot?.betChips || [],
  deck: savedBlackjackSnapshot?.deck || [],
  hands: savedBlackjackSnapshot?.hands || [],
  activeHand: savedBlackjackSnapshot?.activeHand || 0,
  dealer: savedBlackjackSnapshot?.dealer || [],
  phase: savedBlackjackSnapshot?.phase || GAME_PHASES.BETTING,
  revealDealer: false,
  message: savedBlackjackSnapshot
    ? savedBlackjackSnapshot.phase === GAME_PHASES.PLAYING
      ? "Round restored. Continue your active hand."
      : "Wager restored. Deal when ready."
    : "Place your bet to start a hand.",
  tutorial: {
    active: false,
    handIndex: 0,
    allowedAction: null,
    instruction: "",
    deck: [],
    intro: false,
    pendingAfterHit: false,
    awaitingNextHand: false,
  },
};

const els = {
  bankroll: document.querySelector("#bankroll"),
  highBankroll: document.querySelector("#high-bankroll"),
  bet: document.querySelector("#bet"),
  shoe: document.querySelector("#shoe"),
  dealerTotal: document.querySelector("#dealer-total"),
  playerTotal: document.querySelector("#player-total"),
  playerHeading: document.querySelector("#player-heading"),
  felt: document.querySelector(".felt"),
  playerZone: document.querySelector(".player-zone"),
  dealerHand: document.querySelector("#dealer-hand"),
  playerHand: document.querySelector("#player-hand"),
  message: document.querySelector("#message"),
  tableBetStack: document.querySelector("#table-bet-stack"),
  clearBet: document.querySelector("#clear-bet"),
  deal: document.querySelector("#deal"),
  hit: document.querySelector("#hit"),
  stand: document.querySelector("#stand"),
  double: document.querySelector("#double"),
  split: document.querySelector("#split"),
  newGame: document.querySelector("#new-game"),
  nextHand: document.querySelector("#next-hand"),
  rebet: document.querySelector("#blackjack-rebet"),
  settings: document.querySelector("#blackjack-settings"),
  settingsDialog: document.querySelector("#blackjack-settings-dialog"),
  settingHaptics: document.querySelector("#blackjack-setting-haptics"),
  settingSound: document.querySelector("#blackjack-setting-sound"),
  resetSession: document.querySelector("#blackjack-reset-session"),
  sessionBlackjacks: document.querySelector("#blackjack-session-blackjacks"),
  sessionLosses: document.querySelector("#blackjack-session-losses"),
  sessionPeak: document.querySelector("#blackjack-session-peak"),
  sessionProfit: document.querySelector("#blackjack-session-profit"),
  sessionPushes: document.querySelector("#blackjack-session-pushes"),
  sessionRounds: document.querySelector("#blackjack-session-rounds"),
  sessionSplits: document.querySelector("#blackjack-session-splits"),
  sessionWins: document.querySelector("#blackjack-session-wins"),
  summary: document.querySelector("#blackjack-summary"),
  summaryContent: document.querySelector("#blackjack-summary-content"),
  summaryDialog: document.querySelector("#blackjack-summary-dialog"),
  chips: [...document.querySelectorAll("[data-chip]")],
  tutorialOverlay: null,
};

const tutorialHands = window.NeonBlackjackTutorials;

function money(value) {
  return gameCore.money(value);
}

function buildDeck() {
  return buildBlackjackShoe();
}

function drawCard() {
  // Tutorial mode intercepts the normal shoe and draws from a scripted stack.
  if (state.tutorial.active && state.tutorial.deck.length > 0) {
    return state.tutorial.deck.shift();
  }

  if (state.deck.length < 12) {
    state.deck = buildDeck();
  }
  return state.deck.pop();
}

const { handLabel, handValue } = blackjackEngine;

function saveBankroll() {
  if (state.tutorial.active) return;
  const resumable =
    (state.phase === GAME_PHASES.BETTING && state.bet > 0) || state.phase === GAME_PHASES.PLAYING;
  blackjackStorage.write({
    bankroll: state.bankroll,
    highBankroll: state.highBankroll,
    lastWager: state.lastWager,
    session: state.session,
    snapshot: resumable
      ? {
          activeHand: state.activeHand,
          bankroll: state.bankroll,
          bet: state.bet,
          betChips: state.betChips,
          dealer: state.dealer,
          deck: state.deck,
          hands: state.hands,
          phase: state.phase,
        }
      : null,
  });
}

function saveHighBankroll() {
  saveBankroll();
}

function updateHighBankroll() {
  if (state.tutorial.active) return;
  if (state.bankroll <= state.highBankroll) return;
  state.highBankroll = state.bankroll;
  saveHighBankroll();
}

function dealerShouldHit() {
  return blackjackEngine.dealerShouldHit(state.dealer);
}

function isBlackjack(hand) {
  return blackjackEngine.isNaturalBlackjack(hand);
}

function activeHand() {
  return state.hands[state.activeHand];
}

function tableBet() {
  return state.hands.reduce((sum, hand) => sum + hand.bet, state.bet);
}

function currentBlackjackFunds() {
  return (
    state.bankroll +
    ([GAME_PHASES.BETTING, GAME_PHASES.PLAYING].includes(state.phase) ? tableBet() : 0)
  );
}

function addBet(amount) {
  if (!tutorialCanUse("chip")) return;
  if (state.phase !== GAME_PHASES.BETTING || amount > state.bankroll) return;
  state.bankroll -= amount;
  state.bet += amount;
  state.betChips.push(amount);
  state.message = `${money(state.bet)} ready. Deal when you're set.`;
  saveBankroll();
  render();
}

function clearBet() {
  if (!tutorialCanUse("clear")) return;
  if (state.phase !== GAME_PHASES.BETTING) return;
  state.bankroll += state.bet;
  state.bet = 0;
  state.betChips = [];
  state.message = "Place your bet to start a hand.";
  saveBankroll();
  render();
}

function deal() {
  if (!tutorialCanUse("deal")) return;
  if (state.phase !== GAME_PHASES.BETTING || state.bet <= 0) return;

  const openingWager = state.bet;
  const playerFirst = drawCard();
  const dealerUpcard = drawCard();
  const playerSecond = drawCard();
  const dealerHoleCard = drawCard();

  state.hands = [
    {
      cards: [playerFirst, playerSecond],
      bet: state.bet,
      status: "playing",
      result: "",
      wasSplit: false,
    },
  ];
  state.bet = 0;
  state.activeHand = 0;
  state.dealer = [dealerUpcard, dealerHoleCard];
  state.phase = GAME_PHASES.PLAYING;
  state.revealDealer = false;
  if (!state.tutorial.active) state.lastWager = openingWager;
  blackjackFeedback.cue("deal");

  if (isBlackjack(activeHand()) || handValue(state.dealer) === 21) {
    settleRound();
    return;
  }

  state.message = handPrompt();
  tutorialAfterDeal();
  saveBankroll();
  render();
}

function hit() {
  if (!tutorialCanUse("hit")) return;
  const hand = activeHand();
  if (state.phase !== GAME_PHASES.PLAYING || !hand) return;

  hand.cards.push(drawCard());
  blackjackFeedback.cue("deal");

  if (handValue(hand.cards) > 21) {
    hand.status = "bust";
    hand.result = "Bust";
    advanceHand();
    return;
  }

  state.message = handPrompt();
  tutorialAfterHit();
  saveBankroll();
  render();
}

function stand() {
  if (!tutorialCanUse("stand")) return;
  const hand = activeHand();
  if (state.phase !== GAME_PHASES.PLAYING || !hand) return;

  hand.status = "stood";
  hand.result = "Stood";
  tutorialBeforeAdvanceFromStand();
  saveBankroll();
  advanceHand();
}

function doubleDown() {
  if (!tutorialCanUse("double")) return;
  const hand = activeHand();
  if (state.phase !== GAME_PHASES.PLAYING || !canDoubleHand(hand)) return;

  state.bankroll -= hand.bet;
  state.betChips.push(hand.bet);
  hand.bet *= 2;
  hand.cards.push(drawCard());
  hand.status = handValue(hand.cards) > 21 ? "bust" : "stood";
  hand.result = hand.status === "bust" ? "Bust" : "Stood";
  saveBankroll();
  advanceHand();
}

function splitHand() {
  if (!tutorialCanUse("split")) return;
  const hand = activeHand();
  if (state.phase !== GAME_PHASES.PLAYING || !canSplitHand(hand)) return;

  state.bankroll -= hand.bet;
  if (!state.tutorial.active) {
    state.session = blackjackSessions.record(state.session, {
      bankroll: currentBlackjackFunds(),
      increments: { splits: 1 },
    });
  }
  state.betChips.push(hand.bet);
  const [first, second] = hand.cards;
  state.hands = [
    { cards: [first, drawCard()], bet: hand.bet, status: "playing", result: "", wasSplit: true },
    { cards: [second, drawCard()], bet: hand.bet, status: "waiting", result: "", wasSplit: true },
  ];
  state.activeHand = 0;
  state.message = "Split into two hands. Play Hand 1 first.";
  tutorialAfterSplit();
  saveBankroll();
  render();
}

function canDoubleHand(hand) {
  return blackjackEngine.canDoubleHand(hand, state.bankroll);
}

function canSplitHand(hand) {
  return blackjackEngine.canSplitHand(hand, state.hands.length, state.bankroll);
}

function tutorialCanUse(action) {
  return !state.tutorial.active || state.tutorial.allowedAction === action;
}

function currentTutorialHand() {
  return tutorialHands[state.tutorial.handIndex];
}

function setTutorialGate(instruction, allowedAction) {
  state.tutorial.instruction = instruction;
  state.tutorial.allowedAction = allowedAction;
}

function startTutorial() {
  state.tutorial.active = true;
  state.tutorial.handIndex = 0;
  state.tutorial.awaitingNextHand = false;
  state.tutorial.intro = true;
  prepareTutorialHand();
  state.message = "Click Deal to start the tutorial.";
  setTutorialGate(
    "Welcome to Blackjack! Your goal is to get closer to 21 than the dealer without going over (busting). Click Deal to begin the first guided hand.",
    "deal",
  );
  render();
}

// The tutorial controller owns stacked decks, instruction copy, and input gates.
// Normal gameplay still uses the same action functions and render path.
function prepareTutorialHand() {
  const scenario = currentTutorialHand();
  state.bankroll = 1000;
  state.bet = 25;
  state.betChips = [25];
  state.hands = [];
  state.dealer = [];
  state.activeHand = 0;
  state.phase = GAME_PHASES.BETTING;
  state.revealDealer = false;
  state.tutorial.deck = scenario.deck.map((item) => ({ ...item }));
  state.tutorial.pendingAfterHit = false;
  state.tutorial.awaitingNextHand = false;
}

function setupTutorialHand() {
  const scenario = currentTutorialHand();
  if (!scenario) {
    setTutorialGate(
      "Tutorial complete. You can start a normal blackjack game whenever you're ready.",
      "new-game",
    );
    state.tutorial.active = false;
    render();
    return;
  }

  state.tutorial.intro = false;
  prepareTutorialHand();
  state.message = "Tutorial hand loading.";
  setTutorialGate("", "deal");
  deal();
}

function tutorialAfterDeal() {
  if (!state.tutorial.active) return;
  const scenario = currentTutorialHand();
  state.tutorial.intro = false;
  setTutorialGate(scenario.instruction, scenario.allowedAction);
  state.message = handPrompt();
}

function tutorialAfterHit() {
  if (!state.tutorial.active) return;
  const scenario = currentTutorialHand();
  if (!scenario.afterHitInstruction) return;
  setTutorialGate(scenario.afterHitInstruction, "stand");
  state.message = `Player: ${handLabel(activeHand().cards)}. Click Stand to finish the hand.`;
}

function tutorialAfterSplit() {
  if (!state.tutorial.active) return;
  const scenario = currentTutorialHand();
  if (!scenario.afterSplitInstruction) return;
  setTutorialGate(scenario.afterSplitInstruction, "stand");
}

function tutorialBeforeAdvanceFromStand() {
  if (!state.tutorial.active) return;
  const scenario = currentTutorialHand();
  if (!scenario.secondHandInstruction) return;

  const nextIndex = state.hands.findIndex(
    (hand, index) => index > state.activeHand && hand.status === "waiting",
  );
  if (nextIndex >= 0) {
    setTutorialGate(scenario.secondHandInstruction, "stand");
  }
}

function tutorialAfterSettle() {
  if (!state.tutorial.active) return;
  const scenario = currentTutorialHand();
  const isLastHand = state.tutorial.handIndex >= tutorialHands.length - 1;
  const resultInstruction = scenario.resultInstruction || "Hand complete.";
  const nextInstruction = isLastHand
    ? "Tutorial complete. You saw standing against weak dealer cards, soft hand flexibility, splitting 8s, doubling 11, hitting hard 16, and keeping 20.\nClick New Game when you're ready for normal play."
    : "Click Next Hand to continue the tutorial.";
  const instruction = `${resultInstruction}\n${nextInstruction}`;
  setTutorialGate(instruction, isLastHand ? "new-game" : "next");
  state.tutorial.awaitingNextHand = !isLastHand;
}

function tutorialNextHand() {
  if (!state.tutorial.active || !state.tutorial.awaitingNextHand) return false;
  state.tutorial.handIndex += 1;
  setupTutorialHand();
  return true;
}

function stopTutorial() {
  state.tutorial.active = false;
  state.tutorial.allowedAction = null;
  state.tutorial.instruction = "";
  state.tutorial.deck = [];
  state.tutorial.intro = false;
  state.tutorial.awaitingNextHand = false;

  if (new URLSearchParams(window.location.search).get("tutorial") === "1") {
    window.history.replaceState(null, "", gameCore.removeQueryParam("tutorial"));
  }
}

function advanceHand() {
  const nextIndex = state.hands.findIndex(
    (hand, index) => index > state.activeHand && hand.status === "waiting",
  );

  if (nextIndex >= 0) {
    state.activeHand = nextIndex;
    state.hands[nextIndex].status = "playing";
    state.message = handPrompt();
    saveBankroll();
    render();
    return;
  }

  settleRound();
}

function dealerShouldPlay() {
  return blackjackEngine.dealerShouldPlay(state.hands);
}

function settleRound() {
  state.phase = GAME_PHASES.SETTLED;
  state.revealDealer = true;

  const hasNaturalBlackjack = state.hands.some((hand) => isBlackjack(hand));

  if (dealerShouldPlay() && !hasNaturalBlackjack) {
    while (dealerShouldHit()) {
      state.dealer.push(drawCard());
    }
  }

  const settlement = blackjackEngine.settleHands(state.hands, state.dealer);
  state.hands.forEach((hand, index) => {
    hand.result = settlement.settlements[index].result;
    hand.status = settlement.settlements[index].status;
  });

  state.bankroll += settlement.totalPayout;
  if (!state.tutorial.active) {
    const results = settlement.settlements.map(({ result }) => result);
    state.session = blackjackSessions.record(state.session, {
      bankroll: state.bankroll,
      increments: {
        blackjacks: results.filter((result) => result === "Blackjack").length,
        losses: results.filter((result) => result === "Lose" || result === "Bust").length,
        pushes: results.filter((result) => result === "Push").length,
        rounds: 1,
        wins: results.filter((result) => result === "Win" || result === "Blackjack").length,
      },
    });
  }
  updateHighBankroll();
  saveBankroll();
  state.message = roundSummary(settlement.totalPayout);
  const wagered = state.hands.reduce((total, hand) => total + hand.bet, 0);
  const wonRound = settlement.totalPayout > wagered;
  blackjackFeedback.cue(wonRound ? "win" : "loss");
  blackjackFeedback.vibrate(wonRound ? [20, 30, 20] : 20);

  if (state.bankroll <= 0) {
    state.message = "You're out of chips. Start a new game to reset your bankroll.";
  }

  tutorialAfterSettle();
  render();
}

function roundSummary(totalPayout) {
  const results = state.hands.map((hand, index) => `Hand ${index + 1}: ${hand.result}`).join(" | ");
  if (totalPayout > 0) {
    return `${results}. Paid ${money(totalPayout)}.`;
  }
  return results;
}

function handPrompt() {
  const hand = activeHand();
  if (!hand) return "Place your bet to start a hand.";

  const handName = state.hands.length > 1 ? `Hand ${state.activeHand + 1}` : "Your hand";
  const options = canSplitHand(hand) ? "hit, stand, double, or split" : "hit, stand, or double";
  return `${handName}: ${handLabel(hand.cards)}. Choose ${options}.`;
}

function resetRound() {
  if (state.tutorial.active) {
    if (tutorialCanUse("next")) tutorialNextHand();
    return;
  }
  if (state.phase === GAME_PHASES.PLAYING) return;
  state.hands = [];
  state.dealer = [];
  state.betChips = [];
  state.activeHand = 0;
  state.revealDealer = false;
  state.phase = GAME_PHASES.BETTING;
  state.message =
    state.bankroll > 0
      ? "Place your bet to start a hand."
      : "You're out of chips. Start a new game to reset your bankroll.";
  saveBankroll();
  render();
}

function rebetAndDealBlackjack() {
  if (
    state.phase !== GAME_PHASES.BETTING ||
    state.tutorial.active ||
    state.bet > 0 ||
    !state.lastWager ||
    state.lastWager > state.bankroll
  )
    return;
  state.bankroll -= state.lastWager;
  state.bet = state.lastWager;
  state.betChips = chipAmountsForBet(state.lastWager);
  deal();
}

function newGame(resetBankroll = true) {
  if (state.tutorial.active && !tutorialCanUse("new-game")) return;
  stopTutorial();
  if (resetBankroll) {
    state.bankroll = startingBankroll;
    state.session = emptyBlackjackSession();
    state.lastWager = null;
  }
  state.bet = 0;
  state.betChips = [];
  state.deck = buildDeck();
  state.hands = [];
  state.activeHand = 0;
  state.dealer = [];
  state.phase = GAME_PHASES.BETTING;
  state.revealDealer = false;
  state.message = "Place your bet to start a hand.";
  saveBankroll();
  render();
}

function resetBlackjackSession() {
  if (
    state.tutorial.active ||
    state.phase === GAME_PHASES.PLAYING ||
    (state.phase === GAME_PHASES.BETTING && state.bet > 0)
  )
    return;
  state.session = emptyBlackjackSession(currentBlackjackFunds());
  state.message = "Session statistics reset.";
  saveBankroll();
  render();
}

function blackjackSummaryRows() {
  const session = state.session;
  const profit = blackjackSessions.profit(session, currentBlackjackFunds(), {
    disabled: state.tutorial.active,
  });
  const decidedHands = session.wins + session.losses;
  const winRate = decidedHands ? Math.round((session.wins / decidedHands) * 100) : 0;
  return [
    { label: "Rounds played", value: String(session.rounds) },
    {
      className: profit > 0 ? "positive" : profit < 0 ? "negative" : "",
      label: "Session result",
      value: money(profit),
    },
    { label: "Winning hands", value: String(session.wins) },
    { label: "Losing hands", value: String(session.losses) },
    { label: "Win rate", value: `${winRate}%` },
    { label: "Pushes", value: String(session.pushes) },
    { label: "Blackjacks", value: String(session.blackjacks) },
    { label: "Splits", value: String(session.splits) },
    { label: "Peak bankroll", value: money(session.largestBankroll) },
  ];
}

function renderBlackjackSession() {
  const session = state.session;
  const profit = blackjackSessions.profit(session, currentBlackjackFunds(), {
    disabled: state.tutorial.active,
  });
  els.sessionRounds.textContent = String(session.rounds);
  els.sessionWins.textContent = String(session.wins);
  els.sessionLosses.textContent = String(session.losses);
  els.sessionPushes.textContent = String(session.pushes);
  els.sessionBlackjacks.textContent = String(session.blackjacks);
  els.sessionSplits.textContent = String(session.splits);
  els.sessionPeak.textContent = money(session.largestBankroll);
  els.sessionProfit.textContent = money(profit);
  els.sessionProfit.className = profit > 0 ? "positive" : profit < 0 ? "negative" : "";
}

function cardTemplate(card, hidden = false) {
  const article = document.createElement("article");
  article.className = hidden ? "card back" : `card ${card.color === "red" ? "red" : ""}`;
  article.setAttribute("aria-label", hidden ? "Hidden card" : `${card.label} of ${card.suitName}`);

  if (!hidden) {
    article.innerHTML = `
      <span class="rank">${card.label}</span>
      <span class="suit">${card.suit}</span>
      <span class="corner">${card.label}</span>
    `;
  }

  return article;
}

function renderHand(target, cards, hideSecondCard = false) {
  target.replaceChildren();
  cards.forEach((card, index) => {
    target.append(cardTemplate(card, hideSecondCard && index === 1));
  });
}

function renderPlayerHands() {
  els.playerHand.replaceChildren();

  if (state.hands.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-hand";
    empty.textContent = "No hand dealt";
    els.playerHand.append(empty);
    return;
  }

  state.hands.forEach((hand, index) => {
    const panel = document.createElement("article");
    const isActive = state.phase === GAME_PHASES.PLAYING && index === state.activeHand;
    panel.className = `player-hand-panel ${isActive ? "active" : ""}`;

    const meta = document.createElement("div");
    meta.className = "hand-meta";
    meta.innerHTML = `
      <span>${state.hands.length > 1 ? `Hand ${index + 1}` : "Player"}</span>
      <strong>${handLabel(hand.cards)}</strong>
    `;

    const cards = document.createElement("div");
    cards.className = "hand";
    renderHand(cards, hand.cards);

    const footer = document.createElement("div");
    footer.className = "hand-footer";
    footer.innerHTML = `
      <span>${money(hand.bet)}</span>
      <strong>${isActive ? "Active" : hand.result || hand.status}</strong>
    `;

    const chipRail = document.createElement("div");
    chipRail.className = "hand-chip-rail";
    if (state.hands.length === 1 && state.phase !== GAME_PHASES.BETTING) {
      renderChipStack(chipRail, {
        chips: chipAmountsForBet(hand.bet),
        visibleLimit: 4,
      });
    }

    if (state.hands.length > 1) {
      renderChipStack(chipRail, {
        chips: chipAmountsForBet(hand.bet),
        visibleLimit: 4,
      });
    }

    panel.append(meta, chipRail, cards, footer);
    els.playerHand.append(panel);
  });
}

function renderChipStack(target, options = {}) {
  target.replaceChildren();

  const visibleLimit = options.visibleLimit || 12;
  const chips = options.chips || state.betChips;
  const visibleChips = chips.slice(-visibleLimit);
  target.classList.toggle("has-chips", visibleChips.length > 0);

  visibleChips.forEach((amount, index) => {
    const chip = document.createElement("span");
    chip.className = "stack-chip";
    chip.dataset.chip = String(amount);
    chip.innerHTML = `<span class="chip-label"><span class="chip-dollar">$</span>${amount}</span>`;
    chip.style.setProperty("--stack-index", String(index));
    target.append(chip);
  });
}

function chipAmountsForBet(amount) {
  const chips = [];
  let remaining = amount;
  [500, 100, 25, 5].forEach((chip) => {
    while (remaining >= chip) {
      chips.push(chip);
      remaining -= chip;
    }
  });
  return chips.length > 0 ? chips : [amount];
}

function renderBetStack() {
  if (state.hands.length > 0) {
    els.tableBetStack.replaceChildren();
    els.tableBetStack.classList.remove("has-chips");
    return;
  }
  renderChipStack(els.tableBetStack, { visibleLimit: 10 });
}

function render() {
  tooltipController.hide();
  const hiddenDealer = state.dealer.length > 1 && !state.revealDealer;
  const visibleDealerTotal = hiddenDealer ? String(state.dealer[0].value) : handLabel(state.dealer);
  const hand = activeHand();
  const inBetting = state.phase === GAME_PHASES.BETTING;
  const inPlaying = state.phase === GAME_PHASES.PLAYING;

  els.bankroll.textContent = money(state.bankroll);
  els.highBankroll.textContent = money(state.highBankroll);
  els.bet.textContent = money(tableBet());
  els.shoe.textContent = String(state.deck.length);
  els.dealerTotal.textContent = String(visibleDealerTotal || 0);
  els.playerTotal.textContent = String(hand ? handLabel(hand.cards) : 0);
  els.felt.classList.toggle("has-split-hands", state.hands.length > 1);
  els.playerZone.classList.toggle("has-split-hands", state.hands.length > 1);
  els.playerHeading.textContent = "Player";
  els.message.textContent = state.message;

  renderHand(els.dealerHand, state.dealer, hiddenDealer);
  renderPlayerHands();
  renderBetStack();

  els.chips.forEach((button) => {
    const amount = Number(button.dataset.chip);
    button.disabled = !inBetting || amount > state.bankroll || !tutorialCanUse("chip");
  });
  els.clearBet.disabled = !inBetting || state.bet === 0 || !tutorialCanUse("clear");
  els.deal.disabled = !inBetting || state.bet === 0 || !tutorialCanUse("deal");
  els.hit.disabled = !inPlaying || !tutorialCanUse("hit");
  els.stand.disabled = !inPlaying || !tutorialCanUse("stand");
  els.double.disabled = !inPlaying || !canDoubleHand(hand) || !tutorialCanUse("double");
  els.split.disabled = !inPlaying || !canSplitHand(hand) || !tutorialCanUse("split");
  els.newGame.disabled = state.tutorial.active && !tutorialCanUse("new-game");
  els.nextHand.disabled = state.tutorial.active
    ? !tutorialCanUse("next")
    : state.phase !== GAME_PHASES.SETTLED || state.bankroll <= 0;
  els.rebet.disabled =
    !inBetting ||
    state.tutorial.active ||
    state.bet > 0 ||
    !state.lastWager ||
    state.lastWager > state.bankroll;
  els.resetSession.disabled = state.tutorial.active || inPlaying || (inBetting && state.bet > 0);
  els.summary.disabled = state.tutorial.active;
  renderBlackjackSession();
  renderTutorialOverlay();
}

function renderTutorialOverlay() {
  if (!els.tutorialOverlay) {
    els.tutorialOverlay = document.createElement("aside");
    els.tutorialOverlay.className = "tutorial-overlay";
    els.tutorialOverlay.setAttribute("aria-live", "polite");
    els.felt.append(els.tutorialOverlay);
  }

  els.felt.classList.toggle("tutorial-active", state.tutorial.active);
  document.body.classList.toggle("tutorial-active", state.tutorial.active);

  if (!state.tutorial.active || !state.tutorial.instruction) {
    els.tutorialOverlay.hidden = true;
    els.tutorialOverlay.replaceChildren();
    return;
  }

  const actionLabels = {
    deal: "Deal",
    double: "Double",
    hit: "Hit",
    stand: "Stand",
    split: "Split",
    next: "Next Hand",
    "new-game": "New Game",
  };
  const allowedLabel = actionLabels[state.tutorial.allowedAction] || "";

  els.tutorialOverlay.hidden = false;
  window.NeonTutorialUi.render({
    complete: state.tutorial.allowedAction === "new-game",
    container: els.tutorialOverlay,
    current: state.tutorial.handIndex + 1,
    instruction: state.tutorial.instruction,
    intro: state.tutorial.intro,
    nextAction: allowedLabel,
    onRestart: startTutorial,
    strategyHref: "../blackjack-rules/index.html#strategy-chart-title",
    total: tutorialHands.length,
    unit: "Hand",
  });
}

els.chips.forEach((button) => {
  button.addEventListener("click", () => addBet(Number(button.dataset.chip)));
});
els.clearBet.addEventListener("click", clearBet);
els.deal.addEventListener("click", deal);
els.hit.addEventListener("click", hit);
els.stand.addEventListener("click", stand);
els.double.addEventListener("click", doubleDown);
els.split.addEventListener("click", splitHand);
els.newGame.addEventListener("click", () => newGame());
els.nextHand.addEventListener("click", resetRound);
els.rebet.addEventListener("click", rebetAndDealBlackjack);
els.resetSession.addEventListener("click", resetBlackjackSession);
window.NeonSessionFramework.bindSummaryDialog({
  content: els.summaryContent,
  dialog: els.summaryDialog,
  getRows: blackjackSummaryRows,
  trigger: els.summary,
});
window.NeonTableSettings.bindSettingsDialog({
  controls: { haptics: els.settingHaptics, sound: els.settingSound },
  dialog: els.settingsDialog,
  store: blackjackSettingsStore,
  trigger: els.settings,
});

const tooltipController = gameCore.setupTooltips();
gameCore.setupSeedDebugIndicator();
gameCore.setupCrossTabSync({
  isActive: () =>
    state.phase === GAME_PHASES.PLAYING || (state.phase === GAME_PHASES.BETTING && state.bet > 0),
  key: blackjackStorage.key,
});

if (new URLSearchParams(window.location.search).get("tutorial") === "1") {
  startTutorial();
} else if (savedBlackjackSnapshot) {
  if (state.deck.length < 12) state.deck = buildDeck();
  render();
} else {
  newGame(false);
}
