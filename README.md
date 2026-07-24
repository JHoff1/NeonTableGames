# Neon Table Games

A static table games site from Neon Table Games. The homepage introduces the site and links to the blackjack game at `/blackjack/`.

## Run Locally

Open `index.html` in a browser, or serve this folder with any static server.

## Host

Upload these files to a static host such as GitHub Pages, Netlify, Vercel, Cloudflare Pages, or an S3/static website bucket:

- `index.html`
- `blackjack/index.html`
- `blackjack-rules/index.html`
- `styles.css`
- `script.js`
- `favicon.svg`
- `site.webmanifest`
- `robots.txt`
- `sitemap.xml`
- `_redirects`
- `_headers`

## Gameplay

The game includes betting chips, dealer/player hands, blackjack payouts, hit, stand, double down, split pairs, push handling, and automatic deck refresh.

## QA

Install the test dependencies and Chromium once:

```powershell
npm install
npx playwright install chromium
```

Run the automated layout checks:

```powershell
npm run test:visual
```

The Playwright suite checks the empty table, a dealt hand, all seven deterministic tutorial hands, the split layout, the final tutorial result, and the strategy tables across phone, tablet, and desktop viewports. Failure-only screenshots and traces are written to `test-results/`.

The same suite runs automatically in GitHub Actions for pull requests and pushes to `master`.

Use `docs/visual-regression-checklist.md` for the remaining Samsung Internet, Chrome Android, and Safari iOS device spot checks before deploying major layout changes.

## Credits

The favicon uses the Bootstrap Icons `suit-spade-fill` path, licensed under MIT.
