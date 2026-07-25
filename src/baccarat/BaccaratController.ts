import type {
  BaccaratOutcome,
  BaccaratRound,
  BaccaratSession,
  BaccaratState,
  BaccaratWager,
  Card,
  SummaryRow,
} from "./types";
import type { SharedSettings } from "../shared/GameSettings";

const startingBankroll = 1000;
const historyLimit = 72;

interface StoredBaccarat {
  bankroll: number;
  highBankroll: number;
  history: BaccaratOutcome[];
  lastBet: BaccaratWager | null;
  session: BaccaratSession;
  snapshot: {
    bankerCards: Card[];
    bet: number;
    betChips: number[];
    betType: BaccaratOutcome;
    playerCards: Card[];
    revealedPlayer: boolean[];
  } | null;
}

type TutorialScenario = {
  betType: BaccaratOutcome;
  cards: Array<[string, string]>;
  intro: string;
  result: string;
};

export class BaccaratController {
  private readonly core = window.NeonTableCore;
  private readonly engine = window.NeonBaccaratEngine;
  private readonly baccaratSessions = window.NeonBaccaratSession;
  private readonly settingsStore = window.NeonTableSettings.createSettings();
  private readonly feedback = window.NeonTableSettings.createFeedback(this.settingsStore);
  private readonly buildShoe = this.core.createShoeBuilder(8, "baccarat");
  private readonly listeners = new Set<() => void>();
  private readonly storage: {
    key: string;
    read(): StoredBaccarat;
    write(value: StoredBaccarat): boolean;
  };
  private readonly tutorialRounds: Array<Omit<TutorialScenario, "cards"> & { cards: Card[] }>;
  private state: BaccaratState;
  private snapshot: BaccaratState;
  private cutCard = 68;
  private sequence = 0;
  private attached = false;

