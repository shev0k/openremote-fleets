import { describe, expect, it } from "vitest";
import { DEFAULT_APP_PREFERENCES } from "../../../domain/models/preferences";
import { createPreferencesFromOpenRemoteConfig } from "./openRemotePreferencesMapper";

describe("openRemotePreferencesMapper", () => {
  it("maps OpenRemote realm appearance into Fleets preferences without requiring domain OpenRemote types", () => {
    const preferences = createPreferencesFromOpenRemoteConfig(
      {
        realms: {
          default: {
            appTitle: "Default Fleet",
            logo: "/images/default-logo.svg",
            favicon: "/images/default-favicon.ico",
            styles: ":host > * { --or-app-color4: #4d9d2a; --or-app-color6: #be0000; --or-app-color8: #ffffff; }",
          },
          logistics: {
            appTitle: "Logistics Control",
            logo: "/api/master/configuration/manager/image/logistics/logo.svg",
            logoMobile: "/api/master/configuration/manager/image/logistics/mobile.svg",
            favicon: "/api/master/configuration/manager/image/logistics/favicon.ico",
            styles: ":host > * { --or-app-color4: #2374ab; --or-app-color6: #d00000; --or-app-color8: #f8fafc; }",
          },
        },
      },
      { realm: "logistics", managerUrl: "https://manager.example" },
    );

    expect(preferences.source).toBe("openRemote");
    expect(preferences.branding.applicationName).toBe("Logistics Control");
    expect(preferences.branding.logoUrl).toBe("https://manager.example/api/master/configuration/manager/image/logistics/mobile.svg");
    expect(preferences.branding.faviconUrl).toBe("https://manager.example/api/master/configuration/manager/image/logistics/favicon.ico");
    expect(preferences.themeColors.brand).toBe("#2374ab");
    expect(preferences.themeColors.brandForeground).toBe("#f8fafc");
    expect(preferences.themeColors.danger).toBe("#d00000");
    expect(preferences.mapColors.vehicleMoving).toBe("#2374ab");
  });

  it("falls back to default Fleets branding when OpenRemote has no appearance config", () => {
    const preferences = createPreferencesFromOpenRemoteConfig(null, { realm: "master", managerUrl: "https://manager.example" });

    expect(preferences).toEqual(DEFAULT_APP_PREFERENCES);
  });
});
