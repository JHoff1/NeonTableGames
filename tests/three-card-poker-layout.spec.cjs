const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.route("https://www.googletagmanager.com/**", (route) => route.abort());
});

async function expectHealthyPokerLayout(page, stateName) {
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
    const rect = (element) => element.getBoundingClientRect();
    const overlaps = (first, second) =>
      Math.min(first.right, second.right) - Math.max(first.left, second.left) > tolerance &&
      Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > tolerance;
    const checkPairs = (firstSelector, secondSelector, label) => {
      [...document.querySelectorAll(firstSelector)].filter(visible).forEach((first) => {
        [...document.querySelectorAll(secondSelector)].filter(visible).forEach((second) => {
          if (first !== second && overlaps(rect(first), rect(second))) issues.push(label);
        });
      });
    };

    if (document.documentElement.scrollWidth > window.innerWidth + tolerance) {
      issues.push(
        `document is ${document.documentElement.scrollWidth - window.innerWidth}px too wide`,
      );
    }
    checkPairs(".dealer-side .card", ".poker-center", "Dealer cards overlap the center");
    checkPairs(".player-side .card", ".poker-center", "Player cards overlap the center");
    checkPairs(".poker-tutorial", ".dealer-side .card", "Tutorial overlaps Dealer cards");
    checkPairs(".poker-felt", ".poker-controls", "Felt overlaps controls");
    checkPairs(".poker-controls", ".game-session", "Controls overlap session");

    const felt = document.querySelector(".poker-felt");
    if (visible(felt)) {
      const feltRect = rect(felt);
      [...document.querySelectorAll(".poker-hand .card")].filter(visible).forEach((card, index) => {
        const cardRect = rect(card);
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

    [...document.querySelectorAll("button")].filter(visible).forEach((button) => {
      const bounds = rect(button);
      if (bounds.left < -tolerance || bounds.right > window.innerWidth + tolerance) {
        issues.push(`button "${button.textContent.trim()}" escapes the viewport`);
      }
      if (button.scrollWidth > button.clientWidth + tolerance) {
        issues.push(`button "${button.textContent.trim()}" clips horizontally`);
      }
    });

    return { issues, viewport: `${window.innerWidth}x${window.innerHeight}` };
  });

  expect(report.issues, `${stateName} at ${report.viewport}`).toEqual([]);
}

async function clickEnabled(page, selector) {
  const button = page.locator(selector);
  await expect(button).toBeEnabled();
  await button.click();
}

test("Three Card Poker supports Play, recovery, previous wagers, and Fold", async ({ page }) => {
  await page.goto("/three-card-poker/");
  await expect(page.locator("#poker-message")).toContainText("Place an Ante");
  await expectHealthyPokerLayout(page, "empty poker table");
  await expect(page.locator(".poker-controls")).toBeInViewport();

  await clickEnabled(page, '[data-poker-chip="25"]');
  await clickEnabled(page, '[data-poker-bet="pairPlus"]');
  await clickEnabled(page, '[data-poker-chip="5"]');
  await expect(page.locator("#poker-bankroll")).toHaveText("$970");
  await expect(page.locator("#poker-ante-stack .poker-stack-chip")).toHaveCount(1);
  await expect(page.locator("#poker-pair-plus-stack .poker-stack-chip")).toHaveCount(1);
  await clickEnabled(page, "#poker-deal");
  await expect(page.locator("#poker-message")).toContainText("Dealing");
  await expect(page.locator("#poker-session-profit")).toHaveText("$0");
  await expect(page.locator("#poker-message")).toContainText("Choose Play or Fold.");
  await expect(page.locator("#poker-message")).not.toContainText("Basic strategy");
  await expect(page.locator("#poker-player-hand .card")).toHaveCount(3);
  await expect(page.locator("#poker-dealer-hand .card.back")).toHaveCount(3);
  await expectHealthyPokerLayout(page, "dealt poker table");
  await expect(page.locator(".poker-controls")).toBeInViewport();

  await page.reload();
  await expect(page.locator("#poker-message")).toContainText("restored");
  await expect(page.locator("#poker-bankroll")).toHaveText("$970");
  await expect(page.locator("#poker-player-hand .card")).toHaveCount(3);
  await clickEnabled(page, "#poker-play");
  await expect(page.locator("#poker-message")).toContainText("Revealing");
  await expect(page.locator("#poker-session-profit")).toHaveText("$0");
  await expect(page.locator("#poker-result")).toBeVisible();
  await expect(page.locator("#poker-dealer-hand .card.back")).toHaveCount(0);
  await expect(page.locator("#poker-session-rounds")).toHaveText("1");
  await expectHealthyPokerLayout(page, "settled poker table");

  await clickEnabled(page, "#poker-next");
  await expect(page.locator("#poker-ante")).toHaveText("$25");
  await expect(page.locator("#poker-pair-plus")).toHaveText("$5");
  await expect(page.locator("#poker-player-hand .card")).toHaveCount(0);
  await clickEnabled(page, "#poker-deal");
  await expect(page.locator("#poker-player-hand .card")).toHaveCount(3);
  await clickEnabled(page, "#poker-fold");
  await expect(page.locator("#poker-result")).toHaveText("Fold");
  await expect(page.locator("#poker-session-rounds")).toHaveText("2");
  await expect(page.locator("#poker-session-folds")).toHaveText("1");

  await clickEnabled(page, "#poker-summary");
  await expect(page.locator("#poker-summary-dialog")).toBeVisible();
  await expect(page.locator("#poker-summary-content")).toContainText("Pair Plus wins");
  await page.locator("#poker-summary-dialog .dialog-done").click();

  await clickEnabled(page, "#poker-new-game");
  await expect(page.locator("#poker-bankroll")).toHaveText("$1,000");
  await expect(page.locator("#poker-session-rounds")).toHaveText("0");
});

test("Player cards can be revealed manually when automatic reveal is disabled", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "neontablegames.settings",
      JSON.stringify({
        autoRevealPlayer: false,
        autoRevealPoker: false,
        haptics: false,
        sound: false,
      }),
    );
  });
  await page.goto("/three-card-poker/?seed=manual-reveal");
  await clickEnabled(page, '[data-poker-chip="25"]');
  await clickEnabled(page, "#poker-deal");
  await expect(page.locator("#poker-message")).toContainText("Tap each face-down");
  await expect(page.locator("#poker-player-hand .reveal-card")).toHaveCount(3);
  await expect(page.locator("#poker-play")).toBeDisabled();
  await page.locator("#poker-player-hand .reveal-card").first().press("Enter");
  await page.locator("#poker-player-hand .reveal-card").first().click();
  await page.locator("#poker-player-hand .reveal-card").first().click();
  await expect(page.locator("#poker-player-hand .reveal-card")).toHaveCount(0);
  await expect(page.locator("#poker-message")).toContainText("Choose Play or Fold.");
  await expect(page.locator("#poker-message")).not.toContainText("Basic strategy");
  await expect(page.locator("#poker-play")).toBeEnabled();
});