  constructor() {
    this.tutorialRounds = (window.NeonBaccaratTutorials as TutorialScenario[]).map((scenario) => ({
      ...scenario,
      cards: scenario.cards.map(([label, suit]) => this.core.createCard(label, suit, "baccarat")),
    }));
    this.storage = this.core.createGameStorage("neontablegames.baccarat", {
      defaults: {
        bankroll: startingBankroll,
        highBankroll: startingBankroll,
        history: [],
        lastBet: null,
        session: this.emptySession(),
        snapshot: null,
      },
      migrate: (storage: Storage) => {
        const bankroll = this.core.readStoredNumber(
          "neontablegamesBaccaratBankroll",
          startingBankroll,
          { storage },
        );
        return {
          bankroll,
          highBankroll: this.core.readStoredNumber(
            "neontablegamesBaccaratHighBankroll",
            startingBankroll,
            { storage },
          ),
          history: [],
          lastBet: null,
          session: this.emptySession(bankroll),
          snapshot: null,
        };
      },
      sanitize: (value: StoredBaccarat) => this.sanitizeStored(value),
    });
    const saved = this.storage.read();
    const restored = saved.snapshot;
    const hasRound =
      restored && restored.playerCards.length >= 2 && restored.bankerCards.length >= 2;
    this.state = {
      bankerCards: restored?.bankerCards ?? [],
      bankroll: saved.bankroll,
      bet: restored?.bet ?? 0,
      betChips: restored?.betChips ?? [],
      betType: restored?.betType ?? "player",
      dealtCards: hasRound
        ? {
            banker: restored.bankerCards.map(() => true),
            player: restored.playerCards.map(() => true),
          }
        : { banker: [], player: [] },
      highBankroll: saved.highBankroll,
      history: saved.history,
      lastBet: saved.lastBet,
      message: hasRound
        ? "Round restored. Flip the remaining Player cards."
        : restored
          ? `${this.money(restored.bet)} on ${this.capitalize(restored.betType)} restored. Deal when ready.`
          : saved.bankroll > 0
            ? "Choose Player, Banker, or Tie, then place a bet."
            : "You're out of chips. Start a new game to reset your bankroll.",
      pendingRound: hasRound
        ? {
            bankerCards: restored.bankerCards,
            bankerTotal: this.engine.handTotal(restored.bankerCards),
            outcome: this.engine.outcome(restored.playerCards, restored.bankerCards),
            playerCards: restored.playerCards,
            playerTotal: this.engine.handTotal(restored.playerCards),
          }
        : null,
      phase: hasRound ? "revealing" : "betting",
      playerCards: restored?.playerCards ?? [],
      result: null,
      revealedPlayer: hasRound
        ? restored.playerCards.map((_, index) => restored.revealedPlayer[index] === true)
        : [],
      session: saved.session,
      settings: this.settingsStore.get(),
      shoe: this.buildShoe(),
      shoeNumber: 1,
      tutorial: { active: false, index: 0, instruction: "", shoe: [] },
    };
    if (new URLSearchParams(window.location.search).get("tutorial") === "1") {
      this.startTutorial(false);
    }
    this.snapshot = this.clone();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  attachBrowserFeatures() {
    if (this.attached) return;
    this.attached = true;
    this.core.setupTooltips();
    this.core.setupSeedDebugIndicator();
    this.core.setupCrossTabSync({
      isActive: () => ["dealing", "revealing"].includes(this.state.phase) || this.state.bet > 0,
      key: this.storage.key,
    });
  }

  money(value: number) {
    return this.core.money(value);
  }

  handTotal(cards: Card[]) {
    return cards.length ? this.engine.handTotal(cards) : 0;
  }

  visiblePlayerCards() {
    return this.state.playerCards.filter(
      (_, index) =>
        this.state.dealtCards.player[index] && this.state.revealedPlayer[index] !== false,
    );
  }

  visibleBankerCards() {
    return this.state.bankerCards.filter((_, index) => this.state.dealtCards.banker[index]);
  }

  currentFunds() {
    return (
      this.state.bankroll +
      (["betting", "dealing", "revealing"].includes(this.state.phase) ? this.state.bet : 0)
    );
  }

  selectBet(type: BaccaratOutcome) {
    if (this.state.phase !== "betting" || this.state.tutorial.active) return;
    this.state.betType = type;
    this.state.message =
      this.state.bet > 0
        ? `${this.money(this.state.bet)} on ${this.capitalize(type)}. Deal when ready.`
        : `${this.capitalize(type)} selected. Place a bet.`;
    this.commit();
  }

  addBet(amount: number) {
    if (
      this.state.phase !== "betting" ||
      this.state.tutorial.active ||
      amount > this.state.bankroll
    )
      return;
    this.state.bankroll -= amount;
    this.state.bet += amount;
    this.state.betChips.push(amount);
    this.state.message = `${this.money(this.state.bet)} on ${this.capitalize(this.state.betType)}. Deal when ready.`;
    this.commit();
  }

  clearBet() {
    if (this.state.phase !== "betting" || this.state.tutorial.active) return;
    this.state.bankroll += this.state.bet;
    this.state.bet = 0;
    this.state.betChips = [];
    this.state.message = `${this.capitalize(this.state.betType)} selected. Place a bet.`;
    this.commit();
  }

  primaryAction() {
    if (this.state.phase === "betting") void this.deal();
    if (this.state.phase === "settled") this.nextRound();
  }

  async deal() {
    if (this.state.phase !== "betting" || this.state.bet <= 0) return;
    if (!this.state.tutorial.active && this.state.shoe.length <= this.cutCard) this.refreshShoe();
    const round = this.engine.playRound(() => this.drawCard()) as BaccaratRound;
    const sequence = ++this.sequence;
    this.state.playerCards = round.playerCards;
    this.state.bankerCards = round.bankerCards;
    this.state.pendingRound = round;
    this.state.dealtCards = {
      banker: round.bankerCards.map(() => false),
      player: round.playerCards.map(() => false),
    };
    this.state.revealedPlayer = round.playerCards.map(() => false);
    this.state.phase = "dealing";
    this.state.result = null;
    this.state.message = "Dealing cards...";
    if (this.state.tutorial.active) {
      this.state.tutorial.instruction = `${this.currentTutorial().intro}\nWatch the cards deal in table order.`;
    }
    this.commit();
    const order: Array<{ side: "player" | "banker"; index: number }> = [
      { side: "player", index: 0 },
      { side: "banker", index: 0 },
      { side: "player", index: 1 },
      { side: "banker", index: 1 },
    ];
    if (round.playerCards.length === 3) order.push({ side: "player", index: 2 });
    if (round.bankerCards.length === 3) order.push({ side: "banker", index: 2 });
    for (const step of order) {
      await this.wait();
      if (sequence !== this.sequence) return;
      this.state.dealtCards[step.side][step.index] = true;
      this.state.message = `Dealing ${this.capitalize(step.side)} card ${step.index + 1}...`;
      this.feedback.cue("deal");
      this.commit();
    }
    this.state.phase = "revealing";
    this.state.message = `Flip ${round.playerCards.length} Player cards.`;
    if (this.state.tutorial.active) {
      this.state.tutorial.instruction = `${this.currentTutorial().intro}\nThe Banker hand is visible. Flip each Player card to reveal the result.`;
    }
    this.commit();
    if (this.state.settings.autoRevealPlayer) await this.autoReveal();
  }

  revealPlayer(index: number) {
    if (this.state.phase !== "revealing" || this.state.revealedPlayer[index]) return;
    this.state.revealedPlayer[index] = true;
    const remaining = this.state.revealedPlayer.filter((value) => !value).length;
    if (!remaining) {
      this.settle();
      return;
    }
    this.state.message = `Flip ${remaining} more Player ${remaining === 1 ? "card" : "cards"}.`;
    this.feedback.cue("deal");
    this.commit();
  }

  newGame() {
    if (this.state.tutorial.active && this.state.phase !== "settled") return;
    this.stopTutorial();
    this.sequence += 1;
    this.state = {
      ...this.state,
      bankerCards: [],
      bankroll: startingBankroll,
      bet: 0,
      betChips: [],
      betType: "player",
      dealtCards: { banker: [], player: [] },
      history: [],
      lastBet: null,
      message: "Choose Player, Banker, or Tie, then place a bet.",
      pendingRound: null,
      phase: "betting",
      playerCards: [],
      result: null,
      revealedPlayer: [],
      session: this.emptySession(),
      shoe: this.buildShoe(),
      tutorial: { active: false, index: 0, instruction: "", shoe: [] },
    };
    this.commit();
  }

  restartTutorial() {
    this.startTutorial();
  }

  resetSession() {
    if (this.sessionActionsDisabled()) return;
    this.state.session = this.emptySession(this.currentFunds());
    this.state.history = [];
    this.state.message = "Session statistics and roads reset.";
    this.commit();
  }

  sessionActionsDisabled() {
    return (
      this.state.tutorial.active ||
      ["dealing", "revealing"].includes(this.state.phase) ||
      (this.state.phase === "betting" && this.state.bet > 0)
    );
  }

  setSetting(name: keyof SharedSettings, value: boolean) {
    this.state.settings = this.settingsStore.set({ [name]: value });
    if (name === "sound" && value) this.feedback.unlockAudio();
    this.commit(false);
  }

  summaryRows(): SummaryRow[] {
    const summary = this.sessionSummary();
    const percent = (value: number) => `${Math.round(value * 100)}%`;
    return [
      { label: "Rounds played", value: String(summary.rounds) },
      {
        className: summary.profit > 0 ? "positive" : summary.profit < 0 ? "negative" : "",
        label: "Session result",
        value: this.money(summary.profit),
      },
      { label: "Player wins", value: `${summary.playerWins} (${percent(summary.playerRate)})` },
      { label: "Banker wins", value: `${summary.bankerWins} (${percent(summary.bankerRate)})` },
      { label: "Ties", value: `${summary.ties} (${percent(summary.tieRate)})` },
      {
        label: "Current streak",
        value: summary.streakCount
          ? `${this.capitalize(summary.streakResult)} x${summary.streakCount}`
          : "-",
      },
      { label: "Peak bankroll", value: this.money(summary.largestBankroll) },
    ];
  }

  sessionSummary() {
    return this.baccaratSessions.summary(this.state.session, this.currentFunds());
  }

  road() {
    return this.baccaratSessions.createBigRoad(this.state.history);
  }

  shoeStatus() {
    const remaining = this.state.shoe.length;
    if (remaining <= this.cutCard) return `Shoe ${this.state.shoeNumber} - shuffle next round`;
    if (remaining <= this.cutCard + 90)
      return `Shoe ${this.state.shoeNumber} - cut card approaching`;
    if (remaining >= 400) return `8 decks - fresh shoe ${this.state.shoeNumber}`;
    return `Shoe ${this.state.shoeNumber} - in play`;
  }

  tutorialNextAction() {
    if (this.state.phase === "settled") {
      return this.state.tutorial.index === this.tutorialRounds.length - 1
        ? "New Game"
        : "Next Round";
    }
    return this.state.phase === "revealing" ? "Reveal Player cards" : "Deal";
  }

  tutorialTotal() {
    return this.tutorialRounds.length;
  }

  private startTutorial(commit = true) {
    this.sequence += 1;
    this.state.tutorial = { active: true, index: 0, instruction: "", shoe: [] };
    this.state.history = [];
    this.prepareTutorialRound();
    if (commit) this.commit(false);
  }

  private prepareTutorialRound() {
    const scenario = this.currentTutorial();
    this.state.bankroll = startingBankroll - 25;
    this.state.bet = 25;
    this.state.betChips = [25];
    this.state.betType = scenario.betType;
    this.state.playerCards = [];
    this.state.bankerCards = [];
    this.state.dealtCards = { banker: [], player: [] };
    this.state.pendingRound = null;
    this.state.revealedPlayer = [];
    this.state.result = null;
    this.state.phase = "betting";
    this.state.tutorial.shoe = scenario.cards.map((card) => ({ ...card }));
    this.state.tutorial.instruction = `${scenario.intro}\nClick Deal to play the round.`;
    this.state.message = `${this.money(25)} on ${this.capitalize(scenario.betType)}.`;
  }

  private stopTutorial() {
    this.state.tutorial = { active: false, index: 0, instruction: "", shoe: [] };
    if (new URLSearchParams(window.location.search).get("tutorial") === "1") {
      window.history.replaceState(null, "", this.core.removeQueryParam("tutorial"));
    }
  }

  private nextRound() {
    if (this.state.tutorial.active) {
      this.state.tutorial.index += 1;
      if (this.state.tutorial.index < this.tutorialRounds.length) {
        this.prepareTutorialRound();
        this.commit(false);
      }
      return;
    }
    this.state.playerCards = [];
    this.state.bankerCards = [];
    this.state.dealtCards = { banker: [], player: [] };
    this.state.pendingRound = null;
    this.state.revealedPlayer = [];
    this.state.result = null;
    this.state.phase = "betting";
    this.state.bet = 0;
    this.state.betChips = [];
    const previous = this.state.lastBet;
    if (previous && previous.amount <= this.state.bankroll) {
      this.state.betType = previous.type;
      this.state.bet = previous.amount;
      this.state.betChips = [...previous.chips];
      this.state.bankroll -= previous.amount;
      this.state.message = `${this.money(previous.amount)} on ${this.capitalize(previous.type)} ready. Deal when you're set.`;
    } else {
      this.state.message =
        this.state.bankroll > 0
          ? `${this.capitalize(this.state.betType)} selected. Place a bet.`
          : "You're out of chips. Start a new game to reset your bankroll.";
    }
    this.commit();
  }

  private settle() {
    const round = this.state.pendingRound;
    if (!round || this.state.phase !== "revealing") return;
    const payout = this.engine.payoutFor(round.outcome, this.state.betType, this.state.bet);
    this.state.bankroll = Math.round((this.state.bankroll + payout) * 100) / 100;
    this.state.result = round.outcome;
    this.state.phase = "settled";
    this.state.history = [...this.state.history, round.outcome].slice(-historyLimit);
    if (!this.state.tutorial.active) {
      this.state.lastBet = {
        amount: this.state.bet,
        chips: [...this.state.betChips],
        type: this.state.betType,
      };
      this.state.session = this.baccaratSessions.record(
        this.state.session,
        round.outcome,
        this.state.bankroll,
      );
      this.state.highBankroll = Math.max(this.state.highBankroll, this.state.bankroll);
    }
    if (round.outcome === "tie" && this.state.betType !== "tie") {
      this.state.message = `Tie at ${round.playerTotal}. Your ${this.capitalize(this.state.betType)} bet pushes.`;
    } else if (round.outcome === this.state.betType) {
      this.state.message = `${this.capitalize(round.outcome)} wins. Player ${round.playerTotal}, Banker ${round.bankerTotal}. Paid ${this.money(payout)}.`;
    } else {
      this.state.message = `${this.capitalize(round.outcome)} wins. Player ${round.playerTotal}, Banker ${round.bankerTotal}.`;
    }
    if (this.state.tutorial.active) {
      const last = this.state.tutorial.index === this.tutorialRounds.length - 1;
      this.state.tutorial.instruction = `${this.currentTutorial().result}\n${last ? "Tutorial complete. Click New Game for normal play." : "Click Next Round to continue."}`;
    }
    const won = round.outcome === this.state.betType;
    this.feedback.cue(won ? "win" : "loss");
    this.feedback.vibrate(won ? [20, 30, 20] : 20);
    this.commit();
  }

  private async autoReveal() {
    while (this.state.phase === "revealing" && this.state.revealedPlayer.includes(false)) {
      await this.wait();
      this.revealPlayer(this.state.revealedPlayer.indexOf(false));
    }
  }

  private drawCard(): Card {
    if (this.state.tutorial.active && this.state.tutorial.shoe.length) {
      return this.state.tutorial.shoe.shift() as Card;
    }
    if (this.state.shoe.length < 20) this.state.shoe = this.buildShoe();
    return this.state.shoe.pop() as Card;
  }

  private refreshShoe() {
    this.state.shoe = this.buildShoe();
    this.state.shoeNumber += 1;
    this.cutCard = 60 + Math.floor(Math.random() * 16);
  }

  private wait() {
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180;
    return new Promise<void>((resolve) => window.setTimeout(resolve, delay));
  }

  private currentTutorial() {
    return this.tutorialRounds[this.state.tutorial.index];
  }

  private emptySession(bankroll = startingBankroll): BaccaratSession {
    return this.baccaratSessions.empty(bankroll);
  }

  private sanitizeStored(value: StoredBaccarat): StoredBaccarat {
    const bankroll = Number(value?.bankroll);
    const sanitizedBankroll =
      Number.isFinite(bankroll) && bankroll >= 0 ? bankroll : startingBankroll;
    const high = Number(value?.highBankroll);
    return {
      bankroll: sanitizedBankroll,
      highBankroll: Number.isFinite(high) && high >= startingBankroll ? high : startingBankroll,
      history: Array.isArray(value?.history)
        ? value.history
            .filter((item) => ["player", "banker", "tie"].includes(item))
            .slice(-historyLimit)
        : [],
      lastBet: this.sanitizeWager(value?.lastBet),
      session: this.baccaratSessions.sanitize(value?.session, sanitizedBankroll),
      snapshot: this.sanitizeSnapshot(value?.snapshot),
    };
  }

  private sanitizeSnapshot(snapshot: StoredBaccarat["snapshot"]) {
    if (!snapshot) return null;
    const wager = this.sanitizeWager({
      amount: snapshot.bet,
      chips: snapshot.betChips,
      type: snapshot.betType,
    });
    if (!wager) return null;
    const playerCards = this.sanitizeCards(snapshot.playerCards);
    const bankerCards = this.sanitizeCards(snapshot.bankerCards);
    return {
      bankerCards,
      bet: wager.amount,
      betChips: wager.chips,
      betType: wager.type,
      playerCards,
      revealedPlayer: playerCards.map((_, index) => snapshot.revealedPlayer?.[index] === true),
    };
  }

  private sanitizeWager(value: Partial<BaccaratWager> | null | undefined) {
    const amount = Number(value?.amount);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !["player", "banker", "tie"].includes(String(value?.type))
    )
      return null;
    const chips = Array.isArray(value?.chips)
      ? value.chips.map(Number).filter((chip) => Number.isFinite(chip) && chip > 0)
      : [];
    return { amount, chips: chips.length ? chips : [amount], type: value?.type } as BaccaratWager;
  }

