import type { ManagerAppConfig, ManagerAppRealmConfig } from "@openremote/model";
import {
  DEFAULT_APP_PREFERENCES,
  mergeAppPreferences,
  type AppPreferenceSource,
  type AppPreferences,
} from "../../../domain/models/preferences";

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    return fallback;
  }

  if (trimmed.length === 4) {
    const [, red, green, blue] = trimmed;
    return `#${red}${red}${green}${green}${blue}${blue}`.toLowerCase();
  }

  return trimmed.toLowerCase();
}

function parseStyleVariables(styles: string | undefined): Record<string, string> {
  if (!styles) {
    return {};
  }

  const variables: Record<string, string> = {};
  const variablePattern = /(--[\w-]+)\s*:\s*([^;}{]+)/g;
  let match: RegExpExecArray | null;

  while ((match = variablePattern.exec(styles))) {
    const [, key, value] = match;
    variables[key] = value.trim();
  }

  return variables;
}

function resolveImageUrl(value: string | undefined, managerUrl?: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  if (/^(?:https?:|data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }

  const baseUrl = managerUrl?.replace(/\/+$/, "");
  if (!baseUrl) {
    return trimmed;
  }

  return `${baseUrl}/${trimmed.replace(/^\/+/, "")}`;
}

function mergeRealmConfig(defaultRealm?: ManagerAppRealmConfig, realm?: ManagerAppRealmConfig): ManagerAppRealmConfig {
  return {
    ...(defaultRealm ?? {}),
    ...(realm ?? {}),
    styles: [defaultRealm?.styles, realm?.styles].filter(Boolean).join("\n") || undefined,
  };
}

function hasRealmAppearance(config: ManagerAppRealmConfig): boolean {
  return Boolean(config.appTitle || config.logo || config.logoMobile || config.favicon || config.styles);
}

export function createPreferencesFromOpenRemoteConfig(
  config: ManagerAppConfig | null | undefined,
  options: { realm?: string | null; managerUrl?: string | null } = {},
): AppPreferences {
  const realms = config?.realms;
  if (!realms) {
    return DEFAULT_APP_PREFERENCES;
  }

  const realmName = options.realm ?? "master";
  const realmConfig = mergeRealmConfig(realms.default, realms[realmName]);
  if (!hasRealmAppearance(realmConfig)) {
    return DEFAULT_APP_PREFERENCES;
  }

  const styleVariables = parseStyleVariables(realmConfig.styles);
  const brand = normalizeHexColor(styleVariables["--or-app-color4"], DEFAULT_APP_PREFERENCES.themeColors.brand);
  const danger = normalizeHexColor(styleVariables["--or-app-color6"], DEFAULT_APP_PREFERENCES.themeColors.danger);
  const brandForeground = normalizeHexColor(styleVariables["--or-app-color8"], DEFAULT_APP_PREFERENCES.themeColors.brandForeground);
  const logoUrl = resolveImageUrl(realmConfig.logoMobile ?? realmConfig.logo, options.managerUrl);
  const applicationName = normalizeText(realmConfig.appTitle, DEFAULT_APP_PREFERENCES.branding.applicationName);

  return mergeAppPreferences(DEFAULT_APP_PREFERENCES, {
    source: "openRemote" satisfies AppPreferenceSource,
    branding: {
      applicationName,
      logoUrl,
      faviconUrl: resolveImageUrl(realmConfig.favicon, options.managerUrl),
      logoAltText: `${applicationName} logo`,
    },
    themeColors: {
      brand,
      brandForeground,
      danger,
    },
    mapColors: {
      vehicleMoving: brand,
      vehicleAlerting: danger,
      route: brand,
      routeOverspeed: danger,
    },
  });
}
