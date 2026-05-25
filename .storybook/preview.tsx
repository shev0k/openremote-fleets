import { useEffect, useState } from "react";
import { DocsContainer, type DocsContainerProps } from "@storybook/addon-docs/blocks";
import type { Preview } from "@storybook/react-vite";
import { themes } from "storybook/theming";
import "../src/styles/index.css";
import "./styles.css";

type FleetsTheme = "light" | "dark";

function getThemeClass(theme: unknown): FleetsTheme {
  return theme === "dark" ? "dark" : "light";
}

function getThemeFromSearch(search: string): FleetsTheme {
  const globals = decodeURIComponent(new URLSearchParams(search).get("globals") ?? "");
  const themeMatches = [...globals.matchAll(/(?:^|[;&])fleetsTheme:(light|dark)(?=$|[;&])/g)];
  const lastThemeMatch = themeMatches.at(-1)?.[1];

  return lastThemeMatch === "dark" ? "dark" : "light";
}

function getThemeFromLocation(): FleetsTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    if (window.parent && window.parent !== window) {
      return getThemeFromSearch(window.parent.location.search);
    }
  } catch {
    // Storybook may isolate the preview iframe in some environments.
  }

  return getThemeFromSearch(window.location.search);
}

function useFleetsThemeClass(theme: FleetsTheme) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.fleetsTheme = theme;

    return () => {
      root.classList.remove("dark");
      delete root.dataset.fleetsTheme;
    };
  }, [theme]);
}

function FleetsDocsContainer({ children, context }: DocsContainerProps) {
  const [theme, setTheme] = useState(getThemeFromLocation);

  useEffect(() => {
    const updateTheme = () => setTheme(getThemeFromLocation());
    const intervalId = window.setInterval(updateTheme, 250);

    window.addEventListener("popstate", updateTheme);
    window.addEventListener("hashchange", updateTheme);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("popstate", updateTheme);
      window.removeEventListener("hashchange", updateTheme);
    };
  }, []);

  useFleetsThemeClass(theme);

  return (
    <div className={`storybook-preview-shell ${theme === "dark" ? "dark" : ""}`} data-fleets-theme={theme}>
      <DocsContainer context={context} theme={theme === "dark" ? themes.dark : themes.light}>
        {children}
      </DocsContainer>
    </div>
  );
}

const preview: Preview = {
  globalTypes: {
    fleetsTheme: {
      name: "Theme",
      description: "Switch the Fleets docs preview between light and dark tokens.",
      defaultValue: "light",
      toolbar: {
        icon: "circlehollow",
        title: "Theme",
        dynamicTitle: true,
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
      },
    },
  },
  initialGlobals: {
    fleetsTheme: "light",
  },
  parameters: {
    controls: {
      expanded: true,
      disableSaveFromUI: true,
      presetColors: ["#9fca16", "#dc2626", "#d97706", "#16a34a"],
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      theme: themes.light,
      container: FleetsDocsContainer,
      story: {
        inline: false,
      },
      toc: {
        disable: false,
        headingSelector: "h2,h3",
      },
      source: {
        transform: async (source: string) => source.replaceAll(/&quot;/g, "\""),
      },
    },
    options: {
      storySort: {
        method: "alphabetical",
        order: [
          "Introduction",
          "Architecture",
          [
            "Setup And Commands",
            "App Shell",
            "Real And Mock Data Modes",
            "OpenRemote Services And Repositories",
          ],
          "Features",
          [
            "Live Fleet",
            "Route Playback",
            "Alerts And Assets",
            "Graphs And Reports",
            "Preferences And Wall Display",
          ],
          "Data",
          ["Teltonika Telemetry And Status", "Teltonika Emulator"],
          "UI System",
          ["Themes Layout And Map"],
          "Maintenance",
          ["Verification Tests And Boundaries"],
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = getThemeClass(context.globals.fleetsTheme);
      useFleetsThemeClass(theme);

      return (
        <div
          className={[
            "storybook-preview-shell min-h-screen bg-page text-content-primary",
            theme === "dark" ? "dark" : "",
          ].join(" ")}
          data-fleets-theme={theme}
        >
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
