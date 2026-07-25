import type { BlackjackController } from "./BlackjackController";
import type { TutorialState } from "./types";
import { GameTutorial } from "../shared/GameTutorial";

const actionLabels = {
  deal: "Deal",
  double: "Double",
  hit: "Hit",
  next: "Next Hand",
  "new-game": "New Game",
  split: "Split",
  stand: "Stand",
} as const;

export function BlackjackTutorial({
  controller,
  tutorial,
  total,
}: {
  controller: BlackjackController;
  total: number;
  tutorial: TutorialState;
}) {
  if (!tutorial.active || !tutorial.instruction) return null;
  const action = tutorial.allowedAction
    ? actionLabels[tutorial.allowedAction as keyof typeof actionLabels]
    : "";
  return (
    <GameTutorial
      complete={tutorial.allowedAction === "new-game"}
      current={tutorial.handIndex + 1}
      instruction={tutorial.instruction}
      nextAction={action}
      onRestart={() => controller.restartTutorial()}
      strategyHref="../blackjack-rules/index.html#strategy-chart-title"
      total={total}
      unit="Hand"
    />
  );
}
