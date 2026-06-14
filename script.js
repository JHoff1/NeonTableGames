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

const state = {
  bankroll: 1000,
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
  tooltip: null,
};

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ ...rank, suit: suit.symbol, suitName: suit.name, color: suit.color });
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
  if (state.deck.length < 12) {
    state.deck = buildDeck();
  }
  return state.deck.pop();
}

function handValue(cards) {
  let total = cards.reduce((sum, card) => sum + card.value, 0);
  let aces = cards.filter((card) => card.label === "A").length;

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
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

function saveHighBankroll() {
  try {
    localStorage.setItem(highBankrollKey, String(state.highBankroll));
  } catch {
    // Local storage can be unavailable in some browser privacy modes.
  }
}

function updateHighBankroll() {
  if (state.bankroll <= state.highBankroll) return;
  state.highBankroll = state.bankroll;
  saveHighBankroll();
}

function isSoftTotal(cards) {
  let total = cards.reduce((sum, card) => sum + card.value, 0);
  let aces = cards.filter((card) => card.label === "A").length;

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return aces > 0;
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
  if (state.phase !== "betting" || amount > state.bankroll) return;
  state.bankroll -= amount;
  state.bet += amount;
  state.betChips.push(amount);
  state.message = `${money(state.bet)} ready. Deal when you're set.`;
  render();
}

function clearBet() {
  if (state.phase !== "betting") return;
  state.bankroll += state.bet;
  state.bet = 0;
  state.betChips = [];
  state.message = "Place your bet to start a hand.";
  render();
}

function deal() {
  if (state.phase !== "betting" || state.bet <= 0) return;

  state.hands = [{
    cards: [drawCard(), drawCard()],
    bet: state.bet,
    status: "playing",
    result: "",
    wasSplit: false,
  }];
  state.bet = 0;
  state.activeHand = 0;
  state.dealer = [drawCard(), drawCard()];
  state.phase = "playing";
  state.revealDealer = false;

  if (isBlackjack(activeHand()) || handValue(state.dealer) === 21) {
    settleRound();
    return;
  }

  state.message = handPrompt();
  render();
}

function hit() {
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
  render();
}

function stand() {
  const hand = activeHand();
  if (state.phase !== "playing" || !hand) return;

  hand.status = "stood";
  hand.result = "Stood";
  advanceHand();
}

function doubleDown() {
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
  state.message = roundSummary(totalPayout);

  if (state.bankroll <= 0) {
    state.message = "You're out of chips. Start a new game to reset your bankroll.";
  }

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
  return `${handName}: ${handValue(hand.cards)}. Choose ${options}.`;
}

function resetRound() {
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

function newGame() {
  state.bankroll = 1000;
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
      <strong>${handValue(hand.cards)}</strong>
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
  const hiddenCount = chips.length - visibleChips.length;
  target.classList.toggle("has-chips", visibleChips.length > 0);

  visibleChips.forEach((amount, index) => {
    const chip = document.createElement("span");
    chip.className = "stack-chip";
    chip.dataset.chip = String(amount);
    chip.innerHTML = `<span class="chip-label"><span class="chip-dollar">$</span>${amount}</span>`;
    chip.style.setProperty("--stack-index", String(index));
    target.append(chip);
  });

  if (hiddenCount > 0) {
    const extra = document.createElement("span");
    extra.className = "stack-extra";
    extra.textContent = `+${hiddenCount}`;
    target.append(extra);
  }
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
  const hiddenDealer = state.dealer.length > 1 && !state.revealDealer;
  const visibleDealerTotal = hiddenDealer ? state.dealer[0].value : handValue(state.dealer);
  const hand = activeHand();
  const inBetting = state.phase === "betting";
  const inPlaying = state.phase === "playing";

  els.bankroll.textContent = money(state.bankroll);
  els.highBankroll.textContent = money(state.highBankroll);
  els.bet.textContent = money(tableBet());
  els.shoe.textContent = String(state.deck.length);
  els.dealerTotal.textContent = String(visibleDealerTotal || 0);
  els.playerTotal.textContent = String(hand ? handValue(hand.cards) : 0);
  els.felt.classList.toggle("has-split-hands", state.hands.length > 1);
  els.playerZone.classList.toggle("has-split-hands", state.hands.length > 1);
  els.playerHeading.textContent = "Player";
  els.message.textContent = state.message;

  renderHand(els.dealerHand, state.dealer, hiddenDealer);
  renderPlayerHands();
  renderBetStack();

  els.chips.forEach((button) => {
    const amount = Number(button.dataset.chip);
    button.disabled = !inBetting || amount > state.bankroll;
  });
  els.clearBet.disabled = !inBetting || state.bet === 0;
  els.deal.disabled = !inBetting || state.bet === 0;
  els.hit.disabled = !inPlaying;
  els.stand.disabled = !inPlaying;
  els.double.disabled = !inPlaying || !canDoubleHand(hand);
  els.split.disabled = !inPlaying || !canSplitHand(hand);
  els.nextHand.disabled = state.phase !== "settled" || state.bankroll <= 0;
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
els.newGame.addEventListener("click", newGame);
els.nextHand.addEventListener("click", resetRound);

document.querySelectorAll("[data-tooltip]").forEach((button) => {
  button.addEventListener("mouseenter", () => showTooltip(button));
  button.addEventListener("focus", () => showTooltip(button));
  button.addEventListener("mouseleave", hideTooltip);
  button.addEventListener("blur", hideTooltip);
});

window.addEventListener("resize", hideTooltip);
window.addEventListener("scroll", hideTooltip, { passive: true });

newGame();
