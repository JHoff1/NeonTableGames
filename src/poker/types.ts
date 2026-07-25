import type { Card, SummaryRow } from "../blackjack/types";
import type { SharedSettings } from "../shared/GameSettings";

export type PokerPhase = "betting" | "dealing" | "playing" | "revealing" | "settled";
export type PokerBetTarget = "ante" | "pairPlus";

export interface PokerSession {
  anteBonuses: number;
  folds: number;
  largestBankroll: number;
  losses: number;
  pairPlusWins: number;
  pushes: number;
  rounds: number;
  startingBankroll: number;
  wins: number;
}

export interface PokerWager {
  ante: number;
  pairPlus: number;
}

export interface PokerTutorial {
  active: boolean;
  index: number;
  instruction: string;
}

export interface PokerState {
  ante: number;
  anteChips: number[];
  bankroll: number;
  betTarget: PokerBetTarget;
  dealtCards: { dealer: boolean[]; player: boolean[] };
  dealerCards: Card[];
  dealerRevealed: boolean[];
  deck: Card[];
  highBankroll: number;
  lastWager: PokerWager | null;
  message: string;
  pairPlus: number;
  pairPlusChips: number[];
  phase: PokerPhase;
  play: number;
  playerCards: Card[];
  playerRevealed: boolean[];
  result: string | null;
  session: PokerSession;
  settings: SharedSettings;
  tutorial: PokerTutorial;
}

export type { Card, SummaryRow };
