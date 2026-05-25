import { describe, expect, it, vi } from "vitest";
import { DEFAULT_APP_PREFERENCES, mergeAppPreferences } from "../../domain/models/preferences";
import {
  APP_MOCK_PREFERENCES_STORAGE_KEY,
  APP_OPENREMOTE_PREFERENCES_STORAGE_KEY,
  buildOpenRemotePreferencesStorageKey,
  clearStoredPreferences,
  readStoredPreferences,
  writeStoredPreferences,
  type PreferencesStorage,
} from "./preferencesStorage";

function createMemoryStorage(): PreferencesStorage {
  const store = new Map<string, string>();

  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

describe("preferencesStorage", () => {
  it("keeps mock and real-mode local preference overrides in separate storage slots", () => {
    const storage = createMemoryStorage();
    const realOverride = mergeAppPreferences(DEFAULT_APP_PREFERENCES, {
      branding: { applicationName: "Real Fleet Override" },
      themeColors: { brand: "#123456" },
    });
    const mockOverride = mergeAppPreferences(DEFAULT_APP_PREFERENCES, {
      branding: { applicationName: "Mock Fleet Demo" },
      themeColors: { brand: "#abcdef" },
    });

    writeStoredPreferences(realOverride, storage, APP_OPENREMOTE_PREFERENCES_STORAGE_KEY);
    writeStoredPreferences(mockOverride, storage, APP_MOCK_PREFERENCES_STORAGE_KEY);

    expect(readStoredPreferences(DEFAULT_APP_PREFERENCES, storage, APP_OPENREMOTE_PREFERENCES_STORAGE_KEY)).toMatchObject({
      source: "local",
      branding: { applicationName: "Real Fleet Override" },
      themeColors: { brand: "#123456" },
    });
    expect(readStoredPreferences(DEFAULT_APP_PREFERENCES, storage, APP_MOCK_PREFERENCES_STORAGE_KEY)).toMatchObject({
      source: "local",
      branding: { applicationName: "Mock Fleet Demo" },
      themeColors: { brand: "#abcdef" },
    });

    clearStoredPreferences(storage, APP_MOCK_PREFERENCES_STORAGE_KEY);

    expect(readStoredPreferences(DEFAULT_APP_PREFERENCES, storage, APP_MOCK_PREFERENCES_STORAGE_KEY)).toBeNull();
    expect(readStoredPreferences(DEFAULT_APP_PREFERENCES, storage, APP_OPENREMOTE_PREFERENCES_STORAGE_KEY)).toMatchObject({
      branding: { applicationName: "Real Fleet Override" },
    });
  });

  it("builds stable real-mode storage keys per Manager URL and realm", () => {
    expect(buildOpenRemotePreferencesStorageKey({ managerUrl: "https://manager.example/", realm: "logistics" })).toBe(
      `${APP_OPENREMOTE_PREFERENCES_STORAGE_KEY}:https%3A%2F%2Fmanager.example:logistics`,
    );
    expect(buildOpenRemotePreferencesStorageKey({ managerUrl: "https://manager.example/", realm: "operations" })).toBe(
      `${APP_OPENREMOTE_PREFERENCES_STORAGE_KEY}:https%3A%2F%2Fmanager.example:operations`,
    );
  });

  it("treats blocked storage reads, writes, and clears as non-fatal fallbacks", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("blocked read");
      }),
      setItem: vi.fn(() => {
        throw new Error("quota exceeded");
      }),
      removeItem: vi.fn(() => {
        throw new Error("blocked clear");
      }),
    };
    const override = mergeAppPreferences(DEFAULT_APP_PREFERENCES, {
      branding: { applicationName: "Blocked Storage Fleet" },
    });

    expect(readStoredPreferences(DEFAULT_APP_PREFERENCES, storage, APP_MOCK_PREFERENCES_STORAGE_KEY)).toBeNull();
    expect(writeStoredPreferences(override, storage, APP_MOCK_PREFERENCES_STORAGE_KEY)).toMatchObject({
      source: "local",
      branding: { applicationName: "Blocked Storage Fleet" },
    });
    expect(() => clearStoredPreferences(storage, APP_MOCK_PREFERENCES_STORAGE_KEY)).not.toThrow();
  });

  it("ignores stored preference payloads that are not JSON objects", () => {
    const storage = createMemoryStorage();
    storage.setItem(APP_MOCK_PREFERENCES_STORAGE_KEY, '"not an object"');

    expect(readStoredPreferences(DEFAULT_APP_PREFERENCES, storage, APP_MOCK_PREFERENCES_STORAGE_KEY)).toBeNull();
  });
});
