import type {
  BlackjackHand,
  BlackjackSession,
  BlackjackSettings,
  BlackjackState,
  Card,
  GamePhase,
  SummaryRow,
  TutorialAction,
} from "./types";

const startingBankroll = 1000;
const counters = ["blackjacks", "losses", "pushes", "rounds", "splits", "wins"];
const bankrollKey = "neontablegamesBankroll";
const highBankrollKey = "neontablegamesHighBankroll";
const legacyHighBankrollKey = "blackjackHighBankroll";

interface Snapshot {
  activeHand: number;
  bankroll: number;
  bet: number;
  betChips: number[];
  dealer: Card[];
  deck: Card[];
  hands: BlackjackHand[];
  phase: GamePhase;
}

interface StoredBlackjack {
  bankroll: number;
  highBankroll: number;
  lastWager: number | null;
  session: BlackjackSession;
  snapshot: Snapshot | null;
}

function sanitizeWager(value: unknown): number | null {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export class BlackjackController {
  private readonly core = window.NeonTableCore;
  private readonly engine = window.NeonBlackjackEngine;
  private readonly sessions = window.NeonSessionFramework;
  private readonly settingsStore = window.NeonTableSettings.createSettings();
  private readonly feedback = window.NeonTableSettings.createFeedback(this.settingsStore);
  private readonly buildShoe = this.core.createShoeBuilder(1, "blackjack");
  private readonly tutorialHands = window.NeonBlackjackTutorials;
  private readonly listeners = new Set<() => void>();
  private readonly storage;
  private state: BlackjackState;
  private snapshot: BlackjackState;
  private browserFeaturesAttached = false;

  constructor() {
    this.storage = this.core.createGameStorage<StoredBlackjack>("neontablegames.blackjack", {
      defaults: {
        bankroll: startingBankroll,
        highBankroll: startingBankroll,
        lastWager: null,
        session: this.emptySession(),
        snapshot: null,
      },
      migrate: (storage) => {
        const bankroll = this.core.readStoredNumber(bankrollKey, startingBankroll, { storage });
        const legacyHigh = this.core.readStoredNumber(legacyHighBankrollKey, startingBankroll, {
          storage,
        });
        return {
          bankroll,
          highBankroll: Math.max(
            startingBankroll,
            this.core.readStoredNumber(highBankrollKey, legacyHigh, { storage }),
          ),
          lastWager: null,
          session: this.emptySession(bankroll),
          snapshot: null,
        };
      },
      sanitize: (value) => this.sanitizeStored(value),
    });

    const saved = this.storage.read();
    const restored = saved.snapshot;
    this.state = {
      activeHand: restored?.activeHand ?? 0,
      bankroll: restored?.bankroll ?? saved.bankroll,
      bet: restored?.bet ?? 0,
      betChips: restored?.betChips ?? [],
      dealer: restored?.dealer ?? [],
      deck: restored?.deck ?? [],
      hands: restored?.hands ?? [],
      highBankroll: saved.highBankroll,
      lastWager: saved.lastWager,
      message: restored
        ? restored.phase === "playing"
          ? "Round restored. Continue your active hand."
          : "Wager restored. Deal when ready."
        : saved.bankroll > 0
          ? "Place your bet to start a hand."
          : "You're out of chips. Start a new game to reset your bankroll.",
      phase: restored?.phase ?? "betting",
      revealDealer: false,
      session: saved.session,
      settings: this.settingsStore.get(),
      tutorial: {
        active: false,
        allowedAction: null,
        awaitingNextHand: false,
        deck: [],
        handIndex: 0,
        instruction: "",
        intro: false,
      },
    };

    if (new URLSearchParams(window.location.search).get("tutorial") === "1") {
      this.initializeTutorial();
    } else if (restored) {
      if (this.state.deck.length < 12) this.state.deck = this.buildShoe();
    } else {
      this.resetGameState(false);
    }
    this.snapshot = this.cloneState();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  attachBrowserFeatures() {
    if (this.browserFeaturesAttached) return;
    this.browserFeaturesAttached = true;
    this.core.setupTooltips();
    this.core.setupSeedDebugIndicator();
    this.core.setupCrossTabSync({
      isActive: () =>
        this.state.phase === "playing" || (this.state.phase === "betting" && this.state.bet > 0),
      key: this.storage.key,
    });
  }

  money(value: number) {
    return this.core.money(value);
  }

  handLabel(cards: Card[]) {
    return this.engine.handLabel(cards);
  }

  activeHand() {
    return this.state.hands[this.state.activeHand];
  }

  tableBet() {
    return this.state.hands.reduce((sum, hand) => sum + hand.bet, this.state.bet);
  }

  currentFunds() {
    return (
      this.state.bankroll +
      (["betting", "playing"].includes(this.state.phase) ? this.tableBet() : 0)
    );
  }

  canUse(action: TutorialAction) {
    return !this.state.tutorial.active || this.state.tutorial.allowedAction === action;
  }

  canDouble() {
    return this.engine.canDoubleHand(this.activeHand(), this.state.bankroll);
  }

  canSplit() {
    return this.engine.canSplitHand(
      this.activeHand(),
      this.state.hands.length,
      this.state.bankroll,
    );
  }

  addBet(amount: number) {
    if (!this.canUse("chip") || this.state.phase !== "betting" || amount > this.state.bankroll)
      return;
    this.state.bankroll -= amount;
    this.state.bet += amount;
    this.state.betChips.push(amount);
    this.state.message = `${this.money(this.state.bet)} ready. Deal when you're set.`;
    this.commit();
  }

  clearBet() {
    if (!this.canUse("clear") || this.state.phase !== "betting") return;
    this.state.bankroll += this.state.bet;
    this.state.bet = 0;
    this.state.betChips = [];
    this.state.message = "Place your bet to start a hand.";
    this.commit();
  }

  primaryAction() {
    if (this.state.phase === "betting") this.deal();
    else if (this.state.phase === "settled") this.nextRound();
  }

  hit() {
    if (!this.canUse("hit") || this.state.phase !== "playing") return;
    const hand = this.activeHand();
    if (!hand) return;
    hand.cards.push(this.drawCard());
    this.feedback.cue("deal");
    if (this.engine.handValue(hand.cards) > 21) {
      hand.status = "bust";
      hand.result = "Bust";
      this.advanceHand();
      return;
    }
    this.state.message = this.handPrompt();
    this.tutorialAfterHit();
    this.commit();
  }

  stand() {
    if (!this.canUse("stand") || this.state.phase !== "playing") return;
    const hand = this.activeHand();
    if (!hand) return;
    hand.status = "stood";
    hand.result = "Stood";
    this.tutorialBeforeAdvanceFromStand();
    this.advanceHand();
  }

  doubleDown() {
    const hand = this.activeHand();
    if (!this.canUse("double") || this.state.phase !== "playing" || !this.canDouble() || !hand)
      return;
    this.state.bankroll -= hand.bet;
    this.state.betChips.push(hand.bet);
    hand.bet *= 2;
    hand.cards.push(this.drawCard());
    hand.status = this.engine.handValue(hand.cards) > 21 ? "bust" : "stood";
    hand.result = hand.status === "bust" ? "Bust" : "Stood";
    this.advanceHand();
  }

  split() {
    const hand = this.activeHand();
    if (!this.canUse("split") || this.state.phase !== "playing" || !this.canSplit() || !hand)
      return;
    this.state.bankroll -= hand.bet;
    if (!this.state.tutorial.active) {
      this.state.session = this.sessions.record(this.state.session, {
        bankroll: this.currentFunds(),
        increments: { splits: 1 },
      });
    }
    const [first, second] = hand.cards;
    this.state.hands = [
      {
        bet: hand.bet,
        cards: [first, this.drawCard()],
        result: "",
        status: "playing",
        wasSplit: true,
      },
      {
        bet: hand.bet,
        cards: [second, this.drawCard()],
        result: "",
        status: "waiting",
        wasSplit: true,
      },
    ];
    this.state.activeHand = 0;
    this.state.message = "Split into two hands. Play Hand 1 first.";
    this.tutorialAfterSplit();
    this.commit();
  }

  newGame() {
    if (this.state.tutorial.active && !this.canUse("new-game")) return;
    this.stopTutorial();
    this.state.bankroll = startingBankroll;
    this.state.session = this.emptySession();
    this.state.lastWager = null;
    this.resetGameState(true);
    this.commit();
  }

  resetSession() {
    if (
      this.state.tutorial.active ||
      this.state.phase === "playing" ||
      (this.state.phase === "betting" && this.state.bet > 0)
    )
      return;
    this.state.session = this.emptySession(this.currentFunds());
    this.state.message = "Session statistics reset.";
    this.commit();
  }

  setSetting(name: keyof BlackjackSettings, value: boolean) {
    this.state.settings = this.settingsStore.set({ [name]: value });
    if (name === "sound" && value) this.feedback.unlockAudio();
    this.commit(false);
  }

  restartTutorial() {
    this.initializeTutorial();
    this.commit(false);
  }

  summaryRows(): SummaryRow[] {
    const { session } = this.state;
    const profit = this.sessions.profit(session, this.currentFunds(), {
      disabled: this.state.tutorial.active,
    });
    const decided = session.wins + session.losses;
    const winRate = decided ? Math.round((session.wins / decided) * 100) : 0;
    return [
      { label: "Rounds played", value: String(session.rounds) },
      {
        className: profit > 0 ? "positive" : profit < 0 ? "negative" : "",
        label: "Session result",
        value: this.money(profit),
      },
      { label: "Winning hands", value: String(session.wins) },
      { label: "Losing hands", value: String(session.losses) },
      { label: "Win rate", value: `${winRate}%` },
      { label: "Pushes", value: String(session.pushes) },
      { label: "Blackjacks", value: String(session.blackjacks) },
      { label: "Splits", value: String(session.splits) },
      { label: "Peak bankroll", value: this.money(session.largestBankroll) },
    ];
  }

  private emptySession(bankroll = startingBankroll) {
    return this.sessions.create({ bankroll, counters });
  }

  private sanitizeCard(card: Partial<Card> | undefined) {
    try {
      return this.core.createCard(card?.label ?? "", card?.suitName ?? "", "blackjack");
    } catch {
      return null;
    }
  }

  private sanitizeSnapshot(snapshot: Snapshot | null | undefined): Snapshot | null {
    if (!snapshot || typeof snapshot !== "object") return null;
    const bankroll = Number(snapshot.bankroll);
    const bet = Number(snapshot.bet);
    const dealer = Array.isArray(snapshot.dealer)
      ? snapshot.dealer
          .map((card) => this.sanitizeCard(card))
          .filter((card): card is Card => !!card)
      : [];
    const deck = Array.isArray(snapshot.deck)
      ? snapshot.deck.map((card) => this.sanitizeCard(card)).filter((card): card is Card => !!card)
      : [];
    const hands = Array.isArray(snapshot.hands)
      ? snapshot.hands
          .map((hand) => {
            const cards = Array.isArray(hand?.cards)
              ? hand.cards
                  .map((card) => this.sanitizeCard(card))
                  .filter((card): card is Card => !!card)
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
            } as BlackjackHand;
          })
          .filter((hand): hand is BlackjackHand => !!hand)
      : [];
    const phase = snapshot.phase === "playing" ? "playing" : "betting";
    const validPlaying = phase === "playing" && hands.length > 0 && dealer.length >= 2;
    const validBetting = phase === "betting" && Number.isFinite(bet) && bet > 0;
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

  private sanitizeStored(value: StoredBlackjack): StoredBlackjack {
    const bankroll = Number(value.bankroll);
    const safeBankroll = Number.isFinite(bankroll) && bankroll >= 0 ? bankroll : startingBankroll;
    const highBankroll = Number(value.highBankroll);
    return {
      bankroll: safeBankroll,
      highBankroll:
        Number.isFinite(highBankroll) && highBankroll >= startingBankroll
          ? highBankroll
          : startingBankroll,
      lastWager: sanitizeWager(value.lastWager),
      session: this.sessions.sanitize(value.session, { bankroll: safeBankroll, counters }),
      snapshot: this.sanitizeSnapshot(value.snapshot),
    };
  }

  private resetGameState(resetDeck: boolean) {
    this.state.bet = 0;
    this.state.betChips = [];
    if (resetDeck || this.state.deck.length < 12) this.state.deck = this.buildShoe();
    this.state.hands = [];
    this.state.activeHand = 0;
    this.state.dealer = [];
    this.state.phase = "betting";
    this.state.revealDealer = false;
    this.state.message =
      this.state.bankroll > 0
        ? "Place your bet to start a hand."
        : "You're out of chips. Start a new game to reset your bankroll.";
  }

  private drawCard() {
    if (this.state.tutorial.active && this.state.tutorial.deck.length > 0) {
      return this.state.tutorial.deck.shift() as Card;
    }
    if (this.state.deck.length < 12) this.state.deck = this.buildShoe();
    return this.state.deck.pop() as Card;
  }

  private deal() {
    if (!this.canUse("deal") || this.state.phase !== "betting" || this.state.bet <= 0) return;
    const openingWager = this.state.bet;
    const playerFirst = this.drawCard();
    const dealerUpcard = this.drawCard();
    const playerSecond = this.drawCard();
    const dealerHoleCard = this.drawCard();
    this.state.hands = [
      {
        bet: this.state.bet,
        cards: [playerFirst, playerSecond],
        result: "",
        status: "playing",
        wasSplit: false,
      },
    ];
    this.state.bet = 0;
    this.state.activeHand = 0;
    this.state.dealer = [dealerUpcard, dealerHoleCard];
    this.state.phase = "playing";
    this.state.revealDealer = false;
    if (!this.state.tutorial.active) this.state.lastWager = openingWager;
    this.feedback.cue("deal");
    if (
      this.engine.isNaturalBlackjack(this.activeHand()) ||
      this.engine.handValue(this.state.dealer) === 21
    ) {
      this.settleRound();
      return;
    }
    this.state.message = this.handPrompt();
    this.tutorialAfterDeal();
    this.commit();
  }

  private advanceHand() {
    const nextIndex = this.state.hands.findIndex(
      (hand, index) => index > this.state.activeHand && hand.status === "waiting",
    );
    if (nextIndex >= 0) {
      this.state.activeHand = nextIndex;
      this.state.hands[nextIndex].status = "playing";
      this.state.message = this.handPrompt();
      this.commit();
      return;
    }
    this.settleRound();
  }

  private settleRound() {
    this.state.phase = "settled";
    this.state.revealDealer = true;
    const natural = this.state.hands.some((hand) => this.engine.isNaturalBlackjack(hand));
    if (this.engine.dealerShouldPlay(this.state.hands) && !natural) {
      while (this.engine.dealerShouldHit(this.state.dealer))
        this.state.dealer.push(this.drawCard());
    }
    const settlement = this.engine.settleHands(this.state.hands, this.state.dealer);
    this.state.hands.forEach((hand, index) => {
      hand.result = settlement.settlements[index].result;
      hand.status = settlement.settlements[index].status;
    });
    this.state.bankroll += settlement.totalPayout;
    if (!this.state.tutorial.active) {
      const results = settlement.settlements.map(({ result }) => result);
      this.state.session = this.sessions.record(this.state.session, {
        bankroll: this.state.bankroll,
        increments: {
          blackjacks: results.filter((result) => result === "Blackjack").length,
          losses: results.filter((result) => ["Lose", "Bust"].includes(result)).length,
          pushes: results.filter((result) => result === "Push").length,
          rounds: 1,
          wins: results.filter((result) => ["Win", "Blackjack"].includes(result)).length,
        },
      });
      if (this.state.bankroll > this.state.highBankroll)
        this.state.highBankroll = this.state.bankroll;
    }
    const results = this.state.hands
      .map((hand, index) => `Hand ${index + 1}: ${hand.result}`)
      .join(" | ");
    this.state.message =
      settlement.totalPayout > 0
        ? `${results}. Paid ${this.money(settlement.totalPayout)}.`
        : results;
    const wagered = this.state.hands.reduce((total, hand) => total + hand.bet, 0);
    const won = settlement.totalPayout > wagered;
    this.feedback.cue(won ? "win" : "loss");
    this.feedback.vibrate(won ? [20, 30, 20] : 20);
    if (this.state.bankroll <= 0) {
      this.state.message = "You're out of chips. Start a new game to reset your bankroll.";
    }
    this.tutorialAfterSettle();
    this.commit();
  }

  private nextRound() {
    if (this.state.tutorial.active) {
      if (this.canUse("next")) this.tutorialNextHand();
      return;
    }
    this.state.hands = [];
    this.state.dealer = [];
    this.state.betChips = [];
    this.state.activeHand = 0;
    this.state.revealDealer = false;
    this.state.phase = "betting";
    if (this.state.lastWager && this.state.lastWager <= this.state.bankroll) {
      this.state.bankroll -= this.state.lastWager;
      this.state.bet = this.state.lastWager;
      this.state.betChips = this.chipsFor(this.state.lastWager);
      this.state.message = `${this.money(this.state.bet)} ready. Deal when you're set.`;
    } else {
      this.state.bet = 0;
      this.state.message =
        this.state.bankroll > 0
          ? "Place your bet to start a hand."
          : "You're out of chips. Start a new game to reset your bankroll.";
    }
    this.commit();
  }

  private handPrompt() {
    const hand = this.activeHand();
    if (!hand) return "Place your bet to start a hand.";
    const name = this.state.hands.length > 1 ? `Hand ${this.state.activeHand + 1}` : "Your hand";
    const options = this.canSplit() ? "hit, stand, double, or split" : "hit, stand, or double";
    return `${name}: ${this.handLabel(hand.cards)}. Choose ${options}.`;
  }

  private chipsFor(amount: number) {
    const chips: number[] = [];
    let remaining = amount;
    for (const chip of [500, 100, 25, 5]) {
      while (remaining >= chip) {
        chips.push(chip);
        remaining -= chip;
      }
    }
    return chips.length ? chips : [amount];
  }

  private initializeTutorial() {
    this.state.tutorial.active = true;
    this.state.tutorial.handIndex = 0;
    this.state.tutorial.awaitingNextHand = false;
    this.state.tutorial.intro = true;
    this.prepareTutorialHand();
    this.state.message = "Click Deal to start the tutorial.";
    this.setTutorialGate(
      "Welcome to Blackjack! Your goal is to get closer to 21 than the dealer without going over (busting). Click Deal to begin the first guided hand.",
      "deal",
    );
  }

  private prepareTutorialHand() {
    const scenario = this.tutorialHands[this.state.tutorial.handIndex];
    this.state.bankroll = 1000;
    this.state.bet = 25;
    this.state.betChips = [25];
    this.state.hands = [];
    this.state.dealer = [];
    this.state.activeHand = 0;
    this.state.phase = "betting";
    this.state.revealDealer = false;
    this.state.tutorial.deck = scenario.deck.map((card) => ({ ...card }));
    this.state.tutorial.awaitingNextHand = false;
  }

  private setupTutorialHand() {
    this.state.tutorial.intro = false;
    this.prepareTutorialHand();
    this.state.message = "Tutorial hand loading.";
    this.setTutorialGate("", "deal");
    this.deal();
  }

  private tutorialAfterDeal() {
    if (!this.state.tutorial.active) return;
    const scenario = this.tutorialHands[this.state.tutorial.handIndex];
    this.state.tutorial.intro = false;
    this.setTutorialGate(scenario.instruction, scenario.allowedAction);
    this.state.message = this.handPrompt();
  }

  private tutorialAfterHit() {
    if (!this.state.tutorial.active) return;
    const scenario = this.tutorialHands[this.state.tutorial.handIndex];
    if (!scenario.afterHitInstruction) return;
    this.setTutorialGate(scenario.afterHitInstruction, "stand");
    this.state.message = `Player: ${this.handLabel(this.activeHand().cards)}. Click Stand to finish the hand.`;
  }

  private tutorialAfterSplit() {
    if (!this.state.tutorial.active) return;
    const instruction = this.tutorialHands[this.state.tutorial.handIndex].afterSplitInstruction;
    if (instruction) this.setTutorialGate(instruction, "stand");
  }

  private tutorialBeforeAdvanceFromStand() {
    if (!this.state.tutorial.active) return;
    const instruction = this.tutorialHands[this.state.tutorial.handIndex].secondHandInstruction;
    if (!instruction) return;
    const hasWaiting = this.state.hands.some(
      (hand, index) => index > this.state.activeHand && hand.status === "waiting",
    );
    if (hasWaiting) this.setTutorialGate(instruction, "stand");
  }

  private tutorialAfterSettle() {
    if (!this.state.tutorial.active) return;
    const scenario = this.tutorialHands[this.state.tutorial.handIndex];
    const last = this.state.tutorial.handIndex >= this.tutorialHands.length - 1;
    const next = last
      ? "Tutorial complete. You saw standing against weak dealer cards, soft hand flexibility, splitting 8s, doubling 11, hitting hard 16, and keeping 20.\nClick New Game when you're ready for normal play."
      : "Click Next Hand to continue the tutorial.";
    this.setTutorialGate(
      `${scenario.resultInstruction || "Hand complete."}\n${next}`,
      last ? "new-game" : "next",
    );
    this.state.tutorial.awaitingNextHand = !last;
  }

  private tutorialNextHand() {
    if (!this.state.tutorial.awaitingNextHand) return;
    this.state.tutorial.handIndex += 1;
    this.setupTutorialHand();
  }

  private stopTutorial() {
    this.state.tutorial = {
      active: false,
      allowedAction: null,
      awaitingNextHand: false,
      deck: [],
      handIndex: 0,
      instruction: "",
      intro: false,
    };
    if (new URLSearchParams(window.location.search).get("tutorial") === "1") {
      window.history.replaceState(null, "", this.core.removeQueryParam("tutorial"));
    }
  }

  private setTutorialGate(instruction: string, allowedAction: TutorialAction) {
    this.state.tutorial.instruction = instruction;
    this.state.tutorial.allowedAction = allowedAction;
  }

  private save() {
    if (this.state.tutorial.active) return;
    const resumable =
      (this.state.phase === "betting" && this.state.bet > 0) || this.state.phase === "playing";
    this.storage.write({
      bankroll: this.state.bankroll,
      highBankroll: this.state.highBankroll,
      lastWager: this.state.lastWager,
      session: this.state.session,
      snapshot: resumable
        ? {
            activeHand: this.state.activeHand,
            bankroll: this.state.bankroll,
            bet: this.state.bet,
            betChips: this.state.betChips,
            dealer: this.state.dealer,
            deck: this.state.deck,
            hands: this.state.hands,
            phase: this.state.phase,
          }
        : null,
    });
  }

  private cloneState(): BlackjackState {
    return {
      ...this.state,
      betChips: [...this.state.betChips],
      dealer: [...this.state.dealer],
      deck: [...this.state.deck],
      hands: this.state.hands.map((hand) => ({ ...hand, cards: [...hand.cards] })),
      session: { ...this.state.session },
      settings: { ...this.state.settings },
      tutorial: { ...this.state.tutorial, deck: [...this.state.tutorial.deck] },
    };
  }

  private commit(save = true) {
    if (save) this.save();
    this.snapshot = this.cloneState();
    this.listeners.forEach((listener) => listener());
  }
}
