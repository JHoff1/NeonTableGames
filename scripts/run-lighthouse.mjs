import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const host = "127.0.0.1";
const port = 4174;
const baseUrl = `http://${host}:${port}`;
const routes = ["/", "/blackjack/", "/baccarat/", "/three-card-poker/"];
const samples = 3;
const reportDirectory = resolve("lighthouse-report");
const profileDirectory = resolve(".lighthouse-profile");

const categoryMinimums = {
  accessibility: 0.95,
  "best-practices": 0.9,
  performance: 0.75,
  seo: 0.9,
};

const auditMaximums = {
  "cumulative-layout-shift": 0.1,
  "first-contentful-paint": 2500,
  "largest-contentful-paint": 3500,
  "total-blocking-time": 350,
};

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

async function waitForServer(server) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error("Vite preview stopped before it became ready.");
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The preview server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`Vite preview did not become ready at ${baseUrl}.`);
}

function routeName(route) {
  return route === "/" ? "home" : route.replaceAll("/", "");
}

const server = spawn(
  process.execPath,
  [
    resolve("node_modules/vite/bin/vite.js"),
    "preview",
    "--host",
    host,
    "--port",
    String(port),
    "--strictPort",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);

server.stderr.on("data", (chunk) => process.stderr.write(chunk));

let chrome;
let exitCode = 0;

try {
  await waitForServer(server);
  await rm(reportDirectory, { force: true, recursive: true });
  await rm(profileDirectory, { force: true, recursive: true });
  await mkdir(reportDirectory, { recursive: true });
  await mkdir(profileDirectory, { recursive: true });

  chrome = await launch({
    chromeFlags: ["--headless=new", "--no-sandbox"],
    userDataDir: profileDirectory,
  });

  const failures = [];
  for (const route of routes) {
    const results = [];
    for (let sample = 1; sample <= samples; sample += 1) {
      process.stdout.write(`Auditing ${route} (${sample}/${samples})... `);
      const result = await lighthouse(`${baseUrl}${route}`, {
        formFactor: "mobile",
        logLevel: "error",
        onlyCategories: Object.keys(categoryMinimums),
        output: "json",
        port: chrome.port,
        screenEmulation: {
          deviceScaleFactor: 2.625,
          disabled: false,
          height: 844,
          mobile: true,
          width: 390,
        },
      });
      results.push(result.lhr);
      await writeFile(
        resolve(reportDirectory, `${routeName(route)}-${sample}.json`),
        result.report,
      );
      console.log("done");
    }

    const summary = {};
    for (const [category, minimum] of Object.entries(categoryMinimums)) {
      const value = median(results.map((result) => result.categories[category].score));
      summary[category] = value;
      if (value < minimum) failures.push(`${route} ${category}: ${value} < ${minimum}`);
    }
    for (const [audit, maximum] of Object.entries(auditMaximums)) {
      const value = median(results.map((result) => result.audits[audit].numericValue));
      summary[audit] = value;
      if (value > maximum) failures.push(`${route} ${audit}: ${value} > ${maximum}`);
    }

    console.log(
      `${route} performance ${Math.round(summary.performance * 100)}, accessibility ${Math.round(summary.accessibility * 100)}, best practices ${Math.round(summary["best-practices"] * 100)}, SEO ${Math.round(summary.seo * 100)}, LCP ${Math.round(summary["largest-contentful-paint"])}ms, CLS ${summary["cumulative-layout-shift"].toFixed(3)}`,
    );
  }

  if (failures.length) {
    exitCode = 1;
    console.error(`Lighthouse budgets failed:\n- ${failures.join("\n- ")}`);
  } else {
    console.log("All Lighthouse budgets passed.");
  }
} catch (error) {
  exitCode = 1;
  console.error(error);
} finally {
  if (chrome) await chrome.kill();
  server.kill();
  await new Promise((resolveWait) => setTimeout(resolveWait, 300));
  await rm(profileDirectory, {
    force: true,
    maxRetries: 10,
    recursive: true,
    retryDelay: 200,
  }).catch(() => {});
}

process.exitCode = exitCode;
