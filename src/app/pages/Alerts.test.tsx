/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppServices } from "../../domain/services/appServices";
import { PassthroughFleetLiveStateService } from "../../domain/services/liveFleetStateService";
import { FleetAlert } from "../../domain/models/alerts";
import { AppServicesProvider } from "../providers/AppServicesProvider";
import { AlertsProvider } from "../contexts/AlertsContext";
import { Alerts } from "./Alerts";

const mockAlerts: FleetAlert[] = [
  {
    id: "alert-atlas-speed",
    severity: "high",
    vehicleId: "veh-atlas-12",
    vehicleName: "Atlas 12",
    type: "Overspeed",
    rule: "Speed > 80 km/h",
    timeIso: "2026-05-06T08:30:00.000Z",
    state: "Active",
    sourceAttribute: "speed",
    sourceValue: 92,
  },
  {
    id: "alert-atlas-stopped",
    severity: "medium",
    vehicleId: "veh-atlas-12",
    vehicleName: "Atlas 12",
    type: "Stopped",
    rule: "movement is false",
    timeIso: "2026-05-06T08:31:00.000Z",
    state: "Active",
    sourceAttribute: "movement",
    sourceValue: false,
  },
  {
    id: "alert-atlas-zero-speed",
    severity: "low",
    vehicleId: "veh-atlas-12",
    vehicleName: "Atlas 12",
    type: "Speed zero",
    rule: "speed is 0",
    timeIso: "2026-05-06T08:32:00.000Z",
    state: "Active",
    sourceAttribute: "speed",
    sourceValue: 0,
  },
];

function renderAlerts() {
  const alertsRepository = {
    listAlerts: vi.fn().mockResolvedValue(mockAlerts),
    updateAlertState: vi.fn().mockResolvedValue(undefined),
  };
  const services = {
    dataMode: "mock",
    alertsRepository,
    fleetRepository: {} as never,
    playbackRepository: {} as never,
    assetsRepository: {} as never,
    reportsRepository: {} as never,
    preferencesRepository: {} as never,
    liveFleetStateService: new PassthroughFleetLiveStateService(),
  } satisfies AppServices;

  render(
    <AppServicesProvider services={services}>
      <AlertsProvider>
        <Alerts />
      </AlertsProvider>
    </AppServicesProvider>,
  );

  return alertsRepository;
}

describe("Alerts page", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps Fleets focused on operational alerts without rule-creation controls", async () => {
    renderAlerts();

    await waitFor(() => {
      expect(screen.getByText("Overspeed")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /create rule/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^rules/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Edit Alert Rule")).not.toBeInTheDocument();
  });

  it("shows valid falsy source values", async () => {
    renderAlerts();

    await waitFor(() => {
      expect(screen.getByText("Stopped")).toBeInTheDocument();
    });

    expect(screen.getByText("false")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
