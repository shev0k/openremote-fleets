/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_APP_PREFERENCES, mergeAppPreferences, type AppPreferences } from "../../domain/models/preferences";
import type { PreferencesRepository } from "../../domain/repositories/preferencesRepository";
import type { AppServices } from "../../domain/services/appServices";
import { PassthroughFleetLiveStateService } from "../../domain/services/liveFleetStateService";
import { AppPreferencesProvider, useAppPreferences } from "./AppPreferencesProvider";
import { AppServicesProvider } from "./AppServicesProvider";

function createRepository(seed: AppPreferences): PreferencesRepository {
  let current = seed;

  return {
    getPreferences: vi.fn(async () => current),
    savePreferences: vi.fn(async (preferences) => {
      current = preferences;
      return current;
    }),
    resetPreferences: vi.fn(async () => {
      current = DEFAULT_APP_PREFERENCES;
      return current;
    }),
  };
}

function createServices(preferencesRepository: PreferencesRepository): AppServices {
  return {
    dataMode: "mock",
    fleetRepository: {} as never,
    playbackRepository: {} as never,
    alertsRepository: {} as never,
    assetsRepository: {} as never,
    reportsRepository: {} as never,
    preferencesRepository,
    liveFleetStateService: new PassthroughFleetLiveStateService(),
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function Consumer() {
  const { preferences, isLoading, savePreferences, resetPreferences, formatTime } = useAppPreferences();

  return (
    <div>
      <span>{preferences.branding.applicationName}</span>
      <span>{formatTime(new Date("2026-05-08T14:05:00Z"), "UTC")}</span>
      <span data-testid="preferences-loading">{String(isLoading)}</span>
      <button
        type="button"
        onClick={() =>
          savePreferences(
            mergeAppPreferences(preferences, {
              branding: { applicationName: "Custom Fleet" },
              themeColors: { brand: "#123456" },
            }),
          )
        }
      >
        Save
      </button>
      <button type="button" onClick={() => resetPreferences()}>
        Reset
      </button>
    </div>
  );
}

function renderProvider(repository: PreferencesRepository, children: ReactNode = <Consumer />) {
  return render(
    <AppServicesProvider services={createServices(repository)}>
      <AppPreferencesProvider>{children}</AppPreferencesProvider>
    </AppServicesProvider>,
  );
}

describe("AppPreferencesProvider", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    document.documentElement.removeAttribute("style");
    document.title = "";
    document.querySelectorAll("link[rel~='icon']").forEach((link) => link.remove());
  });

  it("loads preferences and applies global title, favicon, and CSS variables", async () => {
    const repository = createRepository(
      mergeAppPreferences(DEFAULT_APP_PREFERENCES, {
        branding: {
          applicationName: "Synced Fleet",
          faviconUrl: "https://cdn.example/favicon.ico",
        },
        themeColors: { brand: "#2374ab" },
        mapColors: { vehicleMoving: "#2374ab" },
        behavior: { timeFormat: "12h" },
      }),
    );

    renderProvider(repository);

    expect(await screen.findByText("Synced Fleet")).toBeInTheDocument();
    expect(screen.getByText(/2:05 PM/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(document.title).toBe("Synced Fleet");
      expect(document.documentElement.style.getPropertyValue("--brand")).toBe("#2374ab");
      expect(document.documentElement.style.getPropertyValue("--map-vehicle-moving")).toBe("#2374ab");
      expect(document.querySelector<HTMLLinkElement>("link[rel~='icon']")?.href).toBe("https://cdn.example/favicon.ico");
    });
  });

  it("saves and resets preferences through the repository", async () => {
    const repository = createRepository(DEFAULT_APP_PREFERENCES);

    renderProvider(repository);

    await screen.findByText(DEFAULT_APP_PREFERENCES.branding.applicationName);
    await act(async () => {
      screen.getByRole("button", { name: "Save" }).click();
    });

    await waitFor(() => expect(screen.getByText("Custom Fleet")).toBeInTheDocument());
    expect(repository.savePreferences).toHaveBeenCalled();
    expect(document.documentElement.style.getPropertyValue("--brand")).toBe("#123456");

    await act(async () => {
      screen.getByRole("button", { name: "Reset" }).click();
    });

    await waitFor(() => expect(screen.getByText(DEFAULT_APP_PREFERENCES.branding.applicationName)).toBeInTheDocument());
    expect(repository.resetPreferences).toHaveBeenCalled();
  });

  it("does not let a stale initial load overwrite a newer save", async () => {
    const initialLoad = createDeferred<AppPreferences>();
    const slowRemotePreferences = mergeAppPreferences(DEFAULT_APP_PREFERENCES, {
      branding: { applicationName: "Slow Remote Fleet" },
    });
    const repository: PreferencesRepository = {
      getPreferences: vi.fn(() => initialLoad.promise),
      savePreferences: vi.fn(async (preferences) => preferences),
      resetPreferences: vi.fn(async () => DEFAULT_APP_PREFERENCES),
    };

    renderProvider(repository);

    await act(async () => {
      screen.getByRole("button", { name: "Save" }).click();
    });
    await waitFor(() => expect(screen.getByText("Custom Fleet")).toBeInTheDocument());

    await act(async () => {
      initialLoad.resolve(slowRemotePreferences);
      await initialLoad.promise;
    });

    expect(screen.getByText("Custom Fleet")).toBeInTheDocument();
    expect(screen.queryByText("Slow Remote Fleet")).not.toBeInTheDocument();
    expect(screen.getByTestId("preferences-loading")).toHaveTextContent("false");
  });
});
