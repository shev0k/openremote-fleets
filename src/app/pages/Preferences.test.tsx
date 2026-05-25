/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_APP_PREFERENCES, mergeAppPreferences, type AppPreferences } from "../../domain/models/preferences";
import type { PreferencesRepository } from "../../domain/repositories/preferencesRepository";
import type { AppServices } from "../../domain/services/appServices";
import { PassthroughFleetLiveStateService } from "../../domain/services/liveFleetStateService";
import { AppPreferencesProvider } from "../providers/AppPreferencesProvider";
import { AppServicesProvider } from "../providers/AppServicesProvider";
import { Preferences } from "./Preferences";

function createRepository(seed: AppPreferences): PreferencesRepository {
  let current = seed;

  return {
    getPreferences: vi.fn(async () => current),
    savePreferences: vi.fn(async (preferences) => {
      current = { ...preferences, source: "local" };
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

function renderPreferences(repository = createRepository(DEFAULT_APP_PREFERENCES)) {
  render(
    <MemoryRouter>
      <AppServicesProvider services={createServices(repository)}>
        <AppPreferencesProvider>
          <Preferences />
        </AppPreferencesProvider>
      </AppServicesProvider>
    </MemoryRouter>,
  );

  return repository;
}

describe("Preferences page", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    document.documentElement.removeAttribute("style");
    document.title = "";
  });

  it("renders global customization sections and OpenRemote source context", async () => {
    renderPreferences(
      createRepository(
        mergeAppPreferences(DEFAULT_APP_PREFERENCES, {
          source: "openRemote",
          branding: { applicationName: "Synced Logistics" },
        }),
      ),
    );

    expect(await screen.findByRole("heading", { name: "Preferences" })).toBeInTheDocument();
    expect(screen.getByText("Brand identity")).toBeInTheDocument();
    expect(screen.getByText("Theme colors")).toBeInTheDocument();
    expect(screen.getByText("Map colors")).toBeInTheDocument();
    expect(screen.getByText("Global behavior")).toBeInTheDocument();
    expect(screen.getByText(/Synced from OpenRemote/i)).toBeInTheDocument();
  });

  it("saves edited branding and behavior settings", async () => {
    const repository = renderPreferences();

    const appNameInput = await screen.findByLabelText("Application name");
    fireEvent.change(appNameInput, { target: { value: "North Fleet Control" } });
    fireEvent.click(screen.getByRole("button", { name: "12-hour" }));
    fireEvent.change(screen.getByLabelText("Moving vehicle color"), { target: { value: "#2374ab" } });
    fireEvent.click(screen.getByRole("button", { name: /save preferences/i }));

    await waitFor(() => expect(repository.savePreferences).toHaveBeenCalled());
    expect(repository.savePreferences).toHaveBeenCalledWith(
      expect.objectContaining({
        branding: expect.objectContaining({ applicationName: "North Fleet Control" }),
        behavior: expect.objectContaining({ timeFormat: "12h" }),
        mapColors: expect.objectContaining({ vehicleMoving: "#2374ab" }),
      }),
    );
  });

  it("keeps spaces while users type Brand Identity text fields", async () => {
    renderPreferences();

    const appNameInput = await screen.findByLabelText("Application name");
    fireEvent.change(appNameInput, { target: { value: "North" } });
    fireEvent.change(appNameInput, { target: { value: "North " } });

    expect(appNameInput).toHaveValue("North ");

    fireEvent.change(appNameInput, { target: { value: "North Fleet" } });
    expect(appNameInput).toHaveValue("North Fleet");

    const logoUrlInput = screen.getByLabelText("Logo URL");
    fireEvent.change(logoUrlInput, { target: { value: "https://cdn.example/North" } });
    fireEvent.change(logoUrlInput, { target: { value: "https://cdn.example/North " } });

    expect(logoUrlInput).toHaveValue("https://cdn.example/North ");
  });
});
