import type { Card } from "../blackjack/types";

export function PlayingCard({
  card,
  hidden = false,
  interactive = false,
  label,
  onReveal,
}: {
  card: Card;
  hidden?: boolean;
  interactive?: boolean;
  label?: string;
  onReveal?(): void;
}) {
  const activate = () => {
    if (interactive) onReveal?.();
  };

  return (
    <article
      aria-label={
        interactive ? label : hidden ? "Hidden card" : `${card.label} of ${card.suitName}`
      }
      className={`card ${hidden ? "back" : card.color} ${interactive ? "reveal-card" : ""}`}
      onClick={activate}
      onKeyDown={(event) => {
        if (interactive && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          activate();
        }
      }}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
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