test("all scripted Three Card Poker tutorial hands follow the real game flow", async ({ page }) => {
  const actions = ["play", "fold", "play", "play", "play", "play"];
  const results = ["Dealer Does Not Qualify", "Fold", "Win", "Win", "Loss", "Push"];
  await page.goto("/three-card-poker/?tutorial=1");
  await expect(page.locator("#poker-tutorial")).toBeVisible();

  for (let index = 0; index < actions.length; index += 1) {
    await clickEnabled(page, "#poker-deal");
    await expect(page.locator("#poker-message")).toContainText("Basic strategy");
    const actionSelector = actions[index] === "play" ? "#poker-play" : "#poker-fold";
    await clickEnabled(page, actionSelector);
    await expect(page.locator("#poker-result")).toHaveText(results[index]);
    await expect(page.locator("#poker-tutorial")).toContainText(
      index === actions.length - 1 ? "Tutorial complete" : "Click Next Round",
    );
    await expectHealthyPokerLayout(page, `Poker tutorial hand ${index + 1}`);
    if (index < actions.length - 1) await clickEnabled(page, "#poker-next");
  }

  await expect(page.locator("#poker-session-rounds")).toHaveText("0");
  await expect(page.locator("#poker-session-profit")).toHaveText("$0");
  await expect(page.locator("#poker-new-game")).toBeEnabled();
});

test("Three Card Poker rules tables remain contained", async ({ page }) => {
  await page.goto("/three-card-poker-rules/");
  const report = await page.evaluate(() => ({
    documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
    tableCount: document.querySelectorAll(".strategy-table").length,
  }));
  expect(report.documentOverflow).toBeLessThanOrEqual(2);
  expect(report.tableCount).toBe(2);
});
