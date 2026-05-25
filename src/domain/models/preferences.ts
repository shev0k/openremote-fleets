export type AppPreferenceSource = "default" | "openRemote" | "local";
export type AppTimeFormat = "24h" | "12h";
export type AppDefaultMapLayer = "default" | "satellite" | "terrain";

export interface AppBrandingPreferences {
  applicationName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  logoAltText: string;
}

export interface AppThemeColorPreferences {
  brand: string;
  brandHover: string;
  brandForeground: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export interface AppMapColorPreferences {
  vehicleMoving: string;
  vehicleIdling: string;
  vehicleParked: string;
  vehicleStationary: string;
  vehicleSignalDegraded: string;
  vehicleDriverBreak: string;
  vehicleAlerting: string;
  vehicleOffline: string;
  route: string;
  routeActive: string;
  routeSlow: string;
  routeFast: string;
  routeOverspeed: string;
}

export interface AppBehaviorPreferences {
  timeFormat: AppTimeFormat;
  defaultMapLayer: AppDefaultMapLayer;
}

export interface AppPreferences {
  source: AppPreferenceSource;
  branding: AppBrandingPreferences;
  themeColors: AppThemeColorPreferences;
  mapColors: AppMapColorPreferences;
  behavior: AppBehaviorPreferences;
}

type LegacyAppMapColorPreferences = AppMapColorPreferences & {
  vehicleIdle?: string;
};

export type AppPreferencesInput = Partial<{
  source: AppPreferenceSource;
  branding: Partial<AppBrandingPreferences>;
  themeColors: Partial<AppThemeColorPreferences>;
  mapColors: Partial<LegacyAppMapColorPreferences>;
  behavior: Partial<AppBehaviorPreferences>;
}>;

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  source: "default",
  branding: {
    applicationName: "OpenRemote Fleets",
    logoUrl: "/openremote.png",
    faviconUrl: "/openremote.png",
    logoAltText: "OpenRemote Fleets logo",
  },
  themeColors: {
    brand: "#a1d200",
    brandHover: "#b5e61a",
    brandForeground: "#050505",
    success: "#22c55e",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#b8b8b8",
  },
  mapColors: {
    vehicleMoving: "#a1d200",
    vehicleIdling: "#f59e0b",
    vehicleParked: "#38bdf8",
    vehicleStationary: "#94a3b8",
    vehicleSignalDegraded: "#fb923c",
    vehicleDriverBreak: "#8b5cf6",
    vehicleAlerting: "#ef4444",
    vehicleOffline: "#b6bcc8",
    route: "#a1d200",
    routeActive: "#f5f5f5",
    routeSlow: "#f59e0b",
    routeFast: "#8b5cf6",
    routeOverspeed: "#ef4444",
  },
  behavior: {
    timeFormat: "24h",
    defaultMapLayer: "default",
  },
};

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeUrl(value: unknown, fallback: string | null): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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

function normalizeSource(value: unknown, fallback: AppPreferenceSource): AppPreferenceSource {
  return value === "default" || value === "openRemote" || value === "local" ? value : fallback;
}

function normalizeTimeFormat(value: unknown, fallback: AppTimeFormat): AppTimeFormat {
  return value === "12h" || value === "24h" ? value : fallback;
}

function normalizeDefaultMapLayer(value: unknown, fallback: AppDefaultMapLayer): AppDefaultMapLayer {
  return value === "default" || value === "satellite" || value === "terrain" ? value : fallback;
}

