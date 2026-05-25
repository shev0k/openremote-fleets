// @ts-expect-error This test reads a local env file without adding Node globals to the app tsconfig.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import packageJson from "../../../package.json";
import viteConfig from "../../../vite.config.mjs?raw";

type PackageJson = {
  scripts?: Record<string, string>;
};

const typedPackageJson = packageJson as PackageJson;
const mockEnv = readFileSync(new URL("../../../.env.mock", import.meta.url), "utf8");
const gitignore = readFileSync(new URL("../../../.gitignore", import.meta.url), "utf8");
const public404Pages = import.meta.glob("../../../public/404.html", {
  eager: true,
  import: "default",
  query: "?raw",
});
const wranglerConfigs = import.meta.glob("../../../wrangler.jsonc", {
  eager: true,
  import: "default",
  query: "?raw",
});

type WranglerConfig = {
  name?: string;
  compatibility_date?: string;
  workers_dev?: boolean;
  preview_urls?: boolean;
  assets?: {
    directory?: string;
    not_found_handling?: string;
  };
  observability?: {
    enabled?: boolean;
    head_sampling_rate?: number;
    logs?: {
      enabled?: boolean;
      head_sampling_rate?: number;
      persist?: boolean;
      invocation_logs?: boolean;
    };
    traces?: {
      enabled?: boolean;
      persist?: boolean;
      head_sampling_rate?: number;
    };
  };
};

function readWranglerConfig() {
  const configs = Object.values(wranglerConfigs);
  expect(configs).toHaveLength(1);

  return JSON.parse(configs[0] as string) as WranglerConfig;
}

describe("Cloudflare mock deployment contract", () => {
  it("exposes an explicit mock production build script", () => {
    expect(typedPackageJson.scripts?.["build:mock"]).toBe("vite build --mode mock");
  });

  it("keeps the checked-in mock env file pinned to mock data mode", () => {
    expect(mockEnv).toMatch(/^VITE_DATA_MODE=mock$/m);
  });

  it("does not ship a top-level 404 page that disables Cloudflare Workers static assets SPA fallback", () => {
    expect(Object.keys(public404Pages)).toHaveLength(0);
  });

  it("defines a Workers static assets deployment instead of relying on Wrangler auto-detection", () => {
    const wranglerConfig = readWranglerConfig();

    expect(wranglerConfig.name).toBe("openremote-fleets");
    expect(wranglerConfig.compatibility_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(wranglerConfig.workers_dev).toBe(false);
    expect(wranglerConfig.preview_urls).toBe(false);
    expect(wranglerConfig.assets?.directory).toBe("./dist");
    expect(wranglerConfig.assets?.not_found_handling).toBe("single-page-application");
  });

  it("enables Workers observability logs in checked-in Wrangler config", () => {
    const wranglerConfig = readWranglerConfig();

    expect(wranglerConfig.observability).toMatchObject({
      enabled: true,
      head_sampling_rate: 1,
      logs: {
        enabled: true,
        head_sampling_rate: 1,
        persist: true,
        invocation_logs: true,
      },
      traces: {
        enabled: false,
        persist: true,
        head_sampling_rate: 1,
      },
    });
  });

  it("transforms mixed ESM/CommonJS dependencies so the browser bundle has no raw require calls", () => {
    expect(viteConfig).toContain("transformMixedEsModules: true");
  });

  it("ignores local Wrangler state, deployment output, and browser report artifacts", () => {
    expect(gitignore).toMatch(/^\.wrangler\/$/m);
    expect(gitignore).toMatch(/^output\/$/m);
    expect(gitignore).toMatch(/^playwright-report\/$/m);
    expect(gitignore).toMatch(/^test-results\/$/m);
  });
});
