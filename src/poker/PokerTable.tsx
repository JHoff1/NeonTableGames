import { GameTutorial } from "../shared/GameTutorial";
import { PlayingCard } from "../shared/PlayingCard";
import type { PokerController } from "./PokerController";
import type { Card, PokerState } from "./types";

function PokerHand({
  cards,
  controller,
  dealt,
  revealed,
  side,
}: {
  cards: Card[];
  controller: PokerController;
  dealt: boolean[];
  revealed: boolean[];
  side: "player" | "dealer";
}) {
  return (
    <div className="poker-hand" id={`poker-${side}-hand`} role="group" aria-label={`${side} hand`}>
      {cards.map((card, index) =>
        dealt[index] ? (
          <PlayingCard
            card={card}
            hidden={!revealed[index]}
            interactive={side === "player" && !revealed[index]}
            key={`${card.label}-${card.suitName}-${index}`}
            label={`Reveal Player card ${index + 1}`}
            onReveal={() => controller.revealPlayer(index)}
          />
        ) : null,
      )}
    </div>
  );
}

function ChipStack({ chips, id }: { chips: number[]; id: string }) {
  return (
    <div className="poker-chip-stack" id={id}>
      {chips.slice(-5).map((chip, index) => (
        <span className="poker-stack-chip" key={`${chip}-${index}`}>
          ${chip}
        </span>
      ))}
    </div>
  );
}

export function PokerTable({
  controller,
  state,
}: {
  controller: PokerController;
  state: PokerState;
}) {
  const playerVisible = state.playerRevealed.every(Boolean);
  const dealerVisible = state.dealerRevealed.every(Boolean);
  const complete =
    state.phase === "settled" && state.tutorial.index === controller.tutorialTotal() - 1;
  return (
    <section
      className={`poker-felt ${state.tutorial.active ? "tutorial-active" : ""}`}
      id="poker-felt"
      aria-live="polite"
    >
      {state.tutorial.active && (
        <div className="poker-tutorial" id="poker-tutorial">
          <GameTutorial
            complete={complete}
            current={state.tutorial.index + 1}
            instruction={state.tutorial.instruction}
            nextAction={controller.tutorialNextAction()}
            onRestart={() => controller.restartTutorial()}
            strategyHref="../three-card-poker-rules/index.html#strategy-title"
            total={controller.tutorialTotal()}
            unit="Hand"
          />
        </div>
      )}
      <section className="poker-hand-zone dealer-side" aria-labelledby="poker-dealer-heading">
        <div className="poker-hand-heading">
          <h2 id="poker-dealer-heading">Dealer</h2>
          <span className="hand-rank" id="poker-dealer-rank">
            {controller.rank(state.dealerCards, dealerVisible)}
          </span>
        </div>
        <PokerHand
          cards={state.dealerCards}
          controller={controller}
          dealt={state.dealtCards.dealer}
          revealed={state.dealerRevealed}
          side="dealer"
        />
      </section>
      <section className="poker-center">
        <div className="poker-result" hidden={!state.result} id="poker-result">
          {state.result}
        </div>
        <p id="poker-message">{state.message}</p>
        <div className="poker-wager-spots" aria-label="Wagers on the table">
          <div className="poker-wager-spot">
            <span>Ante</span>
            <ChipStack chips={state.anteChips} id="poker-ante-stack" />
          </div>
          <div className="poker-wager-spot play-spot">
            <span>Play</span>
            <ChipStack chips={state.play ? [state.play] : []} id="poker-play-stack" />
          </div>
          <div className="poker-wager-spot pair-plus-spot">
            <span>Pair Plus</span>
            <ChipStack chips={state.pairPlusChips} id="poker-pair-plus-stack" />
          </div>
        </div>
      </section>
      <section className="poker-hand-zone player-side" aria-labelledby="poker-player-heading">
        <div className="poker-hand-heading">
          <h2 id="poker-player-heading">Player</h2>
          <span className="hand-rank" id="poker-player-rank">
            {controller.rank(state.playerCards, playerVisible)}
          </span>
        </div>
        <PokerHand
          cards={state.playerCards}
          controller={controller}
          dealt={state.dealtCards.player}
          revealed={state.playerRevealed}
          side="player"
        />
      </section>
    </section>
  );
}
