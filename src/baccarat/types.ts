import type { Card, SummaryRow } from "../blackjack/types";
import type { SharedSettings } from "../shared/GameSettings";

export type BaccaratPhase = "betting" | "dealing" | "revealing" | "settled";
export type BaccaratOutcome = "player" | "banker" | "tie";

export interface BaccaratSession {
  bankerWins: number;
  largestBankroll: number;
  playerWins: number;
  rounds: number;
  startingBankroll: number;
  streakCount: number;
  streakResult: BaccaratOutcome | "";
  ties: number;
}

export interface BaccaratRound {
  bankerCards: Card[];
  bankerTotal: number;
  outcome: BaccaratOutcome;
  playerCards: Card[];
  playerTotal: number;
}

export interface BaccaratWager {
  amount: number;
  chips: number[];
  type: BaccaratOutcome;
}

export interface BaccaratTutorial {
  active: boolean;
  index: number;
  instruction: string;
  shoe: Card[];
}

export interface BaccaratState {
  bankerCards: Card[];
  bankroll: number;
  bet: number;
  betChips: number[];
  betType: BaccaratOutcome;
  dealtCards: { banker: boolean[]; player: boolean[] };
  highBankroll: number;
  history: BaccaratOutcome[];
  lastBet: BaccaratWager | null;
  message: string;
  pendingRound: BaccaratRound | null;
  phase: BaccaratPhase;
  playerCards: Card[];
  result: BaccaratOutcome | null;
  revealedPlayer: boolean[];
  session: BaccaratSession;
  settings: SharedSettings;
  shoe: Card[];
  shoeNumber: number;
  tutorial: BaccaratTutorial;
}

export type { Card, SummaryRow };
