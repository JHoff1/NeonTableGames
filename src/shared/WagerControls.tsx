import type { ReactNode } from "react";

export function ChipTray({
  canBet,
  onAdd,
}: {
  canBet(amount: number): boolean;
  onAdd(amount: number): void;
}) {
  return (
    <div className="chips" aria-label="Bet chips">
      {[5, 25, 100, 500].map((amount) => (
        <button
          className="chip"
          data-baccarat-chip={amount}
          data-chip={amount}
          data-poker-chip={amount}
          disabled={!canBet(amount)}
          key={amount}
          onClick={() => onAdd(amount)}
          type="button"
        >
          <span className="chip-dollar">$</span>
          {amount}
        </button>
      ))}
    </div>
  );
}

export function ActionTray({ children }: { children: ReactNode }) {
  return <div className="actions">{children}</div>;
}
