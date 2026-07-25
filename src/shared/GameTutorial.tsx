import { RotateCcw } from "lucide-react";

export function GameTutorial({
  complete,
  current,
  instruction,
  nextAction,
  onRestart,
  strategyHref,
  total,
  unit,
}: {
  complete: boolean;
  current: number;
  instruction: string;
  nextAction: string;
  onRestart(): void;
  strategyHref: string;
  total: number;
  unit: string;
}) {
  return (
    <aside className="guided-tutorial tutorial-overlay" aria-live="polite">
      <div className="tutorial-heading">
        <strong>
          {complete ? "Tutorial Complete" : `Tutorial ${unit} ${current} of ${total}`}
        </strong>
        <div className="tutorial-links">
          <button onClick={onRestart} type="button">
            <RotateCcw aria-hidden="true" size={13} />
            Restart Tutorial
          </button>
          <a href={strategyHref}>View Strategy</a>
        </div>
      </div>
      <progress
        aria-label={`Tutorial progress: ${current} of ${total}`}
        className="tutorial-progress"
        max={total}
        value={current}
      />
      <p>{instruction}</p>
      <strong className="tutorial-next">Next action: {nextAction}</strong>
    </aside>
  );
}
