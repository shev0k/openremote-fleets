import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveOpenRemoteConfig } from "./openRemoteConfig";

describe("resolveOpenRemoteConfig", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("provides the documented localhost defaults", () => {
    expect(resolveOpenRemoteConfig({})).toEqual(
      expect.objectContaining({
        managerUrl: "https://localhost",
        keycloakUrl: "https://localhost/auth",
        realm: "master",
        clientId: "openremote",
        autoLogin: true,
        consoleAutoEnable: false,
        skipFallbackToBasicAuth: true,
        auth: "KEYCLOAK",
      }),
    );
  });

  it("normalizes explicit environment overrides", () => {
    expect(
      resolveOpenRemoteConfig({
        VITE_OR_MANAGER_URL: "https://example.com/",
        VITE_OR_KEYCLOAK_URL: "https://auth.example.com/",
        VITE_OR_REALM: "fleets",
        VITE_OR_CLIENT_ID: "fleet-app",
      }),
    ).toEqual(
      expect.objectContaining({
        managerUrl: "https://example.com",
        keycloakUrl: "https://auth.example.com",
        realm: "fleets",
        clientId: "fleet-app",
      }),
    );
  });

  it("uses the local Vite origin as the manager base in browser dev mode when no override is provided", () => {
    vi.stubGlobal("window", {
      location: {
        protocol: "https:",
        hostname: "localhost",
        port: "5173",
        origin: "https://localhost:5173",
      },
    });

    expect(resolveOpenRemoteConfig({})).toEqual(
      expect.objectContaining({
        managerUrl: "https://localhost:5173",
        keycloakUrl: "https://localhost:5173/auth",
      }),
    );
  });

  it("prefers the local Vite proxy over the legacy localhost override in browser dev mode", () => {
    vi.stubGlobal("window", {
      location: {
        protocol: "https:",
        hostname: "localhost",
        port: "5173",
        origin: "https://localhost:5173",
      },
    });

    expect(
      resolveOpenRemoteConfig({
        VITE_OR_MANAGER_URL: "https://localhost",
        VITE_OR_KEYCLOAK_URL: "https://localhost/auth",
      }),
    ).toEqual(
      expect.objectContaining({
        managerUrl: "https://localhost:5173",
        keycloakUrl: "https://localhost:5173/auth",
      }),
    );
  });
});
