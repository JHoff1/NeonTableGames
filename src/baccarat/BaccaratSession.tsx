import { SessionPanel } from "../shared/SessionPanel";
import type { BaccaratController } from "./BaccaratController";

export function BaccaratSession({ controller }: { controller: BaccaratController }) {
  const summary = controller.sessionSummary();
  const profit = summary.profit;
  return (
    <SessionPanel
      disabled={controller.sessionActionsDisabled()}
      gameId="baccarat"
      onReset={() => controller.resetSession()}
      rows={controller.summaryRows()}
    >
      <div className="game-session-stats session-columns-7">
        <div>
          <span>Rounds</span>
          <strong id="session-rounds">{summary.rounds}</strong>
        </div>
        <div>
          <span>Player</span>
          <strong id="session-player-wins">{summary.playerWins}</strong>
        </div>
        <div>
          <span>Banker</span>
          <strong id="session-banker-wins">{summary.bankerWins}</strong>
        </div>
        <div>
          <span>Ties</span>
          <strong id="session-ties">{summary.ties}</strong>
        </div>
        <div>
          <span>Streak</span>
          <strong id="session-streak">
            {summary.streakCount
              ? `${summary.streakResult[0].toUpperCase()}${summary.streakResult.slice(1)} x${summary.streakCount}`
              : "-"}
          </strong>
        </div>
        <div>
          <span>Peak</span>
          <strong id="session-peak">{controller.money(summary.largestBankroll)}</strong>
        </div>
        <div>
          <span>Profit/Loss</span>
          <strong
            className={profit > 0 ? "positive" : profit < 0 ? "negative" : ""}
            id="session-profit"
          >
            {controller.money(profit)}
          </strong>
        </div>
      </div>
    </SessionPanel>
  );
}
