const { test, expect } = require("@playwright/test");

const paths = [
  "/",
  "/blackjack/",
  "/blackjack-rules/",
  "/baccarat/",
  "/baccarat-rules/",
  "/three-card-poker/",
  "/three-card-poker-rules/",
  "/privacy-policy/",
  "/terms/",
];

test("production pages, assets, canonicals, and sitemap are healthy", async ({ page, request }) => {
  for (const path of paths) {
    const failedAssets = [];
    const handleResponse = (response) => {
      const url = new URL(response.url());
      if (
        url.origin === "https://neontablegames.com" &&
        ["script", "stylesheet"].includes(response.request().resourceType()) &&
        !response.ok()
      ) {
        failedAssets.push(`${response.status()} ${url.pathname}`);
      }
    };
    page.on("response", handleResponse);
    const response = await page.goto(path, { waitUntil: "networkidle" });
    expect(response?.ok(), `${path} should return a successful document`).toBe(true);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://neontablegames.com${path}`,
    );
    expect(failedAssets, `${path} should load its local scripts and styles`).toEqual([]);
    page.off("response", handleResponse);
  }

  const sitemapResponse = await request.get("/sitemap.xml");
  expect(sitemapResponse.ok()).toBe(true);
  const sitemap = await sitemapResponse.text();
  for (const path of paths) {
    expect(sitemap).toContain(`<loc>https://neontablegames.com${path}</loc>`);
  }

  const versionResponse = await request.get("/deployment-version.json");
  expect(versionResponse.ok()).toBe(true);
  const version = await versionResponse.json();
  expect(version.revision).toMatch(/^[a-f0-9]{40}$/);
});
