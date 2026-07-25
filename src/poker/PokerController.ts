import type { SharedSettings } from "../shared/GameSettings";
import type {
  Card,
  PokerBetTarget,
  PokerSession,
  PokerState,
  PokerWager,
  SummaryRow,
} from "./types";

const startingBankroll = 1000;
const counters = ["anteBonuses", "folds", "losses", "pairPlusWins", "pushes", "rounds", "wins"];

type TutorialScenario = {
  action: "play" | "fold";
  ante: number;
  dealer: Array<[string, string]>;
  intro: string;
  pairPlus: number;
  player: Array<[string, string]>;
  result: string;
};

interface StoredPoker {
  bankroll: number;
  highBankroll: number;
  lastWager: PokerWager | null;
  session: PokerSession;
  snapshot: {
    ante: number;
    anteChips: number[];
    betTarget: PokerBetTarget;
    dealerCards: Card[];
    pairPlus: number;
    pairPlusChips: number[];
    playerCards: Card[];
  } | null;
}

export class PokerController {
  private readonly core = window.NeonTableCore;
  private readonly engine = window.NeonThreeCardPokerEngine;
  private readonly sessions = window.NeonSessionFramework;
  private readonly settingsStore = window.NeonTableSettings.createSettings();
  private readonly feedback = window.NeonTableSettings.createFeedback(this.settingsStore);
  private readonly buildShoe = this.core.createShoeBuilder(1, "blackjack");
  private readonly listeners = new Set<() => void>();
  private readonly storage: {
    key: string;
    read(): StoredPoker;
    write(value: StoredPoker): boolean;
  };
  private readonly tutorials: Array<
    Omit<TutorialScenario, "dealer" | "player"> & { dealer: Card[]; player: Card[] }
  >;
  private state: PokerState;
  private snapshot: PokerState;
  private sequence = 0;
  private attached = false;