  private sanitizeCards(cards: Card[] | undefined) {
    if (!Array.isArray(cards)) return [];
    return cards.flatMap((card) => {
      try {
        return [this.core.createCard(card.label, card.suitName, "baccarat") as Card];
      } catch {
        return [];
      }
    });
  }

  private save() {
    if (this.state.tutorial.active) return;
    const resumable =
      this.state.bet > 0 && ["betting", "dealing", "revealing"].includes(this.state.phase);
    this.storage.write({
      bankroll: this.state.bankroll,
      highBankroll: this.state.highBankroll,
      history: this.state.history,
      lastBet: this.state.lastBet,
      session: this.state.session,
      snapshot: resumable
        ? {
            bankerCards: this.state.bankerCards,
            bet: this.state.bet,
            betChips: this.state.betChips,
            betType: this.state.betType,
            playerCards: this.state.playerCards,
            revealedPlayer: this.state.revealedPlayer,
          }
        : null,
    });
  }

  private capitalize(value: string) {
    return value ? `${value[0].toUpperCase()}${value.slice(1)}` : "";
  }

  private clone(): BaccaratState {
    return {
      ...this.state,
      bankerCards: [...this.state.bankerCards],
      betChips: [...this.state.betChips],
      dealtCards: {
        banker: [...this.state.dealtCards.banker],
        player: [...this.state.dealtCards.player],
      },
      history: [...this.state.history],
      playerCards: [...this.state.playerCards],
      revealedPlayer: [...this.state.revealedPlayer],
      session: { ...this.state.session },
      settings: { ...this.state.settings },
      shoe: [...this.state.shoe],
      tutorial: { ...this.state.tutorial, shoe: [...this.state.tutorial.shoe] },
    };
  }

  private commit(save = true) {
    if (save) this.save();
    this.snapshot = this.clone();
    this.listeners.forEach((listener) => listener());
  }
}
