# Visual Regression Checklist

Run `npm test` before deploying game, layout, or CSS changes. It includes ESLint, Prettier verification, unit tests, Chromium geometry and overflow checks, and automated WCAG A/AA scans for Blackjack and Mini Baccarat. Use this checklist for browser and real-device behavior that desktop emulation cannot fully reproduce.

## Viewports

- 360 x 740: small Android phone
- 390 x 844: iPhone standard width
- 412 x 915: Samsung/large Android portrait
- 768 x 1024: tablet portrait
- 1024 x 768: tablet landscape
- 1366 x 768: laptop
- 1440 x 900: desktop

## Manual Checks

- Disabled controls look disabled but remain readable.
- Chip grid looks balanced at narrow widths.
- Tooltips remain readable near every viewport edge.
- Cards, chips, text, and focus states remain visually clear.
- The full gameplay action tray is visible without scrolling on phone viewports.
- Baccarat does not scroll, refocus, or visibly resize when Deal changes to Next Round or when
  Next Round returns to betting.
- Enabling Sound during a user gesture produces dealing and result cues on the next round.
- Browsers without `navigator.vibrate`, including Safari on iOS, show Haptics as unavailable and
  keep its toggle disabled.
- Session statistics remain below the primary game without covering its controls.

## Browser Spot Checks

- Chrome desktop.
- Chrome Android: complete one round in every game and repeat the manual checks above.
- Samsung Internet: complete one round in every game and repeat the manual checks above.
- Safari iOS: complete one round in every game, enable Sound, and repeat the manual checks above.

Automated Playwright coverage exercises equivalent Chromium, Samsung-sized, and mobile WebKit
viewports. The final three mobile browser checks must still be performed on physical devices because
desktop emulation cannot reproduce mobile browser chrome, iOS audio activation, or vendor-specific
viewport behavior.
