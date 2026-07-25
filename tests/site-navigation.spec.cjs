const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.route("https://www.googletagmanager.com/**", (route) => route.abort());
});

test("game catalog exposes all complete game journeys", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('script[src="shared/error-monitoring.js"]')).toHaveCount(1);
  expect(await page.evaluate(() => typeof window.NeonErrorMonitoring)).toBe("object");
  await expect(page.locator(".game-link")).toHaveCount(3);
  await expect(page.locator(".catalog-preview")).toHaveCount(3);

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
    "three-card-poker/index.html",
    "three-card-poker/index.html?tutorial=1",
    "three-card-poker-rules/index.html",
  ]);
});

test("game pages share the same header structure", async ({ page }) => {
  for (const path of ["/blackjack/", "/baccarat/", "/three-card-poker/"]) {
    await page.goto(path);
    await expect(page.locator("header.game-top")).toHaveCount(1);
    await expect(page.locator(".game-top .title-block")).toHaveCount(1);
    await expect(page.locator(".game-top .game-switcher")).toHaveCount(1);
    await expect(page.locator(".game-top .top-status .stats")).toHaveCount(1);
    await expect(page.locator(".game-top .top-reset")).toHaveCount(1);
  }
});

test("rules pages expose the same links to every game", async ({ page }) => {
  const expectedLinks = [
    "../index.html",
    "../blackjack/index.html",
    "../baccarat/index.html",
    "../three-card-poker/index.html",
  ];
  for (const path of ["/blackjack-rules/", "/baccarat-rules/", "/three-card-poker-rules/"]) {
    await page.goto(path);
    await expect(page.locator(".rules-nav")).toHaveAttribute("aria-label", "Rules navigation");
    expect(
      await page
        .locator(".rules-nav a")
        .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
    ).toEqual(expectedLinks);
  }
});

test("seeded game URLs show a copyable debug indicator", async ({ page }) => {
  for (const path of ["/blackjack/", "/baccarat/", "/three-card-poker/"]) {
    await page.goto(`${path}?seed=replay-report-42`);
    await expect(page.locator(".seed-debug")).toContainText("Seed: replay-report-42");
    await expect(page.locator(".seed-debug button")).toHaveAccessibleName(
      "Copy debug seed replay-report-42",
    );
  }
});

test("every tutorial has shared progress, restart, and strategy navigation", async ({ page }) => {
  const tutorials = [
    ["/blackjack/?tutorial=1", "../blackjack-rules/index.html#strategy-chart-title"],
    ["/baccarat/?tutorial=1", "../baccarat-rules/index.html"],
    ["/three-card-poker/?tutorial=1", "../three-card-poker-rules/index.html#strategy-title"],
  ];
  for (const [path, strategyHref] of tutorials) {
    await page.goto(path);
    await expect(page.locator(".guided-tutorial .tutorial-progress")).toHaveCount(1);
    await expect(page.locator('.guided-tutorial button:has-text("Restart Tutorial")')).toHaveCount(
      1,
    );
    await expect(page.locator('.guided-tutorial a:has-text("View Strategy")')).toHaveAttribute(
      "href",
      strategyHref,
    );
    await page.locator('.guided-tutorial button:has-text("Restart Tutorial")').click();
    await expect(page.locator(".guided-tutorial .tutorial-progress")).toHaveCount(1);
  }
});