  constructor() {
    this.tutorials = (window.NeonThreeCardPokerTutorials as TutorialScenario[]).map((scenario) => ({
      ...scenario,
      dealer: scenario.dealer.map(([label, suit]) =>
        this.core.createCard(label, suit, "blackjack"),
      ),
      player: scenario.player.map(([label, suit]) =>
        this.core.createCard(label, suit, "blackjack"),
      ),
    }));
    this.storage = this.core.createGameStorage("neontablegames.three-card-poker", {
      defaults: {
        bankroll: startingBankroll,
        highBankroll: startingBankroll,
        lastWager: null,
        session: this.emptySession(),
        snapshot: null,
      },
      sanitize: (value: StoredPoker) => this.sanitizeStored(value),
    });
    const saved = this.storage.read();
    const restored = saved.snapshot;
    const hasRound = restored?.playerCards.length === 3 && restored?.dealerCards.length === 3;
    this.state = {
      ante: restored?.ante ?? 0,
      anteChips: restored?.anteChips ?? [],
      bankroll: saved.bankroll,
      betTarget: restored?.betTarget ?? "ante",
      dealtCards: hasRound
        ? { dealer: [true, true, true], player: [true, true, true] }
        : { dealer: [], player: [] },
      dealerCards: restored?.dealerCards ?? [],
      dealerRevealed: hasRound ? [false, false, false] : [],
      deck: this.buildShoe(),
      highBankroll: saved.highBankroll,
      lastWager: saved.lastWager,
      message: hasRound
        ? "Round restored. Choose Play or Fold."
        : restored
          ? "Wagers restored. Deal when ready."
          : saved.bankroll > 0
            ? "Place an Ante to start a round."
            : "You're out of chips. Start a new game to reset your bankroll.",
      pairPlus: restored?.pairPlus ?? 0,
      pairPlusChips: restored?.pairPlusChips ?? [],
      phase: hasRound ? "playing" : "betting",
      play: 0,
      playerCards: restored?.playerCards ?? [],
      playerRevealed: hasRound ? [true, true, true] : [],
      result: null,
      session: saved.session,
      settings: this.settingsStore.get(),
      tutorial: { active: false, index: 0, instruction: "" },
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
      isActive: () =>
        ["dealing", "playing", "revealing"].includes(this.state.phase) ||
        this.state.ante + this.state.pairPlus > 0,
      key: this.storage.key,
    });
  }

  money(value: number) {
    return this.core.money(value);
  }

  currentFunds() {
    const active = ["betting", "dealing", "playing", "revealing"].includes(this.state.phase);
    return (
      this.state.bankroll + (active ? this.state.ante + this.state.pairPlus + this.state.play : 0)
    );
  }

  rank(cards: Card[], visible: boolean) {
    return visible && cards.length === 3 ? this.engine.rankHand(cards).name : "Waiting";
  }

  selectBet(target: PokerBetTarget) {
    if (this.state.phase !== "betting" || this.state.tutorial.active) return;
    this.state.betTarget = target;
    this.state.message =
      target === "ante"
        ? "Ante selected. This wager is required to deal."
        : "Pair Plus selected. This optional wager pays on a pair or better.";
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
    if (this.state.betTarget === "ante") {
      this.state.ante += amount;
      this.state.anteChips.push(amount);
    } else {
      this.state.pairPlus += amount;
      this.state.pairPlusChips.push(amount);
    }
    this.state.message = `${this.money(amount)} added to ${this.state.betTarget === "ante" ? "Ante" : "Pair Plus"}.`;
    this.commit();
  }

  clearBets() {
    if (this.state.phase !== "betting" || this.state.tutorial.active) return;
    this.state.bankroll += this.state.ante + this.state.pairPlus;
    this.state.ante = 0;
    this.state.anteChips = [];
    this.state.pairPlus = 0;
    this.state.pairPlusChips = [];
    this.state.message =
      this.state.bankroll > 0
        ? "Place an Ante to start a round."
        : "You're out of chips. Start a new game to reset your bankroll.";
    this.commit();
  }

  primaryAction() {
    if (this.state.phase === "betting") void this.deal();
    if (this.state.phase === "settled") this.nextRound();
  }

  async deal() {
    if (this.state.phase !== "betting" || this.state.ante <= 0) return;
    const scenario = this.state.tutorial.active ? this.currentTutorial() : null;
    this.state.playerCards = scenario
      ? scenario.player.map((card) => ({ ...card }))
      : [this.drawCard(), this.drawCard(), this.drawCard()];
    this.state.dealerCards = scenario
      ? scenario.dealer.map((card) => ({ ...card }))
      : [this.drawCard(), this.drawCard(), this.drawCard()];
    this.state.dealtCards = { dealer: [false, false, false], player: [false, false, false] };
    this.state.dealerRevealed = [false, false, false];
    this.state.playerRevealed = [false, false, false];
    this.state.phase = "dealing";
    this.state.result = null;
    this.state.message = "Dealing cards...";
    const sequence = ++this.sequence;
    this.commit();
    for (let index = 0; index < 3; index += 1) {
      for (const side of ["player", "dealer"] as const) {
        await this.wait();
        if (sequence !== this.sequence) return;
        this.state.dealtCards[side][index] = true;
        this.feedback.cue("deal");
        this.commit();
      }
    }
    this.state.phase = "playing";
    this.commit();
    if (this.state.settings.autoRevealPoker) {
      this.state.message = "Turning over your cards...";
      this.commit();
      for (let index = 0; index < 3; index += 1) {
        await this.wait();
        if (sequence !== this.sequence) return;
        this.revealPlayer(index, false);
      }
    }
    this.finishPlayerReveal();
  }

  revealPlayer(index: number, finish = true) {
    if (
      this.state.phase !== "playing" ||
      this.state.playerRevealed[index] ||
      !this.state.dealtCards.player[index]
    )
      return;
    this.state.playerRevealed[index] = true;
    this.feedback.cue("deal");
    if (finish) this.finishPlayerReveal();
    else this.commit();
  }

  canDecide() {
    return this.state.phase === "playing" && this.state.playerRevealed.every(Boolean);
  }

  tutorialAllows(action: "play" | "fold") {
    return !this.state.tutorial.active || this.currentTutorial().action === action;
  }

  async play() {
    await this.settle(false);
  }

  async fold() {
    await this.settle(true);
  }

  newGame() {
    if (this.state.tutorial.active && this.state.phase !== "settled") return;
    this.stopTutorial();
    this.sequence += 1;
    this.state = {
      ...this.state,
      ante: 0,
      anteChips: [],
      bankroll: startingBankroll,
      betTarget: "ante",
      dealtCards: { dealer: [], player: [] },
      dealerCards: [],
      dealerRevealed: [],
      deck: this.buildShoe(),
      lastWager: null,
      message: "Place an Ante to start a round.",
      pairPlus: 0,
      pairPlusChips: [],
      phase: "betting",
      play: 0,
      playerCards: [],
      playerRevealed: [],
      result: null,
      session: this.emptySession(),
      tutorial: { active: false, index: 0, instruction: "" },
    };
    this.commit();
  }

  restartTutorial() {
    this.startTutorial();
  }

  resetSession() {
    if (this.sessionActionsDisabled()) return;
    this.state.session = this.emptySession(this.currentFunds());
    this.state.message = "Session statistics reset.";
    this.commit();
  }

  sessionActionsDisabled() {
    return (
      this.state.tutorial.active ||
      ["dealing", "playing", "revealing"].includes(this.state.phase) ||
      (this.state.phase === "betting" && this.state.ante + this.state.pairPlus > 0)
    );
  }

  setSetting(name: keyof SharedSettings, value: boolean) {
    this.state.settings = this.settingsStore.set({ [name]: value });
    if (name === "sound" && value) this.feedback.unlockAudio();
    this.commit(false);
  }

  tutorialTotal() {
    return this.tutorials.length;
  }

  tutorialNextAction() {
    if (this.state.phase === "settled") {
      return this.state.tutorial.index === this.tutorials.length - 1 ? "New Game" : "Next Round";
    }
    if (this.state.phase === "playing" && this.state.playerRevealed.every(Boolean)) {
      return this.currentTutorial().action === "play" ? "Play" : "Fold";
    }
    return this.state.phase === "playing" ? "Reveal Player cards" : "Deal";
  }

  summaryRows(): SummaryRow[] {
    const session = this.state.session;
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
      { label: "Wins", value: String(session.wins) },
      { label: "Losses", value: String(session.losses) },
      { label: "Win rate", value: `${winRate}%` },
      { label: "Pushes", value: String(session.pushes) },
      { label: "Folds", value: String(session.folds) },
      { label: "Pair Plus wins", value: String(session.pairPlusWins) },
      { label: "Ante Bonuses", value: String(session.anteBonuses) },
      { label: "Peak bankroll", value: this.money(session.largestBankroll) },
    ];
  }

  sessionProfit() {
    return this.sessions.profit(this.state.session, this.currentFunds(), {
      disabled: this.state.tutorial.active,
    });
  }

  private finishPlayerReveal() {
    if (this.state.playerRevealed.some((value) => !value)) {
      this.state.message = "Tap each face-down Player card to reveal your hand.";
      this.commit();
      return;
    }
    const rank = this.engine.rankHand(this.state.playerCards).name;
    if (this.state.tutorial.active) {
      const scenario = this.currentTutorial();
      const decision = this.engine.shouldPlay(this.state.playerCards) ? "Play" : "Fold";
      this.state.message = `${rank}. ${this.engine.strategyReason(this.state.playerCards)} Basic strategy: ${decision}.`;
      this.state.tutorial.instruction = `${scenario.intro}\nChoose ${scenario.action === "play" ? "Play" : "Fold"} to continue.`;
    } else {
      this.state.message = `${rank}. Choose Play or Fold.`;
    }
    this.commit();
  }

  private async settle(folded: boolean) {
    if (!this.canDecide()) return;
    if (this.state.tutorial.active && this.currentTutorial().action !== (folded ? "fold" : "play"))
      return;
    if (!folded) {
      if (this.state.ante > this.state.bankroll) return;
      this.state.play = this.state.ante;
      this.state.bankroll -= this.state.play;
    }
    this.state.phase = "revealing";
    this.state.message = folded
      ? "Hand folded. Revealing the Dealer..."
      : "Play wager placed. Revealing the Dealer...";
    this.commit();
    for (let index = 0; index < this.state.dealerCards.length; index += 1) {
      await this.wait();
      if (this.state.phase !== "revealing") return;
      this.state.dealerRevealed[index] = true;
      this.feedback.cue("deal");
      this.commit();
    }
    const settlement = this.engine.settleRound({
      ante: this.state.ante,
      dealerCards: this.state.dealerCards,
      folded,
      pairPlus: this.state.pairPlus,
      play: this.state.play,
      playerCards: this.state.playerCards,
    });
    this.state.bankroll = Math.round((this.state.bankroll + settlement.totalPayout) * 100) / 100;
    this.state.phase = "settled";
    this.state.result = settlement.result;
    if (!this.state.tutorial.active) {
      this.state.highBankroll = Math.max(this.state.highBankroll, this.state.bankroll);
      this.state.lastWager = { ante: this.state.ante, pairPlus: this.state.pairPlus };
      const outcome =
        settlement.result === "Fold"
          ? "folds"
          : settlement.result === "Loss"
            ? "losses"
            : settlement.result === "Push"
              ? "pushes"
              : "wins";
      this.state.session = this.sessions.record(this.state.session, {
        bankroll: this.state.bankroll,
        increments: {
          anteBonuses: settlement.anteBonus ? 1 : 0,
          pairPlusWins: settlement.pairPlusPayout ? 1 : 0,
          rounds: 1,
          [outcome]: 1,
        },
      });
    }
    const playerName = this.engine.rankHand(this.state.playerCards).name;
    const dealerName = this.engine.rankHand(this.state.dealerCards).name;
    const extras: string[] = [];
    if (settlement.anteBonus) extras.push(`Ante Bonus ${this.money(settlement.anteBonus)}`);
    if (this.state.pairPlus > 0) {
      extras.push(
        settlement.pairPlusPayout
          ? `Pair Plus paid ${this.money(settlement.pairPlusPayout)}`
          : "Pair Plus lost",
      );
    }
    this.state.message = `${settlement.result}. Player ${playerName}; Dealer ${dealerName}.${extras.length ? ` ${extras.join(". ")}.` : ""}`;
    if (this.state.tutorial.active) {
      const last = this.state.tutorial.index === this.tutorials.length - 1;
      this.state.tutorial.instruction = `${this.currentTutorial().result}\n${last ? "Tutorial complete. Click New Game for normal play." : "Click Next Round to continue."}`;
    }
    const won = ["Win", "Dealer Does Not Qualify"].includes(settlement.result);
    this.feedback.cue(won ? "win" : "loss");
    this.feedback.vibrate(won ? [20, 30, 20] : 20);
    this.commit();
  }

  private nextRound() {
    if (this.state.tutorial.active) {
      this.state.tutorial.index += 1;
      if (this.state.tutorial.index < this.tutorials.length) {
        this.prepareTutorialRound();
        this.commit(false);
      }
      return;
    }
    this.state.ante = 0;
    this.state.anteChips = [];
    this.state.dealerCards = [];
    this.state.dealerRevealed = [];
    this.state.dealtCards = { dealer: [], player: [] };
    this.state.pairPlus = 0;
    this.state.pairPlusChips = [];
    this.state.play = 0;
    this.state.playerCards = [];
    this.state.playerRevealed = [];
    this.state.result = null;
    this.state.phase = "betting";
    const wager = this.state.lastWager;
    if (wager && wager.ante + wager.pairPlus <= this.state.bankroll) {
      this.state.ante = wager.ante;
      this.state.anteChips = this.chipsFor(wager.ante);
      this.state.pairPlus = wager.pairPlus;
      this.state.pairPlusChips = this.chipsFor(wager.pairPlus);
      this.state.bankroll -= wager.ante + wager.pairPlus;
      this.state.message = `Ante ${this.money(wager.ante)}${wager.pairPlus ? ` and Pair Plus ${this.money(wager.pairPlus)}` : ""} ready. Deal when you're set.`;
    } else {
      this.state.message =
        this.state.bankroll > 0
          ? "Place an Ante to start a round."
          : "You're out of chips. Start a new game to reset your bankroll.";
    }
    this.commit();
  }

  private startTutorial(commit = true) {
    this.sequence += 1;
    this.state.tutorial = { active: true, index: 0, instruction: "" };
    this.prepareTutorialRound();
    if (commit) this.commit(false);
  }

  private prepareTutorialRound() {
    const scenario = this.currentTutorial();
    this.state.ante = scenario.ante;
    this.state.anteChips = [scenario.ante];
    this.state.bankroll = startingBankroll - scenario.ante - scenario.pairPlus;
    this.state.betTarget = "ante";
    this.state.dealerCards = [];
    this.state.dealerRevealed = [];
    this.state.dealtCards = { dealer: [], player: [] };
    this.state.pairPlus = scenario.pairPlus;
    this.state.pairPlusChips = scenario.pairPlus ? [scenario.pairPlus] : [];
    this.state.phase = "betting";
    this.state.play = 0;
    this.state.playerCards = [];
    this.state.playerRevealed = [];
    this.state.result = null;
    this.state.message = "Tutorial wagers are ready. Click Deal.";
    this.state.tutorial.instruction = `${scenario.intro}\nClick Deal to see the hand.`;
  }

  private stopTutorial() {
    this.state.tutorial = { active: false, index: 0, instruction: "" };
    if (new URLSearchParams(window.location.search).get("tutorial") === "1") {
      window.history.replaceState(null, "", this.core.removeQueryParam("tutorial"));
    }
  }

  private currentTutorial() {
    return this.tutorials[this.state.tutorial.index];
  }

  private drawCard(): Card {
    if (this.state.deck.length < 12) this.state.deck = this.buildShoe();
    return this.state.deck.pop() as Card;
  }

  private wait() {
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180;
    return new Promise<void>((resolve) => window.setTimeout(resolve, delay));
  }

  private emptySession(bankroll = startingBankroll): PokerSession {
    return this.sessions.create({ bankroll, counters });
  }

  private sanitizeStored(value: StoredPoker): StoredPoker {
    const bankroll = Number(value?.bankroll);
    const sanitizedBankroll =
      Number.isFinite(bankroll) && bankroll >= 0 ? bankroll : startingBankroll;
    const high = Number(value?.highBankroll);
    return {
      bankroll: sanitizedBankroll,
      highBankroll: Number.isFinite(high) && high >= startingBankroll ? high : startingBankroll,
      lastWager: this.sanitizeWager(value?.lastWager),
      session: this.sessions.sanitize(value?.session, {
        bankroll: sanitizedBankroll,
        counters,
      }),
      snapshot: this.sanitizeSnapshot(value?.snapshot),
    };
  }

  private sanitizeSnapshot(snapshot: StoredPoker["snapshot"]) {
    if (!snapshot) return null;
    const wager = this.sanitizeWager(snapshot);
    if (!wager) return null;
    return {
      ante: wager.ante,
      anteChips: this.sanitizeChips(snapshot.anteChips, wager.ante),
      betTarget: snapshot.betTarget === "pairPlus" ? "pairPlus" : "ante",
      dealerCards: this.sanitizeCards(snapshot.dealerCards),
      pairPlus: wager.pairPlus,
      pairPlusChips: this.sanitizeChips(snapshot.pairPlusChips, wager.pairPlus),
      playerCards: this.sanitizeCards(snapshot.playerCards),
    } as StoredPoker["snapshot"];
  }

  private sanitizeWager(value: Partial<PokerWager> | null | undefined) {
    const ante = Number(value?.ante);
    const pairPlus = Number(value?.pairPlus);
    if (!Number.isFinite(ante) || ante <= 0 || !Number.isFinite(pairPlus) || pairPlus < 0)
      return null;
    return { ante, pairPlus };
  }

  private sanitizeCards(cards: Card[] | undefined) {
    if (!Array.isArray(cards)) return [];
    return cards.flatMap((card) => {
      try {
        return [this.core.createCard(card.label, card.suitName, "blackjack") as Card];
      } catch {
        return [];
      }
    });
  }

  private sanitizeChips(chips: number[] | undefined, fallback: number) {
    const values = Array.isArray(chips)
      ? chips.map(Number).filter((chip) => Number.isFinite(chip) && chip > 0)
      : [];
    return values.length ? values : fallback > 0 ? [fallback] : [];
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
    return chips;
  }

  private save() {
    if (this.state.tutorial.active) return;
    const resumable =
      (this.state.phase === "betting" && this.state.ante + this.state.pairPlus > 0) ||
      ["dealing", "playing"].includes(this.state.phase);
    this.storage.write({
      bankroll: this.state.bankroll,
      highBankroll: this.state.highBankroll,
      lastWager: this.state.lastWager,
      session: this.state.session,
      snapshot: resumable
        ? {
            ante: this.state.ante,
            anteChips: this.state.anteChips,
            betTarget: this.state.betTarget,
            dealerCards: this.state.dealerCards,
            pairPlus: this.state.pairPlus,
            pairPlusChips: this.state.pairPlusChips,
            playerCards: this.state.playerCards,
          }
        : null,
    });
  }

  private clone(): PokerState {
    return {
      ...this.state,
      anteChips: [...this.state.anteChips],
      dealtCards: {
        dealer: [...this.state.dealtCards.dealer],
        player: [...this.state.dealtCards.player],
      },
      dealerCards: [...this.state.dealerCards],
      dealerRevealed: [...this.state.dealerRevealed],
      deck: [...this.state.deck],
      pairPlusChips: [...this.state.pairPlusChips],
      playerCards: [...this.state.playerCards],
      playerRevealed: [...this.state.playerRevealed],
      session: { ...this.state.session },
      settings: { ...this.state.settings },
      tutorial: { ...this.state.tutorial },
    };
  }

  private commit(save = true) {
    if (save) this.save();
    this.snapshot = this.clone();
    this.listeners.forEach((listener) => listener());
  }
}
