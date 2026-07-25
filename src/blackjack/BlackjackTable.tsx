import type { CSSProperties, ReactNode } from "react";
import type { BlackjackHand, Card } from "./types";

interface CardViewProps {
  card: Card;
  hidden?: boolean;
}

function CardView({ card, hidden = false }: CardViewProps) {
  return (
    <article
      aria-label={hidden ? "Hidden card" : `${card.label} of ${card.suitName}`}
      className={`card ${hidden ? "back" : card.color === "red" ? "red" : ""}`}
    >
      {!hidden && (
        <>
          <span className="rank">{card.label}</span>
          <span className="suit" dangerouslySetInnerHTML={{ __html: card.suit }} />
          <span className="corner">{card.label}</span>
        </>
      )}
    </article>
  );
}

function ChipStack({ chips, limit = 10 }: { chips: number[]; limit?: number }) {
  const visible = chips.slice(-limit);
  return (
    <div className={`table-bet-stack ${visible.length ? "has-chips" : ""}`}>
      {visible.map((amount, index) => (
        <span
          className="stack-chip"
          data-chip={amount}
          key={`${amount}-${index}`}
          style={{ "--stack-index": index } as CSSProperties}
        >
          <span className="chip-label">
            <span className="chip-dollar">$</span>
            {amount}
          </span>
        </span>
      ))}
    </div>
  );
}

interface BlackjackTableProps {
  activeHand: number;
  betChips: number[];
  dealer: Card[];
  dealerTotal: string;
  handLabel(cards: Card[]): string;
  hands: BlackjackHand[];
  message: string;
  phase: string;
  playerTotal: string;
  revealDealer: boolean;
  tutorial?: ReactNode;
  tutorialActive?: boolean;
}

export function BlackjackTable({
  activeHand,
  betChips,
  dealer,
  dealerTotal,
  handLabel,
  hands,
  message,
  phase,
  playerTotal,
  revealDealer,
  tutorial,
  tutorialActive = false,
}: BlackjackTableProps) {
  return (
    <section
      className={`felt ${hands.length > 1 ? "has-split-hands" : ""} ${tutorialActive ? "tutorial-active" : ""}`}
      aria-live="polite"
    >
      {tutorial}
      <div className="dealer-zone hand-zone">
        <div className="zone-header">
          <h2>Dealer</h2>
          <span id="dealer-total" className="total">
            {dealerTotal}
          </span>
        </div>
        <div id="dealer-hand" className="hand">
          {dealer.map((card, index) => (
            <CardView
              card={card}
              hidden={!revealDealer && index === 1}
              key={`${card.label}-${index}`}
            />
          ))}
        </div>
        <div className="table-rules" aria-label="Table rules">
          <span>Blackjack pays 3 to 2</span>
          <span>Dealer hits soft 17</span>
        </div>
      </div>

      <div className="message-row">
        <div className="table-message-overlay">
          {hands.length === 0 && <ChipStack chips={betChips} />}
          <p id="message">{message}</p>
        </div>
      </div>

      <div className={`player-zone hand-zone ${hands.length > 1 ? "has-split-hands" : ""}`}>
        <div className="zone-header">
          <h2 id="player-heading">Player</h2>
          <span id="player-total" className="total">
            {playerTotal}
          </span>
        </div>
        <div id="player-hand" className="player-hands">
          {hands.length === 0 && <div className="empty-hand">No hand dealt</div>}
          {hands.map((hand, index) => {
            const active = phase === "playing" && index === activeHand;
            return (
              <article className={`player-hand-panel ${active ? "active" : ""}`} key={index}>
                <div className="hand-meta">
                  <span>{hands.length > 1 ? `Hand ${index + 1}` : "Player"}</span>
                  <strong>{handLabel(hand.cards)}</strong>
                </div>
                <div className="hand-chip-rail">
                  <ChipStack chips={chipsFor(hand.bet)} limit={4} />
                </div>
                <div className="hand">
                  {hand.cards.map((card, cardIndex) => (
                    <CardView card={card} key={`${card.label}-${cardIndex}`} />
                  ))}
                </div>
                <div className="hand-footer">
                  <span>${hand.bet}</span>
                  <strong>{active ? "Active" : hand.result || hand.status}</strong>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function chipsFor(amount: number) {
  const chips: number[] = [];
  let remaining = amount;
  for (const chip of [500, 100, 25, 5]) {
    while (remaining >= chip) {
      chips.push(chip);
      remaining -= chip;
    }
  }
  return chips.length ? chips : [amount];
}
