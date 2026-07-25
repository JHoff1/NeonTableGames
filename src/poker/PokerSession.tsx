import { SessionPanel } from "../shared/SessionPanel";
import type { PokerController } from "./PokerController";
import type { PokerState } from "./types";

export function PokerSession({
  controller,
  state,
}: {
  controller: PokerController;
  state: PokerState;
}) {
  const profit = controller.sessionProfit();
  return (
    <SessionPanel
      disabled={controller.sessionActionsDisabled()}
      gameId="poker"
      onReset={() => controller.resetSession()}
      rows={controller.summaryRows()}
    >
      <div className="game-session-stats session-columns-6">
        <div>
          <span>Rounds</span>
          <strong id="poker-session-rounds">{state.session.rounds}</strong>
        </div>
        <div>
          <span>Wins</span>
          <strong id="poker-session-wins">{state.session.wins}</strong>
        </div>
        <div>
          <span>Losses</span>
          <strong id="poker-session-losses">{state.session.losses}</strong>
        </div>
        <div>
          <span>Pushes</span>
          <strong id="poker-session-pushes">{state.session.pushes}</strong>
        </div>
        <div>
          <span>Folds</span>
          <strong id="poker-session-folds">{state.session.folds}</strong>
        </div>
        <div>
          <span>Profit/Loss</span>
          <strong
            className={profit > 0 ? "positive" : profit < 0 ? "negative" : ""}
            id="poker-session-profit"
          >
            {controller.money(profit)}
          </strong>
        </div>
      </div>
    </SessionPanel>
  );
}
