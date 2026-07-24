const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

test.beforeEach(async ({ page }) => {
  await page.route("https://www.googletagmanager.com/**", (route) => route.abort());
});

test("primary pages have no automated WCAG A or AA violations", async ({ page }) => {
  const paths = [
    "/",
    "/blackjack/",
    "/blackjack-rules/",
    "/baccarat/",
    "/baccarat-rules/",
    "/privacy-policy/",
    "/terms/",
  ];

  for (const path of paths) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const violations = results.violations.map((violation) => ({
      help: violation.help,
      id: violation.id,
      nodes: violation.nodes.map((node) => node.target),
    }));

    expect(violations, `Accessibility violations on ${path}`).toEqual([]);
  }
});
