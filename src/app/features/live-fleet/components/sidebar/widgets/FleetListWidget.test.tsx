/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Vehicle } from "../../../../../../domain/models/vehicle";
import { FleetListWidget } from "./FleetListWidget";

const vehicles: Vehicle[] = [
  {
    id: "veh-atlas-12",
    name: "Atlas 12",
    plate: "BR-482-K",
    status: "moving",
    speedKph: 52,
    ignitionOn: true,
    latitude: 51.4416,
    longitude: 5.4697,
    heading: 92,
    lastUpdatedIso: "2026-03-29T09:12:00.000Z",
    driverName: "Mila Janssen",
    driverIdentifier: "0007104552",
    trackerId: "352093086403655",
    assetName: "Atlas Prime",
    assetClass: "truck",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 1,
    fuelLevelPercent: 68,
    batteryLevelPercent: 93,
  },
];

const manyVehicles: Vehicle[] = Array.from({ length: 12 }, (_, index) => ({
  ...vehicles[0],
  id: `vehicle-${index}`,
  name: `Vehicle ${index}`,
  trackerId: `35209308640365${index}`,
  speedKph: 20 + index,
}));

describe("FleetListWidget", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows status, tracker IMEI, last communication, and alert context in each row", () => {
    render(
      <FleetListWidget
        fleetFilterTabs={["All", "Moving"]}
        activeFilter="All"
        vehicles={vehicles}
        selectedVehicleId={null}
        isLoading={false}
        alertPreviewByVehicleId={{
          "veh-atlas-12": {
            type: "Fuel level",
            rule: "Fuel below threshold",
            timeIso: "2026-03-29T09:05:00.000Z",
            total: 1,
          },
        }}
        onFilterChange={vi.fn()}
        onSelectVehicle={vi.fn()}
      />,
    );

    expect(screen.getByText("Atlas 12")).toBeInTheDocument();
    expect(screen.getByText(/IMEI 352093086403655/)).toBeInTheDocument();
    expect(screen.getByText(/Last/)).toBeInTheDocument();
    expect(screen.getByText(/Fuel level/)).toBeInTheDocument();
  });

  it("does not render plate and driver placeholders in compact summaries", () => {
    render(
      <FleetListWidget
        fleetFilterTabs={["All", "Moving"]}
        activeFilter="All"
        vehicles={[{
          ...vehicles[0],
          plate: "--",
          driverName: "Unassigned",
          driverIdentifier: "0007104552",
        }]}
        selectedVehicleId={null}
        isLoading={false}
        onFilterChange={vi.fn()}
        onSelectVehicle={vi.fn()}
      />,
    );

    expect(screen.queryByText("-- • Unassigned")).not.toBeInTheDocument();
    expect(screen.getByText("Driver ID 0007104552")).toBeInTheDocument();
  });

  it("restores its scroll position after selection-driven refreshes", () => {
    const { rerender } = render(
      <FleetListWidget
        fleetFilterTabs={["All", "Moving"]}
        activeFilter="All"
        vehicles={manyVehicles}
        selectedVehicleId={null}
        isLoading={false}
        onFilterChange={vi.fn()}
        onSelectVehicle={vi.fn()}
      />,
    );

    const list = screen.getByTestId("fleet-list-scroll-region");
    list.scrollTop = 144;
    fireEvent.scroll(list);
    list.scrollTop = 0;

    rerender(
      <FleetListWidget
        fleetFilterTabs={["All", "Moving"]}
        activeFilter="All"
        vehicles={manyVehicles.map((vehicle) => ({ ...vehicle }))}
        selectedVehicleId="vehicle-8"
        isLoading={false}
        onFilterChange={vi.fn()}
        onSelectVehicle={vi.fn()}
      />,
    );

    expect(list.scrollTop).toBe(144);
  });

  it("scrolls the externally selected vehicle row into view", () => {
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    const { rerender } = render(
      <FleetListWidget
        fleetFilterTabs={["All", "Moving"]}
        activeFilter="All"
        vehicles={manyVehicles}
        selectedVehicleId={null}
        isLoading={false}
        onFilterChange={vi.fn()}
        onSelectVehicle={vi.fn()}
      />,
    );

    rerender(
      <FleetListWidget
        fleetFilterTabs={["All", "Moving"]}
        activeFilter="All"
        vehicles={manyVehicles}
        selectedVehicleId="vehicle-10"
        isLoading={false}
        onFilterChange={vi.fn()}
        onSelectVehicle={vi.fn()}
      />,
    );

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" });

    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });
});
