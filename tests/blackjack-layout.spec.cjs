const { test, expect } = require("@playwright/test");

const tutorialHands = [
  ["#stand"],
  ["#hit", "#stand"],
  ["#split", "#stand", "#stand"],
  ["#double"],
  ["#hit", "#stand"],
  ["#hit", "#stand"],
  ["#stand"],
];

test.beforeEach(async ({ page }) => {
  await page.route("https://www.googletagmanager.com/**", (route) => route.abort());
});

async function expectHealthyGameLayout(page, stateName) {
  const report = await page.evaluate(() => {
    const tolerance = 2;
    const issues = [];
    const visible = (element) => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const rect = (element) => {
      const bounds = element.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        width: bounds.width,
      };
    };
    const overlaps = (first, second) => {
      const horizontal = Math.min(first.right, second.right) - Math.max(first.left, second.left);
      const vertical = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
      return horizontal > tolerance && vertical > tolerance;
    };
    const elements = (selector) => [...document.querySelectorAll(selector)].filter(visible);
    const checkPairs = (firstSelector, secondSelector, label) => {
      const firstElements = elements(firstSelector);
      const secondElements = elements(secondSelector);

      firstElements.forEach((firstElement, firstIndex) => {
        secondElements.forEach((secondElement, secondIndex) => {
          if (firstElement === secondElement) return;
          if (overlaps(rect(firstElement), rect(secondElement))) {
            issues.push(`${label} (${firstIndex + 1}/${secondIndex + 1})`);
          }
        });
      });
    };

    if (document.documentElement.scrollWidth > window.innerWidth + tolerance) {
      issues.push(
        `document is ${document.documentElement.scrollWidth - window.innerWidth}px wider than the viewport`,
      );
    }

    checkPairs(".dealer-zone .card", ".table-rules", "dealer card overlaps table rules");
    checkPairs(".dealer-zone .card", "#message", "dealer card overlaps result message");
    checkPairs(".dealer-zone .card", ".tutorial-overlay", "dealer card overlaps tutorial guidance");
    checkPairs(".player-zone .card", "#message", "player card overlaps result message");
    checkPairs(".player-zone .card", ".tutorial-overlay", "player card overlaps tutorial guidance");
    checkPairs(".felt", ".controls", "table overlaps controls");

    const felt = document.querySelector(".felt");
    if (visible(felt)) {
      const feltRect = rect(felt);
      elements(".player-hand-panel, .dealer-zone .card").forEach((element, index) => {
        const elementRect = rect(element);
        if (
          elementRect.left < feltRect.left - tolerance ||
          elementRect.right > feltRect.right + tolerance ||
          elementRect.top < feltRect.top - tolerance ||
          elementRect.bottom > feltRect.bottom + tolerance
        ) {
          issues.push(`table element ${index + 1} escapes the felt`);
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
      pageHeight: document.documentElement.scrollHeight,
      viewport: { height: window.innerHeight, width: window.innerWidth },
    };
  });

  expect(
    report.issues,
    `${stateName} at ${report.viewport.width}x${report.viewport.height}`,
  ).toEqual([]);
}

async function clickEnabled(page, selector) {
  const control = page.locator(selector);
  await expect(control).toBeEnabled();
  await control.click();
}

test("empty table and a dealt hand keep a stable layout", async ({ page }) => {
  await page.goto("/blackjack/");
  await expect(page.locator("#message")).toHaveText("Place your bet to start a hand.");
  await expectHealthyGameLayout(page, "empty table");

  await clickEnabled(page, '[data-chip="25"]');
  await expectHealthyGameLayout(page, "bet placed");

  await clickEnabled(page, "#deal");
  await expect(page.locator(".dealer-zone .card")).toHaveCount(2);
  await expect(page.locator(".player-zone .card")).toHaveCount(2);
  await expectHealthyGameLayout(page, "initial dealt hand");
});

test("all deterministic tutorial hands avoid overlap", async ({ page }) => {
  await page.goto("/blackjack/?tutorial=1");
  await expect(page.locator(".tutorial-overlay")).toBeVisible();
  await expectHealthyGameLayout(page, "tutorial introduction");

  for (let handIndex = 0; handIndex < tutorialHands.length; handIndex += 1) {
    if (handIndex === 0) {
      await clickEnabled(page, "#deal");
    }
    await expectHealthyGameLayout(page, `tutorial hand ${handIndex + 1} dealt`);

    for (const action of tutorialHands[handIndex]) {
      await clickEnabled(page, action);
      await expectHealthyGameLayout(
        page,
        `tutorial hand ${handIndex + 1} after ${action.slice(1)}`,
      );
    }

    if (handIndex < tutorialHands.length - 1) {
      await clickEnabled(page, "#next-hand");
      await expectHealthyGameLayout(page, `tutorial hand ${handIndex + 2} auto-dealt`);
    }
  }

  await expect(page.locator(".tutorial-overlay")).toContainText("Tutorial complete");
  await expectHealthyGameLayout(page, "tutorial completion");
});

test("strategy tables scroll inside their wrappers on narrow screens", async ({ page }) => {
  await page.goto("/blackjack-rules/");

  const report = await page.evaluate(() => ({
    documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
    tableCount: document.querySelectorAll(".strategy-table-wrap").length,
    overflowingWrappers: [...document.querySelectorAll(".strategy-table-wrap")].filter(
      (wrapper) => wrapper.scrollWidth > wrapper.clientWidth + 2,
    ).length,
    viewportWidth: window.innerWidth,
  }));

  expect(report.documentOverflow, `rules page at ${report.viewportWidth}px`).toBeLessThanOrEqual(2);
  expect(report.tableCount).toBe(3);

  if (report.viewportWidth <= 412) {
    expect(report.overflowingWrappers).toBeGreaterThan(0);
  }
});
