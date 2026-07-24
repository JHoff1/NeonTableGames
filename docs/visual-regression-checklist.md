# Visual Regression Checklist

Run `npm run test:visual` before deploying layout or CSS changes. The automated suite covers Chromium geometry and overflow checks at representative viewport sizes. Use this checklist for browser and real-device behavior that desktop emulation cannot fully reproduce.

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
- Page scrolling feels natural on small phones.

## Browser Spot Checks

- Chrome desktop.
- Chrome Android.
- Samsung Internet.
- Safari iOS, when available.
