import { useState } from "react";
import { PlayingCard } from "../shared/PlayingCard";
import { GameTutorial } from "../shared/GameTutorial";
import type { BaccaratController } from "./BaccaratController";
import type { BaccaratOutcome, BaccaratState } from "./types";

function Hand({
  canReveal = false,
  cards,
  controller,
  dealt,
  player,
  revealed,
}: {
  canReveal?: boolean;
  cards: BaccaratState["playerCards"];
  controller: BaccaratController;
  dealt: boolean[];
  player?: boolean;
  revealed?: boolean[];
}) {
  return (
    <div className="baccarat-hand" role="group" aria-label={`${player ? "Player" : "Banker"} hand`}>
      {cards.map((card, index) =>
        dealt[index] ? (
          <PlayingCard
            card={card}
            hidden={player && revealed?.[index] === false}
            interactive={player && canReveal && revealed?.[index] === false}
            key={`${card.label}-${card.suitName}-${index}`}
            label={`Flip Player card ${index + 1}`}
            onReveal={() => controller.revealPlayer(index)}
          />
        ) : null,
      )}
    </div>
  );
}

export function BaccaratTable({
  controller,
  state,
}: {
  controller: BaccaratController;
  state: BaccaratState;
}) {
  const [road, setRoad] = useState<"bead" | "big">("bead");
  const bigRoad = controller.road();
  const tutorialComplete =
    state.phase === "settled" && state.tutorial.index === controller.tutorialTotal() - 1;
  return (
    <section
      className={`baccarat-felt ${state.tutorial.active ? "tutorial-active" : ""}`}
      id="baccarat-felt"
      aria-live="polite"
    >
      {state.tutorial.active && (
        <div className="baccarat-tutorial" id="baccarat-tutorial">
          <GameTutorial
            complete={tutorialComplete}
            current={state.tutorial.index + 1}
            instruction={state.tutorial.instruction}
            nextAction={controller.tutorialNextAction()}
            onRestart={() => controller.restartTutorial()}
            strategyHref="../baccarat-rules/index.html"
            total={controller.tutorialTotal()}
            unit="Round"
          />
        </div>
      )}
      <section className="baccarat-hand-zone banker-side" aria-labelledby="banker-heading">
        <div className="baccarat-hand-heading">
          <h2 id="banker-heading">Banker</h2>
          <span className="total" id="banker-total">
            {controller.handTotal(controller.visibleBankerCards())}
          </span>
        </div>
        <Hand cards={state.bankerCards} controller={controller} dealt={state.dealtCards.banker} />
      </section>

      <section className="baccarat-center">
        <div
          className={`baccarat-result ${state.result ?? ""}`}
          hidden={!state.result}
          id="baccarat-result"
        >
          {state.result
            ? `${state.result[0].toUpperCase()}${state.result.slice(1)}${state.result === "tie" ? "" : " Wins"}`
            : ""}
        </div>
        <p id="baccarat-message">{state.message}</p>
        <div className="baccarat-history-wrap">
          <div className="road-tabs" role="tablist" aria-label="Baccarat roads">
            <button
              aria-controls="baccarat-history"
              aria-selected={road === "bead"}
              id="bead-tab"
              onClick={() => setRoad("bead")}
              role="tab"
              type="button"
            >
              Bead Plate
            </button>
            <button
              aria-controls="baccarat-big-road"
              aria-selected={road === "big"}
              id="big-road-tab"
              onClick={() => setRoad("big")}
              role="tab"
              type="button"
            >
              Big Road
            </button>
          </div>
          <div
            className="baccarat-history"
            hidden={road !== "bead"}
            id="baccarat-history"
            role="tabpanel"
          >
            {state.history.map((outcome, index) => (
              <span
                aria-label={`Round ${index + 1}: ${outcome}`}
                className={`history-marker ${outcome}`}
                key={`${outcome}-${index}`}
              >
                {outcome[0].toUpperCase()}
              </span>
            ))}
          </div>
          <div
            className="baccarat-big-road"
            hidden={road !== "big"}
            id="baccarat-big-road"
            role="tabpanel"
          >
            {bigRoad.cells.map(
              (
                cell: {
                  column: number;
                  outcome: BaccaratOutcome;
                  row: number;
                  ties: number;
                },
                index: number,
              ) => (
                <span
                  aria-label={`Road result ${index + 1}: ${cell.outcome}`}
                  className={`big-road-marker ${cell.outcome}`}
                  key={`${cell.column}-${cell.row}`}
                  role="img"
                  style={{ gridColumn: cell.column + 1, gridRow: cell.row + 1 }}
                >
                  {cell.ties > 0 && <small>{cell.ties}</small>}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="baccarat-hand-zone player-side" aria-labelledby="baccarat-player-heading">
        <div className="baccarat-hand-heading">
          <h2 id="baccarat-player-heading">Player</h2>
          <span className="total" id="baccarat-player-total">
            {controller.handTotal(controller.visiblePlayerCards())}
          </span>
        </div>
        <Hand
          canReveal={state.phase === "revealing"}
          cards={state.playerCards}
          controller={controller}
          dealt={state.dealtCards.player}
          player
          revealed={state.revealedPlayer}
        />
      </section>
    </section>
  );
}
