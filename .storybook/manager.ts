import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";
import "./manager.css";

type FleetsTheme = "light" | "dark";

const brandTitle = `
  <span class="fleets-storybook-brand">
    <img class="fleets-storybook-brand__icon" src="/openremote.png" alt="" aria-hidden="true" />
    <span class="fleets-storybook-brand__text">OpenRemote Fleets</span>
  </span>
`;
const faviconHref = "/openremote.png?v=openremote-fleets-storybook";

const sharedConfig = {
  sidebar: {
    showRoots: true,
    collapsedRoots: [],
  },
  toolbar: {
    title: { hidden: false },
  },
};

const lightTheme = create({
  base: "light",
  brandTitle,
  brandUrl: "/",
  colorPrimary: "#9fca16",
  colorSecondary: "#7a9f12",
  appBg: "#f5f4f1",
  appContentBg: "#fbfaf8",
  appPreviewBg: "#f5f4f1",
  appBorderColor: "rgba(15, 15, 15, 0.08)",
  appBorderRadius: 8,
  barBg: "#ffffff",
  barHoverColor: "rgba(159, 202, 22, 0.14)",
  barSelectedColor: "#141414",
  barTextColor: "#55514c",
  buttonBg: "#ffffff",
  buttonBorder: "rgba(15, 15, 15, 0.12)",
  fontBase: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontCode: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
  inputBg: "#ffffff",
  inputBorder: "rgba(15, 15, 15, 0.12)",
  inputBorderRadius: 8,
  inputTextColor: "#141414",
  textColor: "#141414",
  textInverseColor: "#ffffff",
  textMutedColor: "#78736c",
});

const darkTheme = create({
  base: "dark",
  brandTitle,
  brandUrl: "/",
  colorPrimary: "#9fca16",
  colorSecondary: "#b7e034",
  appBg: "#171a17",
  appContentBg: "#1f231f",
  appPreviewBg: "#171a17",
  appBorderColor: "rgba(245, 247, 242, 0.12)",
  appBorderRadius: 8,
  barBg: "#111511",
  barHoverColor: "rgba(159, 202, 22, 0.18)",
  barSelectedColor: "#f5f7f2",
  barTextColor: "#d7dccf",
  buttonBg: "#1f241f",
  buttonBorder: "rgba(245, 247, 242, 0.14)",
  fontBase: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontCode: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
  inputBg: "#111511",
  inputBorder: "rgba(245, 247, 242, 0.14)",
  inputBorderRadius: 8,
  inputTextColor: "#f5f7f2",
  textColor: "#f5f7f2",
  textInverseColor: "#141414",
  textMutedColor: "#aeb6a8",
});

function getThemeFromLocation(): FleetsTheme {
  const globals = decodeURIComponent(new URLSearchParams(window.location.search).get("globals") ?? "");
  const themeMatches = [...globals.matchAll(/(?:^|[;&])fleetsTheme:(light|dark)(?=$|[;&])/g)];
  const lastThemeMatch = themeMatches.at(-1)?.[1];

  return lastThemeMatch === "dark" ? "dark" : "light";
}

let activeTheme: FleetsTheme | undefined;

function applyFavicon() {
  document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach((link) => link.remove());

  const favicon = document.createElement("link");
  favicon.rel = "icon";
  favicon.type = "image/png";
  favicon.href = faviconHref;
  document.head.appendChild(favicon);

  const shortcut = document.createElement("link");
  shortcut.rel = "shortcut icon";
  shortcut.type = "image/png";
  shortcut.href = faviconHref;
  document.head.appendChild(shortcut);

  const appleTouchIcon = document.createElement("link");
  appleTouchIcon.rel = "apple-touch-icon";
  appleTouchIcon.href = faviconHref;
  document.head.appendChild(appleTouchIcon);
}

function applyManagerTheme() {
  const theme = getThemeFromLocation();

  if (theme === activeTheme) {
    return;
  }

  activeTheme = theme;
  document.documentElement.dataset.fleetsTheme = theme;
  document.body.dataset.fleetsTheme = theme;

  addons.setConfig({
    ...sharedConfig,
    theme: theme === "dark" ? darkTheme : lightTheme,
  });
}

applyFavicon();
applyManagerTheme();

window.addEventListener("popstate", applyManagerTheme);
window.addEventListener("hashchange", applyManagerTheme);
window.setInterval(applyManagerTheme, 250);
