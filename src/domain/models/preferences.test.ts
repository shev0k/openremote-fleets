import { describe, expect, it } from "vitest";
import {
  DEFAULT_APP_PREFERENCES,
  buildPreferencesCssVariables,
  formatTimeByPreference,
  mergeAppPreferences,
} from "./preferences";

describe("preferences model", () => {
  it("uses plural Fleets branding by default", () => {
    expect(DEFAULT_APP_PREFERENCES.branding.applicationName).toBe("OpenRemote Fleets");
    expect(DEFAULT_APP_PREFERENCES.branding.logoUrl).toBe("/openremote.png");
    expect(DEFAULT_APP_PREFERENCES.branding.faviconUrl).toBe("/openremote.png");
    expect(DEFAULT_APP_PREFERENCES.branding.logoAltText).toBe("OpenRemote Fleets logo");
  });

  it("normalizes partial local overrides without accepting invalid colors", () => {
    const preferences = mergeAppPreferences(DEFAULT_APP_PREFERENCES, {
      branding: { applicationName: "North Fleet", logoUrl: "https://cdn.example/logo.svg" },
      themeColors: { brand: "#123456", danger: "not-a-color" },
      behavior: { timeFormat: "12h" },
    });

    expect(preferences.branding.applicationName).toBe("North Fleet");
    expect(preferences.branding.logoUrl).toBe("https://cdn.example/logo.svg");
    expect(preferences.themeColors.brand).toBe("#123456");
    expect(preferences.themeColors.danger).toBe(DEFAULT_APP_PREFERENCES.themeColors.danger);
    expect(preferences.behavior.timeFormat).toBe("12h");
  });

  it("builds CSS variables for global theme and map colors", () => {
    const variables = buildPreferencesCssVariables(
      mergeAppPreferences(DEFAULT_APP_PREFERENCES, {
        themeColors: { brand: "#123456" },
        mapColors: { vehicleMoving: "#abcdef", route: "#fedcba" },
      }),
    );

    expect(variables["--brand"]).toBe("#123456");
    expect(variables["--brand-glow"]).toBe("color-mix(in srgb, #123456 52%, transparent)");
    expect(variables["--brand-glow-strong"]).toBe("color-mix(in srgb, #123456 78%, transparent)");
    expect(variables["--timeline-fill"]).toBe("#123456");
    expect(variables["--map-vehicle-moving"]).toBe("#abcdef");
    expect(variables["--map-route"]).toBe("#fedcba");
  });

  it("migrates legacy idle map color overrides to the idling marker color", () => {
    const preferences = mergeAppPreferences(DEFAULT_APP_PREFERENCES, {
      mapColors: { vehicleIdle: "#654321" },
    });
    const variables = buildPreferencesCssVariables(preferences);

    expect(preferences.mapColors.vehicleIdling).toBe("#654321");
    expect(variables["--map-vehicle-idling"]).toBe("#654321");
    expect(variables["--map-vehicle-idle"]).toBe("#654321");
  });

  it("formats time using the selected global preference", () => {
    const timestamp = new Date("2026-05-08T14:05:00Z");

    expect(formatTimeByPreference(timestamp, "24h", "UTC")).toBe("14:05");
    expect(formatTimeByPreference(timestamp, "12h", "UTC")).toMatch(/2:05 PM/i);
  });
});
