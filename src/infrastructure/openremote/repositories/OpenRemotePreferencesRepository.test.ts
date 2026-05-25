import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_APP_PREFERENCES, mergeAppPreferences } from "../../../domain/models/preferences";
import { APP_MOCK_PREFERENCES_STORAGE_KEY, buildOpenRemotePreferencesStorageKey } from "../../repositories/preferencesStorage";
import { OpenRemotePreferencesRepository } from "./OpenRemotePreferencesRepository";
import type { OpenRemoteRuntime } from "../runtime/openRemoteRuntime";

function createRuntimeMock(ready = true) {
  return {
    ensureReady: vi.fn().mockResolvedValue(ready),
    getSessionSnapshot: vi.fn(() => ({ realm: "logistics" })),
    getManager: vi.fn(() => ({ managerUrl: "https://manager.example" })),
  } as unknown as OpenRemoteRuntime;
}

describe("OpenRemotePreferencesRepository", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("loads OpenRemote manager branding and maps it into preferences", async () => {
    const runtime = createRuntimeMock();
    const repository = new OpenRemotePreferencesRepository(
      runtime,
      {
        getManagerAppConfig: vi.fn().mockResolvedValue({
          realms: {
            logistics: {
              appTitle: "Logistics Control",
              logo: "/api/master/configuration/manager/image/logistics/logo.svg",
              favicon: "/api/master/configuration/manager/image/logistics/favicon.ico",
              styles: ":host > * { --or-app-color4: #2374ab; --or-app-color8: #ffffff; }",
            },
          },
        }),
      } as never,
    );

    await expect(repository.getPreferences()).resolves.toMatchObject({
      source: "openRemote",
      branding: {
        applicationName: "Logistics Control",
        logoUrl: "https://manager.example/api/master/configuration/manager/image/logistics/logo.svg",
      },
      themeColors: {
        brand: "#2374ab",
      },
    });
    expect(runtime.ensureReady).toHaveBeenCalledWith({ refreshSession: false });
  });

  it("falls back to default preferences when OpenRemote is unavailable", async () => {
    const repository = new OpenRemotePreferencesRepository(
      createRuntimeMock(false),
      { getManagerAppConfig: vi.fn() } as never,
    );

    await expect(repository.getPreferences()).resolves.toEqual(DEFAULT_APP_PREFERENCES);
  });

  it("keeps browser-local overrides available when OpenRemote is unavailable", async () => {
    const storedPreferences = mergeAppPreferences(DEFAULT_APP_PREFERENCES, {
      source: "local",
      branding: { applicationName: "Local Fleet" },
    });
    const storageKey = buildOpenRemotePreferencesStorageKey({
      managerUrl: "https://manager.example",
      realm: "logistics",
    });
    const storage = {
      getItem: vi.fn((key: string) => (key === storageKey ? JSON.stringify(storedPreferences) : null)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const repository = new OpenRemotePreferencesRepository(
      createRuntimeMock(false),
      { getManagerAppConfig: vi.fn() } as never,
      storage,
    );

    await expect(repository.getPreferences()).resolves.toMatchObject({
      source: "local",
      branding: { applicationName: "Local Fleet" },
    });
  });

  it("does not read mock-mode browser overrides in real mode", async () => {
    const mockStoredPreferences = mergeAppPreferences(DEFAULT_APP_PREFERENCES, {
      source: "local",
      branding: { applicationName: "Mock Mode Branding" },
    });
    const storage = {
      getItem: vi.fn((key: string) => (key === APP_MOCK_PREFERENCES_STORAGE_KEY ? JSON.stringify(mockStoredPreferences) : null)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const repository = new OpenRemotePreferencesRepository(
      createRuntimeMock(false),
      { getManagerAppConfig: vi.fn() } as never,
      storage,
    );

    await expect(repository.getPreferences()).resolves.toEqual(DEFAULT_APP_PREFERENCES);
  });

  it("suppresses console warnings outside development when OpenRemote preferences fail", async () => {
    vi.stubEnv("DEV", false);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const repository = new OpenRemotePreferencesRepository(
      createRuntimeMock(),
      { getManagerAppConfig: vi.fn().mockRejectedValue(new Error("config unavailable")) } as never,
    );

    await expect(repository.getPreferences()).resolves.toEqual(DEFAULT_APP_PREFERENCES);

    expect(warn).not.toHaveBeenCalled();
  });
});
