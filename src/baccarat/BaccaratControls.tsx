import { ActionTray, ChipTray } from "../shared/WagerControls";
import type { BaccaratController } from "./BaccaratController";
import type { BaccaratOutcome, BaccaratState } from "./types";

export function BaccaratControls({
  controller,
  state,
}: {
  controller: BaccaratController;
  state: BaccaratState;
}) {
  const betting = state.phase === "betting";
  const settled = state.phase === "settled";
  return (
    <section className="controls baccarat-controls" aria-label="Baccarat controls">
      <div className="bet-targets" aria-label="Choose a bet">
        {(
          [
            ["player", "1:1"],
            ["tie", "8:1"],
            ["banker", "0.95:1"],
          ] as Array<[BaccaratOutcome, string]>
        ).map(([type, payout]) => (
          <button
            aria-pressed={state.betType === type}
            className={`bet-target ${type}-bet`}
            data-bet-type={type}
            disabled={!betting || state.tutorial.active}
            key={type}
            onClick={() => controller.selectBet(type)}
            type="button"
          >
            <span>{type}</span>
            <strong>{payout}</strong>
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
              disabled={!state.bet || state.tutorial.active}
              id="baccarat-clear"
              onClick={() => controller.clearBet()}
              type="button"
            >
              Clear
            </button>
          )}
          {!["dealing", "revealing"].includes(state.phase) && (
            <button
              className="primary phase-primary"
              disabled={
                settled
                  ? state.bankroll <= 0 ||
                    (state.tutorial.active &&
                      state.tutorial.index === controller.tutorialTotal() - 1)
                  : !state.bet
              }
              id={settled ? "baccarat-next" : "baccarat-deal"}
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
