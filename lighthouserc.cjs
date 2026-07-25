module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      settings: {
        chromeFlags: "--headless --no-sandbox",
        formFactor: "mobile",
        screenEmulation: {
          deviceScaleFactor: 2.625,
          disabled: false,
          height: 844,
          mobile: true,
          width: 390,
        },
      },
      startServerCommand: "node tests/helpers/static-server.cjs 4174",
      startServerReadyPattern: "Static test server listening",
      url: [
        "http://127.0.0.1:4174/",
        "http://127.0.0.1:4174/blackjack/",
        "http://127.0.0.1:4174/baccarat/",
        "http://127.0.0.1:4174/three-card-poker/",
      ],
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:performance": ["error", { minScore: 0.75 }],
        "categories:seo": ["error", { minScore: 0.9 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "first-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 3500 }],
        "total-blocking-time": ["error", { maxNumericValue: 350 }],
      },
    },
    upload: {
      outputDir: "lighthouse-report",
      target: "filesystem",
    },
  },
};
