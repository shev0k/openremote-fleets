import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

const mdiCssSpecifier = /^@mdi\/font\/css\/materialdesignicons\.min\.css$/;
const openRemoteDockerOrigin = "https://localhost";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "VITE_");
  const requestedDataMode = process.env.VITE_DATA_MODE ?? env.VITE_DATA_MODE;
  const isMockMode = mode === "mock" || requestedDataMode === "mock";
  const appDataMode = isMockMode ? "mock" : "openRemote";
  const useOpenRemoteHttps = command === "serve" && !isMockMode;
  const appServiceFactory = isMockMode
    ? "./src/infrastructure/services/appServices.mock.ts"
    : "./src/infrastructure/services/appServices.openRemote.ts";
  const appSessionProvider = isMockMode
    ? "./src/app/providers/session/AppSessionProvider.mock.tsx"
    : "./src/app/providers/session/AppSessionProvider.openRemote.tsx";

  const buildModeMarkerPlugin = {
    name: "openremote-fleets-build-mode-marker",
    transformIndexHtml(html) {
      return html.replace(
        "<head>",
        `<head>\n      <meta name="openremote-fleets-build-mode" content="${appDataMode}" />`,
      );
    },
  };

  return {
    plugins: [buildModeMarkerPlugin, react(), tailwindcss(), ...(useOpenRemoteHttps ? [basicSsl()] : [])],
    define: {
      __OPENREMOTE_FLEETS_DATA_MODE__: JSON.stringify(appDataMode),
    },
    resolve: {
      alias: [
        {
          find: mdiCssSpecifier,
          replacement: path.resolve(
            import.meta.dirname,
            "./src/infrastructure/openremote/shims/mdiCss.ts",
          ),
        },
        {
          find: "@",
          replacement: path.resolve(import.meta.dirname, "./src"),
        },
        {
          find: "#app-service-factory",
          replacement: path.resolve(import.meta.dirname, appServiceFactory),
        },
        {
          find: "#app-session-provider",
          replacement: path.resolve(import.meta.dirname, appSessionProvider),
        },
      ],
    },
    server: useOpenRemoteHttps
      ? {
          host: "localhost",
          port: 5173,
          strictPort: true,
          proxy: {
            "/api": {
              target: openRemoteDockerOrigin,
              changeOrigin: true,
              secure: false,
            },
            "/auth": {
              target: openRemoteDockerOrigin,
              changeOrigin: true,
              secure: false,
            },
            "/websocket": {
              target: openRemoteDockerOrigin,
              changeOrigin: true,
              secure: false,
              ws: true,
            },
          },
        }
      : undefined,
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replaceAll("\\", "/");
            if (!normalizedId.includes("/node_modules/")) return undefined;

            if (normalizedId.includes("/react/") || normalizedId.includes("/react-dom/") || normalizedId.includes("/react-router/")) {
              return "vendor-react";
            }
            if (normalizedId.includes("/leaflet/")) return "vendor-map";
            if (normalizedId.includes("/recharts/") || normalizedId.includes("/d3-")) return "vendor-charts";
            if (normalizedId.includes("/@mui/") || normalizedId.includes("/@emotion/")) return "vendor-mui";
            if (normalizedId.includes("/@radix-ui/")) return "vendor-radix";
            if (normalizedId.includes("/@openremote/")) return "vendor-openremote";

            const packagePath = normalizedId.split("/node_modules/")[1] ?? "vendor";
            const [scopeOrName, scopedName] = packagePath.split("/");
            const packageName = scopeOrName.startsWith("@") ? `${scopeOrName}-${scopedName}` : scopeOrName;
            if (["@babel-runtime", "cookie", "set-cookie-parser", "dom-helpers", "react-transition-group"].includes(packageName)) {
              return undefined;
            }
            return `vendor-${packageName.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
          },
        },
      },
    },
    assetsInclude: ["**/*.svg", "**/*.csv"],
    test: {
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      exclude: ["node_modules/**", "dist/**", "openremote-manager/**"],
    },
  };
});
