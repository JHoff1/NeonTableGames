import type { BlackjackController } from "./BlackjackController";
import type { BlackjackState } from "./types";

interface BlackjackControlsProps {
  controller: BlackjackController;
  state: BlackjackState;
}

export function BlackjackControls({ controller, state }: BlackjackControlsProps) {
  const betting = state.phase === "betting";
  const playing = state.phase === "playing";
  const settled = state.phase === "settled";
  const primaryId = settled ? "next-hand" : "deal";
  const primaryLabel = settled ? "Next Hand" : "Deal";
  const primaryDisabled = settled
    ? state.bankroll <= 0 || !controller.canUse("next")
    : state.bet === 0 || !controller.canUse("deal");

  return (
    <section className="controls" aria-label="Game controls">
      <div className="chips" aria-label="Bet chips">
        {[5, 25, 100, 500].map((amount) => (
          <button
            className="chip"
            data-chip={amount}
            data-tooltip={`Add $${amount} to your bet`}
            disabled={!betting || amount > state.bankroll || !controller.canUse("chip")}
            key={amount}
            onClick={() => controller.addBet(amount)}
            type="button"
          >
            <span className="chip-dollar">$</span>
            {amount}
          </button>
        ))}
      </div>

      <div className="actions">
        {betting && (
          <button
            className="secondary"
            data-tooltip="Return your current bet to your bankroll"
            disabled={state.bet === 0 || !controller.canUse("clear")}
            id="clear-bet"
            onClick={() => controller.clearBet()}
            type="button"
          >
            Clear
          </button>
        )}
        {playing && (
          <>
            <button
              data-tooltip="End your turn and let the dealer play"
              disabled={!controller.canUse("stand")}
              id="stand"
              onClick={() => controller.stand()}
              type="button"
            >
              Stand
            </button>
            <button
              data-tooltip="Take one more card"
              disabled={!controller.canUse("hit")}
              id="hit"
              onClick={() => controller.hit()}
              type="button"
            >
              Hit
            </button>
            <button
              data-tooltip="Double your bet, take one card, then stand"
              disabled={!controller.canDouble() || !controller.canUse("double")}
              id="double"
              onClick={() => controller.doubleDown()}
              type="button"
            >
              Double
            </button>
            <button
              data-tooltip="Split a matching pair into two hands"
              disabled={!controller.canSplit() || !controller.canUse("split")}
              id="split"
              onClick={() => controller.split()}
              type="button"
            >
              Split
            </button>
          </>
        )}
        {!playing && (
          <button
            className="primary phase-primary"
            data-tooltip={
              settled
                ? "Prepare the next hand with your previous wager"
                : "Start a hand with your current bet"
            }
            disabled={primaryDisabled}
            id={primaryId}
            onClick={() => controller.primaryAction()}
            type="button"
          >
            {primaryLabel}
          </button>
        )}
      </div>
    </section>
  );
}
