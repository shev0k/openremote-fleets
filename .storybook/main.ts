import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(dirname, "..");

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../docs/storybook/**/*.mdx"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  staticDirs: ["../public"],
  core: {
    disableTelemetry: true,
  },
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    define: {
      ...viteConfig.define,
      __OPENREMOTE_FLEETS_DATA_MODE__: JSON.stringify("mock"),
    },
    plugins: [...(viteConfig.plugins ?? []), tailwindcss()],
    resolve: {
      ...viteConfig.resolve,
      alias: [
        ...(Array.isArray(viteConfig.resolve?.alias) ? viteConfig.resolve.alias : []),
        {
          find: "@",
          replacement: path.resolve(rootDir, "src"),
        },
        {
          find: "#app-service-factory",
          replacement: path.resolve(rootDir, "src/infrastructure/services/appServices.mock.ts"),
        },
        {
          find: "#app-session-provider",
          replacement: path.resolve(rootDir, "src/app/providers/session/AppSessionProvider.mock.tsx"),
        },
        {
          find: /^@mdi\/font\/css\/materialdesignicons\.min\.css$/,
          replacement: path.resolve(rootDir, "src/infrastructure/openremote/shims/mdiCss.ts"),
        },
      ],
    },
  }),
};

export default config;
