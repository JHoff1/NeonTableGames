import { ActionTray, ChipTray } from "../shared/WagerControls";
import type { PokerController } from "./PokerController";
import type { PokerBetTarget, PokerState } from "./types";

export function PokerControls({
  controller,
  state,
}: {
  controller: PokerController;
  state: PokerState;
}) {
  const betting = state.phase === "betting";
  const playing = state.phase === "playing";
  const settled = state.phase === "settled";
  return (
    <section className="controls poker-controls" aria-label="Three Card Poker controls">
      <div className="poker-bet-targets" aria-label="Choose a wager">
        {(
          [
            ["ante", "Required"],
            ["pairPlus", "Optional"],
          ] as Array<[PokerBetTarget, string]>
        ).map(([target, hint]) => (
          <button
            aria-pressed={state.betTarget === target}
            className={`poker-bet-target ${target === "pairPlus" ? "pair-plus-target" : ""}`}
            data-poker-bet={target}
            disabled={!betting || state.tutorial.active}
            key={target}
            onClick={() => controller.selectBet(target)}
            type="button"
          >
            <span>{target === "pairPlus" ? "Pair Plus" : "Ante"}</span>
            <strong>{hint}</strong>
          </button>
        ))}
      </div>
      <div className="wager-action-row">
        <ChipTray
          canBet={(amount) => betting && !state.tutorial.active && amount <= state.bankroll}
          onAdd={(amount) => controller.addBet(amount)}
        />
        <ActionTray>
          {betting && (
            <button
              className="secondary"
              disabled={state.ante + state.pairPlus === 0 || state.tutorial.active}
              id="poker-clear"
              onClick={() => controller.clearBets()}
              type="button"
            >
              Clear
            </button>
          )}
          {playing && (
            <>
              <button
                disabled={!controller.canDecide() || !controller.tutorialAllows("fold")}
                id="poker-fold"
                onClick={() => void controller.fold()}
                type="button"
              >
                Fold
              </button>
              <button
                className="primary"
                disabled={
                  !controller.canDecide() ||
                  state.ante > state.bankroll ||
                  !controller.tutorialAllows("play")
                }
                id="poker-play"
                onClick={() => void controller.play()}
                type="button"
              >
                Play
              </button>
            </>
          )}
          {!["dealing", "playing", "revealing"].includes(state.phase) && (
            <button
              className="primary phase-primary"
              disabled={
                settled
                  ? state.bankroll <= 0 ||
                    (state.tutorial.active &&
                      state.tutorial.index === controller.tutorialTotal() - 1)
                  : state.ante <= 0
              }
              id={settled ? "poker-next" : "poker-deal"}
              onClick={() => controller.primaryAction()}
              type="button"
            >
              {settled ? "Next Round" : "Deal"}
            </button>
          )}
        </ActionTray>
      </div>
    </section>
  );
}
