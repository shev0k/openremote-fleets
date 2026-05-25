import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const mode = process.argv[2];

if (mode !== "real" && mode !== "mock") {
  console.error("Usage: node scripts/check-bundle-boundaries.mjs <real|mock>");
  process.exit(1);
}

const distDir = join(process.cwd(), "dist");

if (!existsSync(distDir)) {
  console.error("dist/ does not exist. Run the matching build before scanning.");
  process.exit(1);
}

function collectFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory() ? collectFiles(fullPath) : [fullPath];
  });
}

const files = collectFiles(distDir).filter((file) => /\.(js|mjs|css|html|json)$/.test(file));
const contentByFile = new Map(files.map((file) => [file, readFileSync(file, "utf8")]));
const pathHaystack = files.map((file) => relative(distDir, file).replaceAll("\\", "/")).join("\n");
const contentHaystack = [...contentByFile.values()].join("\n");
const indexHtml = contentByFile.get(join(distDir, "index.html")) ?? "";

const forbiddenByMode = {
  mock: [
    "@openremote/core",
    "@openremote/model",
    "openRemoteRuntime",
    "OpenRemoteRuntime",
    "AppSessionProvider.openRemote",
    "createOpenRemoteAppServices"
  ],
  real: [
    "MockFleetRepository",
    "MockPlaybackRepository",
    "MockLiveFleetSimulationService",
    "createMockAppServices",
    "mockLiveFleetSimulation",
    "reportsFixtures"
  ]
};

const expectedMarker = mode === "mock" ? "mock" : "openRemote";
const markerPattern = new RegExp(
  `<meta\\s+name=["']openremote-fleets-build-mode["']\\s+content=["']${expectedMarker}["']\\s*/?>`,
  "i",
);

if (!markerPattern.test(indexHtml)) {
  console.error(`Bundle boundary check failed for ${mode} mode.`);
  console.error(
    `- Missing expected build mode marker in dist/index.html: openremote-fleets-build-mode=${expectedMarker}`,
  );
  console.error("  Run the matching build before scanning this bundle.");
  process.exit(1);
}

const matches = forbiddenByMode[mode].filter(
  (needle) => contentHaystack.includes(needle) || pathHaystack.includes(needle),
);

if (matches.length) {
  console.error(`Bundle boundary check failed for ${mode} mode.`);
  for (const match of matches) {
    console.error(`- Found forbidden marker: ${match}`);
  }
  process.exit(1);
}

console.log(`Bundle boundary check passed for ${mode} mode.`);