export function mergeAppPreferences(base: AppPreferences, override: AppPreferencesInput = {}): AppPreferences {
  return {
    source: normalizeSource(override.source, base.source),
    branding: {
      applicationName: normalizeText(override.branding?.applicationName, base.branding.applicationName),
      logoUrl: normalizeUrl(override.branding?.logoUrl, base.branding.logoUrl),
      faviconUrl: normalizeUrl(override.branding?.faviconUrl, base.branding.faviconUrl),
      logoAltText: normalizeText(override.branding?.logoAltText, base.branding.logoAltText),
    },
    themeColors: {
      brand: normalizeHexColor(override.themeColors?.brand, base.themeColors.brand),
      brandHover: normalizeHexColor(override.themeColors?.brandHover, base.themeColors.brandHover),
      brandForeground: normalizeHexColor(override.themeColors?.brandForeground, base.themeColors.brandForeground),
      success: normalizeHexColor(override.themeColors?.success, base.themeColors.success),
      warning: normalizeHexColor(override.themeColors?.warning, base.themeColors.warning),
      danger: normalizeHexColor(override.themeColors?.danger, base.themeColors.danger),
      info: normalizeHexColor(override.themeColors?.info, base.themeColors.info),
    },
    mapColors: {
      vehicleMoving: normalizeHexColor(override.mapColors?.vehicleMoving, base.mapColors.vehicleMoving),
      vehicleIdling: normalizeHexColor(
        override.mapColors?.vehicleIdling ?? override.mapColors?.vehicleIdle,
        base.mapColors.vehicleIdling,
      ),
      vehicleParked: normalizeHexColor(override.mapColors?.vehicleParked, base.mapColors.vehicleParked),
      vehicleStationary: normalizeHexColor(override.mapColors?.vehicleStationary, base.mapColors.vehicleStationary),
      vehicleSignalDegraded: normalizeHexColor(
        override.mapColors?.vehicleSignalDegraded,
        base.mapColors.vehicleSignalDegraded,
      ),
      vehicleDriverBreak: normalizeHexColor(override.mapColors?.vehicleDriverBreak, base.mapColors.vehicleDriverBreak),
      vehicleAlerting: normalizeHexColor(override.mapColors?.vehicleAlerting, base.mapColors.vehicleAlerting),
      vehicleOffline: normalizeHexColor(override.mapColors?.vehicleOffline, base.mapColors.vehicleOffline),
      route: normalizeHexColor(override.mapColors?.route, base.mapColors.route),
      routeActive: normalizeHexColor(override.mapColors?.routeActive, base.mapColors.routeActive),
      routeSlow: normalizeHexColor(override.mapColors?.routeSlow, base.mapColors.routeSlow),
      routeFast: normalizeHexColor(override.mapColors?.routeFast, base.mapColors.routeFast),
      routeOverspeed: normalizeHexColor(override.mapColors?.routeOverspeed, base.mapColors.routeOverspeed),
    },
    behavior: {
      timeFormat: normalizeTimeFormat(override.behavior?.timeFormat, base.behavior.timeFormat),
      defaultMapLayer: normalizeDefaultMapLayer(override.behavior?.defaultMapLayer, base.behavior.defaultMapLayer),
    },
  };
}

export function buildPreferencesCssVariables(preferences: AppPreferences): Record<string, string> {
  const brand = preferences.themeColors.brand;

  return {
    "--brand": brand,
    "--brand-hover": preferences.themeColors.brandHover,
    "--brand-foreground": preferences.themeColors.brandForeground,
    "--brand-glow-soft": `color-mix(in srgb, ${brand} 34%, transparent)`,
    "--brand-glow": `color-mix(in srgb, ${brand} 52%, transparent)`,
    "--brand-glow-strong": `color-mix(in srgb, ${brand} 78%, transparent)`,
    "--success": preferences.themeColors.success,
    "--warning": preferences.themeColors.warning,
    "--danger": preferences.themeColors.danger,
    "--info": preferences.themeColors.info,
    "--control-active": brand,
    "--control-active-foreground": preferences.themeColors.brandForeground,
    "--timeline-fill": brand,
    "--primary": brand,
    "--primary-foreground": preferences.themeColors.brandForeground,
    "--ring": `color-mix(in srgb, ${brand} 45%, transparent)`,
    "--map-vehicle-moving": preferences.mapColors.vehicleMoving,
    "--map-vehicle-idling": preferences.mapColors.vehicleIdling,
    "--map-vehicle-idle": preferences.mapColors.vehicleIdling,
    "--map-vehicle-parked": preferences.mapColors.vehicleParked,
    "--map-vehicle-stationary": preferences.mapColors.vehicleStationary,
    "--map-vehicle-signal-degraded": preferences.mapColors.vehicleSignalDegraded,
    "--map-vehicle-driver-break": preferences.mapColors.vehicleDriverBreak,
    "--map-vehicle-alerting": preferences.mapColors.vehicleAlerting,
    "--map-vehicle-offline": preferences.mapColors.vehicleOffline,
    "--map-route": preferences.mapColors.route,
    "--map-route-active": preferences.mapColors.routeActive,
    "--map-route-slow": preferences.mapColors.routeSlow,
    "--map-route-fast": preferences.mapColors.routeFast,
    "--map-route-overspeed": preferences.mapColors.routeOverspeed,
  };
}

export function formatTimeByPreference(value: Date | string | number, timeFormat: AppTimeFormat, timeZone?: string): string {
  const timestamp = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(timestamp.valueOf())) {
    return "--:--";
  }

  return timestamp.toLocaleTimeString(timeFormat === "12h" ? "en-US" : "en-GB", {
    hour: timeFormat === "12h" ? "numeric" : "2-digit",
    minute: "2-digit",
    hour12: timeFormat === "12h",
    ...(timeZone ? { timeZone } : {}),
  });
}
