const suits = [
  { name: "spades", symbol: "&spades;", color: "black" },
  { name: "hearts", symbol: "&hearts;", color: "red" },
  { name: "diamonds", symbol: "&diams;", color: "red" },
  { name: "clubs", symbol: "&clubs;", color: "black" },
];
const ranks = [
  { label: "A", value: 11 },
  { label: "2", value: 2 },
  { label: "3", value: 3 },
  { label: "4", value: 4 },
  { label: "5", value: 5 },
  { label: "6", value: 6 },
  { label: "7", value: 7 },
  { label: "8", value: 8 },
  { label: "9", value: 9 },
  { label: "10", value: 10 },
  { label: "J", value: 10 },
  { label: "Q", value: 10 },
  { label: "K", value: 10 },
];

const highBankrollKey = "neontablegamesHighBankroll";
const legacyHighBankrollKey = "blackjackHighBankroll";
const bankrollKey = "neontablegamesBankroll";

const state = {
  bankroll: readBankroll(),
  highBankroll: readHighBankroll(),
  bet: 0,
  betChips: [],
  deck: [],
  hands: [],
  activeHand: 0,
  dealer: [],
  phase: "betting",
  revealDealer: false,
  message: "Place your bet to start a hand.",
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
  chips: [...document.querySelectorAll("[data-chip]")],
  tutorialOverlay: null,
  tooltip: null,
};

// Tutorial scenarios are deterministic mini-hands. Cards are ordered as:
// player card 1, dealer upcard, player card 2, dealer hole card, then hit cards.
const tutorialHands = [
  {
    instruction: "You have 13. The dealer shows a weak 5. Basic strategy says: Stand here and let the dealer take the risk of busting.",
    allowedAction: "stand",
    deck: [
      card("10", "hearts"),
      card("5", "clubs"),
      card("3", "spades"),
      card("10", "diamonds"),
      card("J", "clubs"),
    ],
    resultInstruction: "Result: you win. You stood on 13 because the dealer showed a weak 5. The dealer had 15, had to hit, drew a 10-value card, and busted.",
  },
  {
    instruction: "You have an Ace and a 2. This is a 'Soft 13' because the Ace can count as 1 or 11. You cannot bust by hitting. Let's take a card.",
    allowedAction: "hit",
    deck: [
      card("A", "spades"),
      card("6", "clubs"),
      card("2", "hearts"),
      card("10", "diamonds"),
      card("8", "clubs"),
      card("2", "spades"),
    ],
    afterHitInstruction: "Perfect! If your first two cards had totaled a hard 11 instead of a soft 13, you would have seen a 'Double Down' option. This lets you double your bet in exchange for exactly ONE more card--the ultimate offensive move when the dealer shows a weak card like a 6.",
    resultInstruction: "Result: you win. Your hit turned soft 13 into 21. The dealer finished at 18, so your 21 beat the dealer without needing blackjack.",
  },
  {
    instruction: "A pair of 8s totals 16--notoriously the worst starting hand in Blackjack. Standing usually loses, and hitting will likely bust you. Because you have a pair, your secret weapon is 'Splitting'. This separates them into two hands, turning a bad situation into two offensive positions.",
    allowedAction: "split",
    deck: [
      card("8", "hearts"),
      card("7", "clubs"),
      card("8", "spades"),
      card("10", "diamonds"),
      card("10", "clubs"),
      card("9", "hearts"),
    ],
    afterSplitInstruction: "Great split. Hand 1 is now 18, a strong total against the dealer's 7. Stand and move to Hand 2.",
    secondHandInstruction: "Hand 2 is 17. It is not flashy, but it is much better than playing one hard 16. Stand and let the dealer resolve the hand.",
    resultInstruction: "Result: Hand 1 wins and Hand 2 pushes. The dealer finished at 17. Your first split hand had 18, so it won. Your second split hand also had 17, so that hand tied the dealer and your bet was returned.",
  },
  {
    instruction: "You have hard 11 against a dealer 6. This is one of the clearest attacking spots in blackjack. Double down to double your bet and take exactly one more card.",
    allowedAction: "double",
    deck: [
      card("6", "hearts"),
      card("6", "clubs"),
      card("5", "spades"),
      card("10", "diamonds"),
      card("K", "clubs"),
      card("5", "hearts"),
    ],
    resultInstruction: "Result: push. Doubling on 11 was still the right play, but the dealer drew to 21 too. A push returns the doubled bet instead of winning or losing it.",
  },
  {
    instruction: "You have hard 16 against a dealer 10. It feels uncomfortable, but the dealer is showing strength. Basic strategy says to hit because standing loses too often.",
    allowedAction: "hit",
    deck: [
      card("10", "hearts"),
      card("10", "clubs"),
      card("6", "spades"),
      card("7", "diamonds"),
      card("3", "clubs"),
    ],
    afterHitInstruction: "Nice. You improved hard 16 to 19. Stand and make the dealer finish the hand.",
    resultInstruction: "Result: you win. Hitting hard 16 was risky, but standing against a dealer 10 loses too often. The hit made 19, which beat the dealer's 17.",
  },
  {
    instruction: "You have soft 18 against a dealer 9. Soft 18 looks strong, but against a strong dealer upcard it often needs improvement. Hit because the ace protects you from busting.",
    allowedAction: "hit",
    deck: [
      card("A", "spades"),
      card("9", "clubs"),
      card("7", "hearts"),
      card("7", "diamonds"),
      card("2", "clubs"),
      card("10", "spades"),
    ],
    afterHitInstruction: "Good hit. Soft 18 became soft 20. Stand and let the dealer play out the hand.",
    resultInstruction: "Result: you win. Soft 18 improved to soft 20, and the dealer busted while trying to draw from 16.",
  },
  {
    instruction: "You have two 10-value cards for a total of 20. Even against a weak dealer 6, do not split 10s. A made 20 is already one of the best hands you can have.",
    allowedAction: "stand",
    deck: [
      card("10", "hearts"),
      card("6", "clubs"),
      card("K", "spades"),
      card("10", "diamonds"),
      card("Q", "clubs"),
    ],
    resultInstruction: "Result: you win. You kept the made 20 instead of splitting 10s. The dealer busted from 16, and your strong hand was paid.",
  },
];

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function card(label, suitName) {
  const rank = ranks.find((item) => item.label === label);
  const suit = suits.find((item) => item.name === suitName);
  return { ...rank, suit: suit.symbol, suitName: suit.name, color: suit.color };
}

function buildDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(card(rank.label, suit.name));
    }
  }
  return shuffle(deck);
}

function shuffle(cards) {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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

function handScore(cards) {
  let total = cards.reduce((sum, card) => sum + card.value, 0);
  let aces = cards.filter((card) => card.label === "A").length;
  let acesAdjusted = 0;

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
    acesAdjusted += 1;
  }

  return {
    total,
    isSoft: cards.some((card) => card.label === "A") && aces > 0,
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

function readHighBankroll() {
  try {
    return Math.max(
      1000,
      Number(localStorage.getItem(highBankrollKey)) ||
        Number(localStorage.getItem(legacyHighBankrollKey)) ||
        1000
    );
  } catch {
    return 1000;
  }
}

function readBankroll() {
  try {
    const storedBankroll = localStorage.getItem(bankrollKey);
    if (storedBankroll === null) return 1000;

    const savedBankroll = Number(storedBankroll);
    return Number.isFinite(savedBankroll) && savedBankroll >= 0
      ? savedBankroll
      : 1000;
  } catch {
    return 1000;
  }
}

function saveBankroll() {
  if (state.tutorial.active) return;

  try {
    localStorage.setItem(bankrollKey, String(state.bankroll));
  } catch {
    // Local storage can be unavailable in some browser privacy modes.
  }
}

function saveHighBankroll() {
  try {
    localStorage.setItem(highBankrollKey, String(state.highBankroll));
  } catch {
    // Local storage can be unavailable in some browser privacy modes.
  }
}

function updateHighBankroll() {
  if (state.tutorial.active) return;
  if (state.bankroll <= state.highBankroll) return;
  state.highBankroll = state.bankroll;
  saveHighBankroll();
}

function isSoftTotal(cards) {
  return handScore(cards).isSoft;
}

function dealerShouldHit() {
  const total = handValue(state.dealer);
  return total < 17 || (total === 17 && isSoftTotal(state.dealer));
}

function isBlackjack(hand) {
  return !hand.wasSplit && hand.cards.length === 2 && handValue(hand.cards) === 21;
}

function activeHand() {
  return state.hands[state.activeHand];
}

function tableBet() {
  return state.hands.reduce((sum, hand) => sum + hand.bet, state.bet);
}

function addBet(amount) {
  if (!tutorialCanUse("chip")) return;
  if (state.phase !== "betting" || amount > state.bankroll) return;
  state.bankroll -= amount;
  state.bet += amount;
  state.betChips.push(amount);
  state.message = `${money(state.bet)} ready. Deal when you're set.`;
  render();
}

function clearBet() {
  if (!tutorialCanUse("clear")) return;
  if (state.phase !== "betting") return;
  state.bankroll += state.bet;
  state.bet = 0;
  state.betChips = [];
  state.message = "Place your bet to start a hand.";
  render();
}

function deal() {
  if (!tutorialCanUse("deal")) return;
  if (state.phase !== "betting" || state.bet <= 0) return;

  const playerFirst = drawCard();
  const dealerUpcard = drawCard();
  const playerSecond = drawCard();
  const dealerHoleCard = drawCard();

  state.hands = [{
    cards: [playerFirst, playerSecond],
    bet: state.bet,
    status: "playing",
    result: "",
    wasSplit: false,
  }];
  state.bet = 0;
  state.activeHand = 0;
  state.dealer = [dealerUpcard, dealerHoleCard];
  state.phase = "playing";
  state.revealDealer = false;

  if (isBlackjack(activeHand()) || handValue(state.dealer) === 21) {
    settleRound();
    return;
  }

  state.message = handPrompt();
  tutorialAfterDeal();
  render();
}

function hit() {
  if (!tutorialCanUse("hit")) return;
  const hand = activeHand();
  if (state.phase !== "playing" || !hand) return;

  hand.cards.push(drawCard());

  if (handValue(hand.cards) > 21) {
    hand.status = "bust";
    hand.result = "Bust";
    advanceHand();
    return;
  }

  state.message = handPrompt();
  tutorialAfterHit();
  render();
}

function stand() {
  if (!tutorialCanUse("stand")) return;
  const hand = activeHand();
  if (state.phase !== "playing" || !hand) return;

  hand.status = "stood";
  hand.result = "Stood";
  tutorialBeforeAdvanceFromStand();
  advanceHand();
}

function doubleDown() {
  if (!tutorialCanUse("double")) return;
  const hand = activeHand();
  if (state.phase !== "playing" || !canDoubleHand(hand)) return;

  state.bankroll -= hand.bet;
  state.betChips.push(hand.bet);
  hand.bet *= 2;
  hand.cards.push(drawCard());
  hand.status = handValue(hand.cards) > 21 ? "bust" : "stood";
  hand.result = hand.status === "bust" ? "Bust" : "Stood";
  advanceHand();
}

function splitHand() {
  if (!tutorialCanUse("split")) return;
  const hand = activeHand();
  if (state.phase !== "playing" || !canSplitHand(hand)) return;

  state.bankroll -= hand.bet;
  state.betChips.push(hand.bet);
  const [first, second] = hand.cards;
  state.hands = [
    { cards: [first, drawCard()], bet: hand.bet, status: "playing", result: "", wasSplit: true },
    { cards: [second, drawCard()], bet: hand.bet, status: "waiting", result: "", wasSplit: true },
  ];
  state.activeHand = 0;
  state.message = "Split into two hands. Play Hand 1 first.";
  tutorialAfterSplit();
  render();
}

function canDoubleHand(hand) {
  return Boolean(hand)
    && hand.status === "playing"
    && hand.cards.length === 2
    && state.bankroll >= hand.bet;
}

function canSplitHand(hand) {
  return Boolean(hand)
    && state.hands.length === 1
    && hand.status === "playing"
    && hand.cards.length === 2
    && hand.cards[0].value === hand.cards[1].value
    && state.bankroll >= hand.bet;
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
    "deal"
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
  state.phase = "betting";
  state.revealDealer = false;
  state.tutorial.deck = scenario.deck.map((item) => ({ ...item }));
  state.tutorial.pendingAfterHit = false;
  state.tutorial.awaitingNextHand = false;
}

function setupTutorialHand() {
  const scenario = currentTutorialHand();
  if (!scenario) {
    setTutorialGate("Tutorial complete. You can start a normal blackjack game whenever you're ready.", "new-game");
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

  const nextIndex = state.hands.findIndex((hand, index) => index > state.activeHand && hand.status === "waiting");
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
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
  }
}

function advanceHand() {
  const nextIndex = state.hands.findIndex((hand, index) => index > state.activeHand && hand.status === "waiting");

  if (nextIndex >= 0) {
    state.activeHand = nextIndex;
    state.hands[nextIndex].status = "playing";
    state.message = handPrompt();
    render();
    return;
  }

  settleRound();
}

function dealerShouldPlay() {
  return state.hands.some((hand) => handValue(hand.cards) <= 21);
}

function settleRound() {
  state.phase = "settled";
  state.revealDealer = true;

  const hasNaturalBlackjack = state.hands.some((hand) => isBlackjack(hand));

  if (dealerShouldPlay() && !hasNaturalBlackjack) {
    while (dealerShouldHit()) {
      state.dealer.push(drawCard());
    }
  }

  const dealerTotal = handValue(state.dealer);
  const dealerBlackjack = state.dealer.length === 2 && dealerTotal === 21;
  let totalPayout = 0;

  state.hands.forEach((hand) => {
    const playerTotal = handValue(hand.cards);
    let payout = 0;

    if (isBlackjack(hand) && !dealerBlackjack) {
      payout = Math.floor(hand.bet * 2.5);
      hand.result = "Blackjack";
    } else if (dealerBlackjack && !isBlackjack(hand)) {
      hand.result = "Dealer blackjack";
    } else if (playerTotal > 21) {
      hand.result = "Bust";
    } else if (dealerTotal > 21) {
      payout = hand.bet * 2;
      hand.result = "Win";
    } else if (playerTotal > dealerTotal) {
      payout = hand.bet * 2;
      hand.result = "Win";
    } else if (playerTotal === dealerTotal) {
      payout = hand.bet;
      hand.result = "Push";
    } else {
      hand.result = "Lose";
    }

    hand.status = "settled";
    totalPayout += payout;
  });

  state.bankroll += totalPayout;
  updateHighBankroll();
  saveBankroll();
  state.message = roundSummary(totalPayout);

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
  if (state.phase === "playing") return;
  state.hands = [];
  state.dealer = [];
  state.betChips = [];
  state.activeHand = 0;
  state.revealDealer = false;
  state.phase = "betting";
  state.message = state.bankroll > 0
    ? "Place your bet to start a hand."
    : "You're out of chips. Start a new game to reset your bankroll.";
  render();
}

function newGame(resetBankroll = true) {
  if (state.tutorial.active && !tutorialCanUse("new-game")) return;
  stopTutorial();
  if (resetBankroll) {
    state.bankroll = 1000;
    saveBankroll();
  }
  state.bet = 0;
  state.betChips = [];
  state.deck = buildDeck();
  state.hands = [];
  state.activeHand = 0;
  state.dealer = [];
  state.phase = "betting";
  state.revealDealer = false;
  state.message = "Place your bet to start a hand.";
  render();
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
    const isActive = state.phase === "playing" && index === state.activeHand;
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
    if (state.hands.length === 1 && state.phase !== "betting") {
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
  hideTooltip();
  const hiddenDealer = state.dealer.length > 1 && !state.revealDealer;
  const visibleDealerTotal = hiddenDealer ? String(state.dealer[0].value) : handLabel(state.dealer);
  const hand = activeHand();
  const inBetting = state.phase === "betting";
  const inPlaying = state.phase === "playing";

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
    : state.phase !== "settled" || state.bankroll <= 0;
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
    hit: "Hit",
    stand: "Stand",
    split: "Split",
    next: "Next Hand",
    "new-game": "New Game",
  };
  const allowedLabel = actionLabels[state.tutorial.allowedAction] || "";

  els.tutorialOverlay.hidden = false;
  els.tutorialOverlay.innerHTML = `
    <span>${state.tutorial.intro ? "Tutorial Intro" : `Tutorial Hand ${Math.min(state.tutorial.handIndex + 1, tutorialHands.length)} of ${tutorialHands.length}`}</span>
    <p>${state.tutorial.instruction.replace(/\n/g, "<br>")}</p>
    ${allowedLabel ? `<strong>Next action: ${allowedLabel}</strong>` : ""}
  `;
}

function showTooltip(button) {
  const text = button.dataset.tooltip;
  if (!text || button.disabled) return;

  if (!els.tooltip) {
    els.tooltip = document.createElement("div");
    els.tooltip.className = "tooltip";
    document.body.append(els.tooltip);
  }

  els.tooltip.textContent = text;
  els.tooltip.classList.add("visible");

  const margin = 8;
  const buttonRect = button.getBoundingClientRect();
  const tooltipRect = els.tooltip.getBoundingClientRect();
  const idealLeft = buttonRect.left + buttonRect.width / 2 - tooltipRect.width / 2;
  const left = Math.min(
    window.innerWidth - tooltipRect.width - margin,
    Math.max(margin, idealLeft)
  );
  const top = Math.max(margin, buttonRect.top + window.scrollY - tooltipRect.height - 12);
  const arrowLeft = buttonRect.left + buttonRect.width / 2 - left;

  els.tooltip.style.left = `${left + window.scrollX}px`;
  els.tooltip.style.top = `${top}px`;
  els.tooltip.style.setProperty("--arrow-left", `${arrowLeft}px`);
}

function hideTooltip() {
  if (els.tooltip) {
    els.tooltip.classList.remove("visible");
  }
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

const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

document.querySelectorAll("[data-tooltip]").forEach((button) => {
  if (supportsHover) {
    button.addEventListener("mouseenter", () => showTooltip(button));
    button.addEventListener("mouseleave", hideTooltip);
  }
  button.addEventListener("focus", () => showTooltip(button));
  button.addEventListener("blur", hideTooltip);
});

window.addEventListener("resize", hideTooltip);
window.addEventListener("scroll", hideTooltip, { passive: true });

if (new URLSearchParams(window.location.search).get("tutorial") === "1") {
  startTutorial();
} else {
  newGame(false);
}
