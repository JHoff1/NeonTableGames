const fs = require("fs");
const path = require("path");

const revision = process.env.COMMIT_REF || process.env.GITHUB_SHA || "local";
const output = {
  builtAt: new Date().toISOString(),
  revision,
};

fs.writeFileSync(
  path.resolve(__dirname, "..", "deployment-version.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
