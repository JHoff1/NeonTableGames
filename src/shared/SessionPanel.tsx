import { useState, type ReactNode } from "react";
import { GameDialog } from "./GameDialog";
import type { SummaryRow } from "../blackjack/types";

export function SessionPanel({
  children,
  disabled = false,
  gameId,
  onReset,
  rows,
}: {
  children: ReactNode;
  disabled?: boolean;
  gameId: string;
  onReset(): void;
  rows: SummaryRow[];
}) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  return (
    <>
      <section className="game-session" aria-labelledby={`${gameId}-session-heading`}>
        <div className="game-session-heading">
          <h2 id={`${gameId}-session-heading`}>Session</h2>
          <div className="session-actions">
            <button
              className="secondary"
              disabled={disabled}
              id={`${gameId}-summary`}
              onClick={() => setSummaryOpen(true)}
              type="button"
            >
              Summary
            </button>
            <button
              className="secondary"
              disabled={disabled}
              id={`${gameId}-reset-session`}
              onClick={onReset}
              type="button"
            >
              Reset Session
            </button>
          </div>
        </div>
        {children}
      </section>
      <GameDialog
        id={`${gameId}-summary-dialog`}
        onClose={() => setSummaryOpen(false)}
        open={summaryOpen}
        title="Session Summary"
      >
        <div className="summary-content" id={`${gameId}-summary-content`}>
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
