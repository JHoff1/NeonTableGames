export type GamePhase = "betting" | "playing" | "settled";
export type HandStatus = "playing" | "waiting" | "stood" | "bust" | "settled";
export type TutorialAction =
  "chip" | "clear" | "deal" | "double" | "hit" | "new-game" | "next" | "split" | "stand";

export interface Card {
  baccaratValue?: number;
  color: "black" | "red";
  label: string;
  suit: string;
  suitName: string;
  value: number;
}

export interface BlackjackHand {
  bet: number;
  cards: Card[];
  result: string;
  status: HandStatus;
  wasSplit: boolean;
}

export interface BlackjackSession {
  blackjacks: number;
  largestBankroll: number;
  losses: number;
  pushes: number;
  rounds: number;
  splits: number;
  startingBankroll: number;
  wins: number;
}

export interface BlackjackSettings {
  autoRevealPlayer: boolean;
  autoRevealPoker: boolean;
  haptics: boolean;
  sound: boolean;
}

export interface TutorialScenario {
  afterHitInstruction?: string;
  afterSplitInstruction?: string;
  allowedAction: TutorialAction;
  deck: Card[];
  instruction: string;
  resultInstruction?: string;
  secondHandInstruction?: string;
}

export interface TutorialState {
  active: boolean;
  allowedAction: TutorialAction | null;
  awaitingNextHand: boolean;
  deck: Card[];
  handIndex: number;
  instruction: string;
  intro: boolean;
}

export interface BlackjackState {
  activeHand: number;
  bankroll: number;
  bet: number;
  betChips: number[];
  dealer: Card[];
  deck: Card[];
  hands: BlackjackHand[];
  highBankroll: number;
  lastWager: number | null;
  message: string;
  phase: GamePhase;
  revealDealer: boolean;
  session: BlackjackSession;
  settings: BlackjackSettings;
  tutorial: TutorialState;
}

export interface SummaryRow {
  className?: string;
  label: string;
  value: string;
}
