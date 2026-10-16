import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const root = __dirname;
const pages = [
  "index.html",
  "blackjack/index.html",
  "blackjack-rules/index.html",
  "baccarat/index.html",
  "baccarat-rules/index.html",
  "three-card-poker/index.html",
  "three-card-poker-rules/index.html",
  "privacy-policy/index.html",
  "terms/index.html",
];

const legacyFiles = [
  "1d85b298de45482ba8a93a39b51d704c.txt",
  "_headers",
  "_redirects",
  "deployment-version.json",
  "favicon.svg",
  "robots.txt",
  "social-preview.png",
  "site.webmanifest",
  "sitemap.xml",
];

function copyLegacyRuntime(): Plugin {
  return {
    name: "copy-legacy-runtime",
    closeBundle() {
      const output = resolve(root, "dist");
      mkdirSync(output, { recursive: true });
      for (const file of legacyFiles) {
        const source = resolve(root, file);
        if (!existsSync(source)) continue;
        cpSync(source, resolve(output, file), { force: true, recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyLegacyRuntime()],
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((page) => [page.replace(/[/.]/g, "-"), resolve(root, page)]),
      ),
    },
  },
});
