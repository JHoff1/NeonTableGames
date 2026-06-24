# Visual Regression Checklist

Run this checklist before deploying layout or CSS changes.

## Viewports

- 360 x 740: small Android phone
- 390 x 844: iPhone standard width
- 412 x 915: Samsung/large Android portrait
- 768 x 1024: tablet portrait
- 1024 x 768: tablet landscape
- 1366 x 768: laptop
- 1440 x 900: desktop

## Blackjack Table States

- Empty table before betting.
- Bet placed, before deal.
- Initial two-card hand with dealer hole card hidden.
- Player hit to three or more cards.
- Dealer draws to three or more cards.
- Round settled with win message.
- Round settled with push message.
- Split hand with two player panels.
- Tutorial hand after a result message.
- Tutorial final hand completion message.

## Things To Check

- Dealer cards do not overlap the table rules.
- Result or tutorial message does not overlap player cards.
- Player hand panel stays fully inside the felt area.
- Controls are reachable and do not cover the table.
- Disabled controls look disabled but remain readable.
- Chip grid stays balanced at narrow widths.
- Strategy tables scroll horizontally on mobile.
- No horizontal page scroll appears on phone widths.
- Text does not clip inside buttons, stat boxes, or cards.
- Page can scroll vertically on small phones when content needs more height.

## Browser Spot Checks

- Chrome desktop.
- Chrome Android.
- Samsung Internet.
- Safari iOS, when available.
