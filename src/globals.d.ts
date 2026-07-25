import type {
  BlackjackHand,
  BlackjackSession,
  BlackjackSettings,
  Card,
  SummaryRow,
  TutorialScenario,
} from "./blackjack/types";
import type { BaccaratOutcome, BaccaratRound, BaccaratSession } from "./baccarat/types";

interface GameStorage<T> {
  key: string;
  read(): T;
  write(value: T): boolean;
}

interface GameCore {
  createCard(label: string, suitName: string, game?: string): Card;
  createGameStorage<T>(
    key: string,
    options: {
      defaults: T;
      migrate?(storage: Storage): T;
      sanitize(value: T): T;
      version?: number;
    },
  ): GameStorage<T>;
  createShoeBuilder(deckCount?: number, game?: string): () => Card[];
  money(value: number, options?: { forceCents?: boolean }): string;
  phases: {
    BETTING: "betting";
    DEALING: "dealing";
    PLAYING: "playing";
    REVEALING: "revealing";
    SETTLED: "settled";
  };
  readStoredNumber(
    key: string,
    fallback: number,
    options?: { minimum?: number; storage?: Storage },
  ): number;
  removeQueryParam(name: string, location?: Location): string;
  setupCrossTabSync(options: { isActive(): boolean; key: string }): void;
  setupSeedDebugIndicator(): void;
  setupTooltips(): { hide(): void };
}

interface BlackjackEngine {
  canDoubleHand(hand: BlackjackHand | undefined, bankroll: number): boolean;
  canSplitHand(hand: BlackjackHand | undefined, handCount: number, bankroll: number): boolean;
  dealerShouldHit(cards: Card[]): boolean;
  dealerShouldPlay(hands: BlackjackHand[]): boolean;
  handLabel(cards: Card[]): string;
  handValue(cards: Card[]): number;
  isNaturalBlackjack(hand: BlackjackHand | undefined): boolean;
  settleHands(
    hands: BlackjackHand[],
    dealerCards: Card[],
  ): {
    settlements: Array<{ payout: number; result: string; status: "settled" }>;
    totalPayout: number;
  };
}

interface SessionFramework {
  create<T = BlackjackSession>(options: { bankroll: number; counters: string[] }): T;
  profit<T = BlackjackSession>(
    session: T,
    currentFunds: number,
    options?: { disabled?: boolean },
  ): number;
  record<T = BlackjackSession>(
    session: T,
    options: { bankroll: number; increments?: Record<string, number> },
  ): T;
  sanitize<T = BlackjackSession>(session: T, options: { bankroll: number; counters: string[] }): T;
}

interface SettingsStore {
  get(): BlackjackSettings;
  set(updates: Partial<BlackjackSettings>): BlackjackSettings;
}

interface Feedback {
  cue(type: "deal" | "loss" | "win"): void;
  unlockAudio(): void;
  vibrate(pattern?: number | number[]): void;
}

declare global {
  interface Window {
    NeonBaccaratEngine: {
      handTotal(cards: Card[]): number;
      outcome(playerCards: Card[], bankerCards: Card[]): BaccaratOutcome;
      payoutFor(result: BaccaratOutcome, betType: BaccaratOutcome, amount: number): number;
      playRound(drawCard: () => Card): BaccaratRound;
    };
    NeonBaccaratSession: {
      createBigRoad(history: BaccaratOutcome[]): {
        cells: Array<{
          column: number;
          outcome: BaccaratOutcome;
          row: number;
          ties: number;
        }>;
        leadingTies: number;
      };
      empty(bankroll?: number): BaccaratSession;
      record(session: BaccaratSession, outcome: BaccaratOutcome, bankroll: number): BaccaratSession;
      sanitize(session: BaccaratSession, bankroll?: number): BaccaratSession;
      summary(
        session: BaccaratSession,
        funds: number,
      ): BaccaratSession & {
        bankerRate: number;
        playerRate: number;
        profit: number;
        tieRate: number;
      };
    };
    NeonBaccaratTutorials: readonly Array<{
      betType: BaccaratOutcome;
      cards: Array<[string, string]>;
      intro: string;
      result: string;
    }>;
    NeonBlackjackEngine: BlackjackEngine;
    NeonBlackjackTutorials: readonly TutorialScenario[];
    NeonSessionFramework: SessionFramework & {
      renderSummary(content: Element, rows: SummaryRow[]): void;
    };
    NeonThreeCardPokerEngine: {
      rankHand(cards: Card[]): { category: number; name: string; tiebreak: number[] };
      settleRound(options: {
        ante: number;
        dealerCards: Card[];
        folded: boolean;
        pairPlus: number;
        play: number;
        playerCards: Card[];
      }): {
        anteBonus: number;
        pairPlusPayout: number;
        result: string;
        totalPayout: number;
      };
      shouldPlay(cards: Card[]): boolean;
      strategyReason(cards: Card[]): string;
    };
    NeonThreeCardPokerTutorials: readonly Array<{
      action: "play" | "fold";
      ante: number;
      dealer: Array<[string, string]>;
      intro: string;
      pairPlus: number;
      player: Array<[string, string]>;
      result: string;
    }>;
    NeonTableCore: GameCore;
    NeonTableSettings: {
      createFeedback(settings: SettingsStore): Feedback;
      createSettings(): SettingsStore;
    };
  }
}

export {};
