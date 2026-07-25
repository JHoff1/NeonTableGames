# Neon Table Games

A static table games site from Neon Table Games with Blackjack, Mini Baccarat, and Three Card Poker.

## Run Locally

Open `index.html` in a browser, or serve this folder with any static server.

## Host

Upload these files to a static host such as GitHub Pages, Netlify, Vercel, Cloudflare Pages, or an S3/static website bucket:

- `index.html`
- `blackjack/index.html`
- `blackjack/tutorial-data.js`
- `blackjack-rules/index.html`
- `baccarat/index.html`
- `baccarat/session.js`
- `baccarat/tutorial-data.js`
- `baccarat-rules/index.html`
- `three-card-poker/index.html`
- `three-card-poker/tutorial-data.js`
- `three-card-poker-rules/index.html`
- `shared/game-core.js`
- `shared/error-monitoring.js`
- `shared/game-settings.js`
- `shared/session-framework.js`
- `shared/tutorial-ui.js`
- `shared/blackjack-engine.js`
- `shared/baccarat-engine.js`
- `shared/three-card-poker-engine.js`
- `blackjack.css`
- `baccarat.js`
- `baccarat.css`
- `three-card-poker.js`
- `three-card-poker.css`
- `rules.css`
- `styles.css`
- `script.js`
- `favicon.svg`
- `site.webmanifest`
- `robots.txt`
- `sitemap.xml`
- `_redirects`
- `_headers`
- `netlify.toml`

## Gameplay

Blackjack includes betting chips, dealer/player hands, 3 to 2 payouts, hit, stand, double down, split pairs, push handling, Rebet & Deal, unfinished-round recovery, automatic deck refresh, and persistent session statistics.

Mini Baccarat includes Player, Banker, and Tie bets, Rebet & Deal, standard third-card rules, 5% Banker commission, cut-card shoe status, sequential dealing, automatic Banker reveals, optional automatic Player reveals, Bead Plate and Big Road views, unfinished-round recovery, persistent session statistics, session summaries, and a guided tutorial. Sound and haptic preferences are shared with Blackjack.

Three Card Poker includes Ante and Play wagers, optional Pair Plus, contextual Q-6-4 strategy guidance, sequential dealing and Dealer reveals, optional tap-to-reveal Player cards, visible felt wagers, dealer qualification, Ante Bonus and Pair Plus paytables, Rebet & Deal, unfinished-round recovery, persistent session statistics, a session summary, and a deterministic tutorial.

Add a `seed` query parameter to any game URL to replay its card sequence during debugging, for example `/blackjack/?seed=failed-test-42`. Seeded pages show a debug badge with a copy button.

Saved games synchronize across tabs. Idle tabs load newer state automatically; a tab with an active wager or round displays a blocking reload prompt so it cannot overwrite newer progress.

Production JavaScript and asset failures are sent to a rate-limited first-party Netlify Function. Reports are scrubbed and exclude query values, game state, wagers, cards, user input, and persistent identifiers.

## QA

Install the test dependencies and browser engines once:

```powershell
npm install
npx playwright install chromium firefox webkit
```

Run linting, formatting checks, unit tests, responsive layout tests, and accessibility checks:

```powershell
npm test
```

The automated suite validates shared versioned storage and preferences, cross-tab conflicts, all three payout engines, thousands of seeded simulation rounds, unfinished-round recovery, road calculations, empty and settled game tables, deterministic tutorials, keyboard card reveals, accessibility, result history, and rules tables in Chromium, Firefox, and WebKit across phone, tablet, and desktop viewports. Failure-only screenshots and traces are written to `test-results/`.

The same suite runs automatically in GitHub Actions for pull requests and pushes to `master`.

Production smoke tests wait until Netlify reports the exact deployed Git revision, then run against the live site. They also run daily and can be started manually:

```powershell
npm run test:production
```

Run the mobile Lighthouse performance budgets locally:

```powershell
npm run test:performance
```

Lighthouse enforces minimum performance, accessibility, best-practices, and SEO scores along with limits for first contentful paint, largest contentful paint, total blocking time, and cumulative layout shift.

Use `docs/visual-regression-checklist.md` for the remaining Samsung Internet, Chrome Android, and Safari iOS device spot checks before deploying major layout changes.

## Credits

The favicon uses the Bootstrap Icons `suit-spade-fill` path, licensed under MIT.
