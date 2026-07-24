const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.route("https://www.googletagmanager.com/**", (route) => route.abort());
});

test("game catalog exposes both complete game journeys", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".game-link")).toHaveCount(2);

  const report = await page.evaluate(() => ({
    documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
    links: [...document.querySelectorAll(".game-actions a")].map((link) =>
      link.getAttribute("href"),
    ),
  }));

  expect(report.documentOverflow).toBeLessThanOrEqual(2);
  expect(report.links).toEqual([
    "blackjack/index.html",
    "blackjack/index.html?tutorial=1",
    "blackjack-rules/index.html",
    "baccarat/index.html",
    "baccarat/index.html?tutorial=1",
    "baccarat-rules/index.html",
  ]);
});

test("game pages share the same header structure", async ({ page }) => {
  for (const path of ["/blackjack/", "/baccarat/"]) {
    await page.goto(path);
    await expect(page.locator("header.game-top")).toHaveCount(1);
    await expect(page.locator(".game-top .title-block")).toHaveCount(1);
    await expect(page.locator(".game-top .game-switcher")).toHaveCount(1);
    await expect(page.locator(".game-top .top-status .stats")).toHaveCount(1);
    await expect(page.locator(".game-top .top-reset")).toHaveCount(1);
  }
});
