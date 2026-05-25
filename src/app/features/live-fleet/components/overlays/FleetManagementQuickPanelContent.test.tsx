/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Vehicle } from "../../../../../domain/models/vehicle";
import { FleetManagementQuickPanelContent } from "./FleetManagementQuickPanelContent";

const vehicles: Vehicle[] = [
  {
    id: "veh-atlas-12",
    name: "Atlas 12",
    plate: "BR-482-K",
    status: "moving",
    speedKph: 44,
    ignitionOn: true,
    latitude: 51.4416,
    longitude: 5.4697,
    heading: 92,
    lastUpdatedIso: "2026-05-06T08:45:00Z",
    driverName: "Mila Janssen",
    trackerId: "352093086403655",
    assetName: "Atlas Prime",
    assetClass: "truck",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 0,
    fuelLevelPercent: 68,
  },
  {
    id: "veh-nimbus-03",
    name: "Nimbus 03",
    plate: "PX-557-D",
    status: "alerting",
    speedKph: 0,
    ignitionOn: false,
    latitude: 51.4492,
    longitude: 5.4814,
    heading: 14,
    lastUpdatedIso: "2026-05-06T08:42:00Z",
    driverName: "Lotte Bakker",
    trackerId: "352093086403699",
    assetName: "Nimbus Service",
    assetClass: "van",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 2,
    fuelLevelPercent: 21,
  },
  {
    id: "veh-orion-09",
    name: "Orion 09",
    plate: "VD-921-L",
    status: "offline",
    speedKph: 0,
    ignitionOn: false,
    latitude: 51.4358,
    longitude: 5.4862,
    heading: 246,
    lastUpdatedIso: "2026-05-06T07:10:00Z",
    driverName: "Sam de Wit",
    trackerId: "352093086403744",
    assetName: "Orion Cargo",
    assetClass: "truck",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 0,
    fuelLevelPercent: 54,
  },
];

describe("FleetManagementQuickPanelContent", () => {
  afterEach(() => {
    cleanup();
  });

  it("surfaces operational fleet counts, attention vehicles, and pinned overlay actions", () => {
    const onSelectVehicle = vi.fn();
    const onPinVehicle = vi.fn();
    const onUnpinVehicle = vi.fn();

    render(
      <FleetManagementQuickPanelContent
        vehicles={vehicles}
        pinnedVehicleIds={["veh-atlas-12"]}
        focusedVehicleId="veh-atlas-12"
        onSelectVehicle={onSelectVehicle}
        onPinVehicle={onPinVehicle}
        onUnpinVehicle={onUnpinVehicle}
      />,
    );

    expect(screen.getByText("Operational snapshot")).toBeInTheDocument();
    expect(screen.getAllByText("Moving").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Alerting").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Offline").length).toBeGreaterThan(0);
    expect(screen.getByText("Attention queue")).toBeInTheDocument();
    expect(screen.getByText("Nimbus 03")).toBeInTheDocument();
    expect(screen.getByText(/2 alerts/)).toBeInTheDocument();
    expect(screen.getByText("Pinned overlays")).toBeInTheDocument();
    expect(screen.getAllByText("Atlas 12").length).toBeGreaterThan(0);
    expect(screen.getByText("Focused")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /focus nimbus 03/i }));
    expect(onSelectVehicle).toHaveBeenCalledWith("veh-nimbus-03");

    fireEvent.click(screen.getByRole("button", { name: /unpin atlas 12/i }));
    expect(onUnpinVehicle).toHaveBeenCalledWith("veh-atlas-12");
    expect(onPinVehicle).not.toHaveBeenCalled();
  });

  it("uses compact vehicle-overlay style cards for the operational snapshot", () => {
    render(
      <FleetManagementQuickPanelContent
        vehicles={vehicles}
        pinnedVehicleIds={["veh-atlas-12"]}
        focusedVehicleId="veh-atlas-12"
        onSelectVehicle={() => undefined}
        onPinVehicle={() => undefined}
        onUnpinVehicle={() => undefined}
      />,
    );

    expect(screen.getByTestId("fleet-management-summary-tracked")).toHaveClass("min-w-0");
    expect(screen.getByTestId("fleet-management-summary-moving")).toHaveClass("min-w-0");
    expect(screen.getByTestId("fleet-management-summary-alerting")).toHaveClass("min-w-0");
    expect(screen.getByTestId("fleet-management-summary-offline")).toHaveClass("min-w-0");
    expect(screen.getByTestId("fleet-management-summary-tracked-label")).toHaveClass("truncate");
  });

  it("shows a useful empty state when there are no attention vehicles or pinned overlays", () => {
    render(
      <FleetManagementQuickPanelContent
        vehicles={[vehicles[0]]}
        pinnedVehicleIds={[]}
        focusedVehicleId={null}
        onSelectVehicle={() => undefined}
        onPinVehicle={() => undefined}
        onUnpinVehicle={() => undefined}
      />,
    );

    expect(screen.getByText("No vehicles need operator attention.")).toBeInTheDocument();
    expect(screen.getByText("Pin a vehicle overlay to keep its live context available while working the map.")).toBeInTheDocument();
  });
});
