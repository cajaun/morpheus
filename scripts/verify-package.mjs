import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const rawManifest = execFileSync(
  "npm",
  ["pack", "--dry-run", "--json", "--ignore-scripts"],
  {
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_cache: join(tmpdir(), "morpheus-npm-cache"),
    },
  },
);
const manifestStart = rawManifest.lastIndexOf("\n[");
const manifestJson = rawManifest.slice(manifestStart < 0 ? 0 : manifestStart + 1);
const [pack] = JSON.parse(manifestJson);

if (!pack) {
  throw new Error("npm pack did not return a package manifest.");
}

const packedFiles = new Set(pack.files.map(({ path }) => path));
const requiredFiles = [
  "package.json",
  "README.md",
  "src/index.ts",
  "src/constants.ts",
  "lib/module/index.js",
  "lib/module/constants.js",
  "lib/typescript/src/index.d.ts",
  "lib/typescript/src/constants.d.ts",
];
const missingFiles = requiredFiles.filter((path) => !packedFiles.has(path));

const forbiddenFiles = [...packedFiles].filter(
  (path) =>
    path.startsWith("example/") ||
    path.startsWith("quality/") ||
    path.startsWith("coverage/") ||
    path.startsWith(".github/") ||
    path.includes("/__tests__/") ||
    /(?:^|\/)\w+(?:\.qa)?\.test\.[cm]?[jt]sx?$/.test(path),
);

if (missingFiles.length > 0 || forbiddenFiles.length > 0) {
  const failures = [
    missingFiles.length > 0
      ? `Missing required package files:\n- ${missingFiles.join("\n- ")}`
      : null,
    forbiddenFiles.length > 0
      ? `Forbidden package files:\n- ${forbiddenFiles.join("\n- ")}`
      : null,
  ].filter(Boolean);

  throw new Error(failures.join("\n\n"));
}

console.log(
  `Verified ${pack.name}@${pack.version}: ${pack.entryCount} files, ${pack.size} packed bytes.`,
);
