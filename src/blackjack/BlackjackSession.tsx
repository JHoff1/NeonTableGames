import { useState } from "react";
import type { BlackjackController } from "./BlackjackController";
import type { BlackjackState } from "./types";
import { GameDialog } from "../shared/GameDialog";

export function BlackjackSession({
  controller,
  state,
}: {
  controller: BlackjackController;
  state: BlackjackState;
}) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const profit = window.NeonSessionFramework.profit(state.session, controller.currentFunds(), {
    disabled: state.tutorial.active,
  });
  const rows = controller.summaryRows();

  return (
    <>
      <section className="game-session" aria-labelledby="blackjack-session-heading">
        <div className="game-session-heading">
          <h2 id="blackjack-session-heading">Session</h2>
          <div className="session-actions">
            <button
              className="secondary"
              disabled={state.tutorial.active}
              id="blackjack-summary"
              onClick={() => setSummaryOpen(true)}
              type="button"
            >
              Summary
            </button>
            <button
              className="secondary"
              disabled={
                state.tutorial.active ||
                state.phase === "playing" ||
                (state.phase === "betting" && state.bet > 0)
              }
              id="blackjack-reset-session"
              onClick={() => controller.resetSession()}
              type="button"
            >
              Reset Session
            </button>
          </div>
        </div>
        <div className="game-session-stats">
          <div>
            <span>Rounds</span>
            <strong id="blackjack-session-rounds">{state.session.rounds}</strong>
          </div>
          <div>
            <span>Wins</span>
            <strong id="blackjack-session-wins">{state.session.wins}</strong>
          </div>
          <div>
            <span>Losses</span>
            <strong id="blackjack-session-losses">{state.session.losses}</strong>
          </div>
          <div>
            <span>Pushes</span>
            <strong id="blackjack-session-pushes">{state.session.pushes}</strong>
          </div>
          <div>
            <span>Blackjacks</span>
            <strong id="blackjack-session-blackjacks">{state.session.blackjacks}</strong>
          </div>
          <div>
            <span>Splits</span>
            <strong id="blackjack-session-splits">{state.session.splits}</strong>
          </div>
          <div>
            <span>Peak</span>
            <strong id="blackjack-session-peak">
              {controller.money(state.session.largestBankroll)}
            </strong>
          </div>
          <div>
            <span>Profit/Loss</span>
            <strong
              className={profit > 0 ? "positive" : profit < 0 ? "negative" : ""}
              id="blackjack-session-profit"
            >
              {controller.money(profit)}
            </strong>
          </div>
        </div>
      </section>

      <GameDialog
        id="blackjack-summary-dialog"
        onClose={() => setSummaryOpen(false)}
        open={summaryOpen}
        title="Blackjack Session"
      >
        <div className="summary-content" id="blackjack-summary-content">
          {rows.map((row) => (
            <div key={row.label}>
              <span>{row.label}</span>
              <strong className={row.className}>{row.value}</strong>
            </div>
          ))}
        </div>
        <button className="primary dialog-done" onClick={() => setSummaryOpen(false)} type="button">
          Done
        </button>
      </GameDialog>
    </>
  );
}
