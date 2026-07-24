const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.route("https://www.googletagmanager.com/**", (route) => route.abort());
});

async function expectHealthyBaccaratLayout(page, stateName) {
  const report = await page.evaluate(() => {
    const tolerance = 2;
    const issues = [];
    const visible = (element) => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        bounds.width > 0 &&
        bounds.height > 0
      );
    };
    const rect = (element) => {
      const bounds = element.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
      };
    };
    const overlaps = (first, second) =>
      Math.min(first.right, second.right) - Math.max(first.left, second.left) > tolerance &&
      Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > tolerance;
    const elements = (selector) => [...document.querySelectorAll(selector)].filter(visible);
    const checkPairs = (firstSelector, secondSelector, label) => {
      elements(firstSelector).forEach((first, firstIndex) => {
        elements(secondSelector).forEach((second, secondIndex) => {
          if (first !== second && overlaps(rect(first), rect(second))) {
            issues.push(`${label} (${firstIndex + 1}/${secondIndex + 1})`);
          }
        });
      });
    };

    if (document.documentElement.scrollWidth > window.innerWidth + tolerance) {
      issues.push(
        `document is ${document.documentElement.scrollWidth - window.innerWidth}px too wide`,
      );
    }

    checkPairs(".banker-side .card", ".baccarat-center", "Banker card overlaps center");
    checkPairs(".player-side .card", ".baccarat-center", "Player card overlaps center");
    checkPairs(".baccarat-tutorial", ".banker-side .card", "Tutorial overlaps Banker cards");
    checkPairs(".baccarat-felt", ".baccarat-controls", "Felt overlaps controls");

    const felt = document.querySelector(".baccarat-felt");
    if (visible(felt)) {
      const feltRect = rect(felt);
      elements(".baccarat-hand .card").forEach((cardElement, index) => {
        const cardRect = rect(cardElement);
        if (
          cardRect.left < feltRect.left - tolerance ||
          cardRect.right > feltRect.right + tolerance ||
          cardRect.top < feltRect.top - tolerance ||
          cardRect.bottom > feltRect.bottom + tolerance
        ) {
          issues.push(`card ${index + 1} escapes the felt`);
        }
      });
    }

    elements("button").forEach((button) => {
      const buttonRect = rect(button);
      const label = button.textContent.trim().replace(/\s+/g, " ");
      if (buttonRect.left < -tolerance || buttonRect.right > window.innerWidth + tolerance) {
        issues.push(`button "${label}" escapes the viewport`);
      }
      if (button.scrollWidth > button.clientWidth + tolerance) {
        issues.push(`button "${label}" clips horizontally`);
      }
      if (button.scrollHeight > button.clientHeight + tolerance) {
        issues.push(`button "${label}" clips vertically`);
      }
    });

    return {
      issues,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };
  });

  expect(report.issues, `${stateName} at ${report.viewport}`).toEqual([]);
}

async function clickEnabled(page, selector) {
  const control = page.locator(selector);
  await expect(control).toBeEnabled();
  await control.click();
}

async function revealAllBaccaratCards(page) {
  const initialCardCount = await page.locator(".reveal-card").count();
  expect(initialCardCount).toBeGreaterThanOrEqual(4);
  expect(initialCardCount).toBeLessThanOrEqual(6);

  await page.locator(".reveal-card").first().focus();
  await page.locator(".reveal-card").first().press("Enter");

  while (await page.locator(".reveal-card").count()) {
    await page.locator(".reveal-card").first().click();
  }
}

test("Baccarat betting and settlement keep a stable layout", async ({ page }) => {
  await page.goto("/baccarat/");
  await expect(page.locator("#baccarat-message")).toContainText("Choose Player");
  await expectHealthyBaccaratLayout(page, "empty Baccarat table");

  await clickEnabled(page, '[data-bet-type="banker"]');
  await clickEnabled(page, '[data-baccarat-chip="25"]');
  await expectHealthyBaccaratLayout(page, "Banker bet placed");

  await clickEnabled(page, "#baccarat-deal");
  await expect(page.locator("#baccarat-result")).toBeHidden();
  await expect(page.locator("#baccarat-message")).toContainText("Flip");
  await revealAllBaccaratCards(page);
  await expect(page.locator("#baccarat-result")).toBeVisible();
  const dealtCardCount = await page.locator(".baccarat-hand .card").count();
  expect(dealtCardCount).toBeGreaterThanOrEqual(4);
  expect(dealtCardCount).toBeLessThanOrEqual(6);
  await expectHealthyBaccaratLayout(page, "settled Baccarat round");

  const completedBankroll = await page.locator("#baccarat-bankroll").textContent();
  await page.reload();
  await expect(page.locator("#baccarat-bankroll")).toHaveText(completedBankroll);
  await expectHealthyBaccaratLayout(page, "restored Baccarat bankroll");

  await clickEnabled(page, "#baccarat-new-game");
  await expect(page.locator("#baccarat-bankroll")).toHaveText("$1,000");

  await clickEnabled(page, '[data-baccarat-chip="25"]');
  await clickEnabled(page, "#baccarat-deal");
  await revealAllBaccaratCards(page);
  await clickEnabled(page, "#baccarat-next");
  await expectHealthyBaccaratLayout(page, "next Baccarat round");
});

test("all guided Baccarat rounds avoid overlap", async ({ page }) => {
  await page.goto("/baccarat/?tutorial=1");
  await expect(page.locator("#baccarat-tutorial")).toBeVisible();
  await expectHealthyBaccaratLayout(page, "Baccarat tutorial introduction");

  for (let roundIndex = 0; roundIndex < 3; roundIndex += 1) {
    await clickEnabled(page, "#baccarat-deal");
    await revealAllBaccaratCards(page);
    await expect(page.locator("#baccarat-result")).toBeVisible();
    await expectHealthyBaccaratLayout(page, `Baccarat tutorial round ${roundIndex + 1}`);

    if (roundIndex < 2) {
      await clickEnabled(page, "#baccarat-next");
      await expectHealthyBaccaratLayout(page, `Baccarat tutorial round ${roundIndex + 2} ready`);
    }
  }

  await expect(page.locator("#baccarat-tutorial")).toContainText("Tutorial complete");
  await expect(page.locator("#baccarat-new-game")).toBeEnabled();
});

test("Baccarat rules tables remain contained", async ({ page }) => {
  await page.goto("/baccarat-rules/");
  const report = await page.evaluate(() => ({
    documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
    tableCount: document.querySelectorAll(".strategy-table").length,
  }));

  expect(report.documentOverflow).toBeLessThanOrEqual(2);
  expect(report.tableCount).toBe(2);
});
