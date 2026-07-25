import type { ReactNode } from "react";
import { RotateCcw, Settings } from "lucide-react";

interface StatusItem {
  id?: string;
  label: string;
  value: string;
}

interface GameShellProps {
  children: ReactNode;
  controls: ReactNode;
  eyebrow: string;
  gameId: string;
  onNewGame(): void;
  onOpenSettings(): void;
  rulesHref: string;
  session: ReactNode;
  status: StatusItem[];
  tutorialActive?: boolean;
}

export function GameShell({
  children,
  controls,
  eyebrow,
  gameId,
  onNewGame,
  onOpenSettings,
  rulesHref,
  session,
  status,
  tutorialActive = false,
}: GameShellProps) {
  return (
    <main className={`table-shell react-table-shell ${tutorialActive ? "tutorial-mode" : ""}`}>
      <section className="game-viewport">
        <header className="game-top game-header" aria-label="Game status">
          <div className="title-block">
            <nav className="game-switcher" aria-label="Game navigation">
              <a href="../index.html">All Games</a>
              <a href={rulesHref}>Rules</a>
              <button id={`${gameId}-settings`} type="button" onClick={onOpenSettings}>
                <Settings aria-hidden="true" size={16} />
                <span>Settings</span>
              </button>
            </nav>
            <div className="game-title-row">
              <div>
                <p className="eyebrow">{eyebrow}</p>
                <h1>
                  <a className="title-home-link" href="../index.html">
                    Neon Table Games
                  </a>
                </h1>
              </div>
              <button
                aria-label="New Game"
                id={gameId === "blackjack" ? "new-game" : `${gameId}-new-game`}
                className="secondary top-reset"
                data-tooltip="Reset the table and restore your starting bankroll"
                onClick={onNewGame}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={18} />
                <span>New Game</span>
              </button>
            </div>
          </div>
        </header>

        <div className="top-status">
          <div className="stats">
            {status.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong id={item.id}>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {children}
        {controls}
      </section>
      {session}
    </main>
  );
}
