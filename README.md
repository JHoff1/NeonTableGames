# Neon Table Games

A static table games site from Neon Table Games with Blackjack and Mini Baccarat.

## Run Locally

Open `index.html` in a browser, or serve this folder with any static server.

## Host

Upload these files to a static host such as GitHub Pages, Netlify, Vercel, Cloudflare Pages, or an S3/static website bucket:

- `index.html`
- `blackjack/index.html`
- `blackjack-rules/index.html`
- `baccarat/index.html`
- `baccarat-rules/index.html`
- `shared/game-core.js`
- `shared/blackjack-engine.js`
- `shared/baccarat-engine.js`
- `blackjack.css`
- `baccarat.js`
- `baccarat.css`
- `rules.css`
- `styles.css`
- `script.js`
- `favicon.svg`
- `site.webmanifest`
- `robots.txt`
- `sitemap.xml`
- `_redirects`
- `_headers`

## Gameplay

Blackjack includes betting chips, dealer/player hands, 3 to 2 payouts, hit, stand, double down, split pairs, push handling, and automatic deck refresh. Its scoring, action eligibility, dealer rules, and settlement logic live in the independently tested `shared/blackjack-engine.js`.

Mini Baccarat includes Player, Banker, and Tie bets, standard third-card rules, 5% Banker commission, an eight-deck shoe, interactive card reveals, result history, and a guided tutorial.

## QA

Install the test dependencies and Chromium once:

```powershell
npm install
npx playwright install chromium
```

Run linting, formatting checks, unit tests, responsive layout tests, and accessibility checks:

```powershell
npm test
```

The automated suite validates shared versioned storage, Blackjack and Baccarat rules, empty and settled game tables, deterministic tutorials, keyboard card reveals, accessibility, result history, and rules tables across phone, tablet, and desktop viewports. Failure-only screenshots and traces are written to `test-results/`.

The same suite runs automatically in GitHub Actions for pull requests and pushes to `master`.

Use `docs/visual-regression-checklist.md` for the remaining Samsung Internet, Chrome Android, and Safari iOS device spot checks before deploying major layout changes.

## Credits

The favicon uses the Bootstrap Icons `suit-spade-fill` path, licensed under MIT.
