/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FleetAlert } from "../../domain/models/alerts";
import type { AlertsRepository } from "../../domain/repositories/alertsRepository";
import { AppServices } from "../../domain/services/appServices";
import { AppServicesProvider } from "../providers/AppServicesProvider";
import { AlertsProvider, useAlerts } from "./AlertsContext";

function activeAlert(overrides: Partial<FleetAlert> = {}): FleetAlert {
  return {
    id: "alert-speed",
    severity: "high",
    vehicleId: "veh-atlas-12",
    vehicleName: "Atlas 12",
    type: "Overspeed",
    rule: "Speed > 80 km/h",
    timeIso: "2026-05-08T10:00:00.000Z",
    state: "Active",
    ...overrides,
  };
}

function acknowledgedAlert(overrides: Partial<FleetAlert> = {}): FleetAlert {
  return activeAlert({ state: "Acknowledged", ...overrides });
}

function resolvedAlert(overrides: Partial<FleetAlert> = {}): FleetAlert {
  return activeAlert({ state: "Resolved", ...overrides });
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

function createAlertsRepository(overrides: Partial<AlertsRepository> = {}): AlertsRepository {
  return {
    listAlerts: vi.fn().mockResolvedValue([activeAlert()]),
    updateAlertState: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createServices(alertsRepository = createAlertsRepository()): AppServices {
  return {
    dataMode: "mock",
    alertsRepository,
    fleetRepository: {},
    playbackRepository: {},
    assetsRepository: {},
    reportsRepository: {},
    preferencesRepository: {},
  } as unknown as AppServices;
}

function AlertWorkflowProbe() {
  const context = useAlerts();
  const updateError = (context as typeof context & { updateError?: string | null }).updateError;

  return (
    <div>
      <output data-testid="alert-context-keys">{Object.keys(context).sort().join(",")}</output>
      <output data-testid="active-alerts-count">{context.activeAlertsCount}</output>
      <output data-testid="alert-state">{context.alerts[0]?.state ?? "none"}</output>
      {updateError ? <p role="alert">{updateError}</p> : null}
      <button type="button" onClick={() => void context.updateAlertState("alert-speed", "Acknowledged").catch(() => undefined)}>
        Acknowledge alert
      </button>
      <button type="button" onClick={() => void context.updateAlertState("alert-speed", "Resolved").catch(() => undefined)}>
        Resolve alert
      </button>
    </div>
  );
}

function renderAlertsProvider(services = createServices()) {
  render(
    <AppServicesProvider services={services}>
      <AlertsProvider>
        <AlertWorkflowProbe />
      </AlertsProvider>
    </AppServicesProvider>,
  );
}

describe("AlertsContext", () => {
  afterEach(() => {
    cleanup();
  });

  it("exposes repository-backed alert workflow without local-only critical acknowledgement state", () => {
    renderAlertsProvider();

    expect(screen.getByTestId("alert-context-keys").textContent).toBe(
      "activeAlertsCount,alerts,isLoading,refreshAlerts,updateAlertState,updateError",
    );
  });

  it("updates visible alert state optimistically and delegates the write to the repository", async () => {
    const write = createDeferred<void>();
    const alertsRepository = createAlertsRepository({
      listAlerts: vi.fn().mockResolvedValueOnce([activeAlert()]).mockResolvedValue([resolvedAlert()]),
      updateAlertState: vi.fn().mockReturnValue(write.promise),
    });
    renderAlertsProvider(createServices(alertsRepository));

    await waitFor(() => {
      expect(screen.getByTestId("active-alerts-count")).toHaveTextContent("1");
    });

    fireEvent.click(screen.getByRole("button", { name: /resolve alert/i }));

    await waitFor(() => {
      expect(screen.getByTestId("active-alerts-count")).toHaveTextContent("0");
    });
    expect(alertsRepository.updateAlertState).toHaveBeenCalledWith("alert-speed", "Resolved");

    write.resolve();
  });

  it("rolls back optimistic alert state and exposes an error when repository update fails", async () => {
    const write = createDeferred<void>();
    const alertsRepository = createAlertsRepository({
      updateAlertState: vi.fn().mockReturnValue(write.promise),
    });
    renderAlertsProvider(createServices(alertsRepository));

    await waitFor(() => {
      expect(screen.getByTestId("alert-state")).toHaveTextContent("Active");
    });

    fireEvent.click(screen.getByRole("button", { name: /acknowledge alert/i }));

    await waitFor(() => {
      expect(screen.getByTestId("alert-state")).toHaveTextContent("Acknowledged");
    });

    write.reject(new Error("write failed"));

    await waitFor(() => {
      expect(screen.getByTestId("alert-state")).toHaveTextContent("Active");
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/could not update alert/i);
  });

  it("refreshes alerts after a successful repository update", async () => {
    const alertsRepository = createAlertsRepository({
      listAlerts: vi.fn().mockResolvedValueOnce([activeAlert()]).mockResolvedValue([acknowledgedAlert()]),
      updateAlertState: vi.fn().mockResolvedValue(undefined),
    });
    renderAlertsProvider(createServices(alertsRepository));

    await waitFor(() => {
      expect(screen.getByTestId("alert-state")).toHaveTextContent("Active");
    });

    fireEvent.click(screen.getByRole("button", { name: /acknowledge alert/i }));

    await waitFor(() => {
      expect(alertsRepository.listAlerts).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByTestId("alert-state")).toHaveTextContent("Acknowledged");
  });
});
