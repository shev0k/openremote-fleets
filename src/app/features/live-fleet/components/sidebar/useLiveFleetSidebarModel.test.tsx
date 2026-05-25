/* @vitest-environment jsdom */

/* ======== IMPORTS ======== */

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Vehicle } from "../../../../../domain/models/vehicle";
import { FLEET_FILTER_TABS, useLiveFleetSidebarModel } from "./useLiveFleetSidebarModel";

/* ======== HELPERS ======== */

function vehicle(overrides: Partial<Vehicle>): Vehicle {
  return {
    id: "veh-test",
    name: "Test Vehicle",
    plate: "BR-482-K",
    status: "moving",
    speedKph: 42,
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
    ...overrides,
  };
}

/* ======== TESTS ======== */

describe("useLiveFleetSidebarModel", () => {
  it("keeps the compact fleet filter set while grouping stationary states", () => {
    expect(FLEET_FILTER_TABS).toEqual(["All", "Moving", "Idle", "Alerting", "Offline"]);
  });

  it("filters fleet vehicles and orders only visible workspace widgets", () => {
    const { result } = renderHook(() =>
      useLiveFleetSidebarModel({
        dataMode: "mock",
        vehicles: [
          vehicle({ id: "veh-moving", name: "Moving", speedKph: 42 }),
          vehicle({ id: "veh-idle", name: "Idle", speedKph: 0, status: "idling" }),
          vehicle({ id: "veh-offline", name: "Offline", status: "offline", speedKph: 0 }),
        ],
        alerts: [],
        selectedVehicleId: "veh-moving",
        selectedVehicleFallback: null,
        route: null,
        selectedSegmentId: null,
        fleetFilter: "Moving",
        widgetOrderIds: ["tripHistory", "fleetList", "criticalAlerts"],
        visibleWidgetIds: ["fleetList", "criticalAlerts"],
      }),
    );

    expect(result.current.filteredFleetVehicles.map((entry) => entry.id)).toEqual(["veh-moving"]);
    expect(result.current.orderedVisibleWidgets).toEqual(["fleetList", "criticalAlerts"]);
    expect(result.current.selectedVehicle?.id).toBe("veh-moving");
  });

  it("groups idling, parked, and unknown-ignition stationary vehicles under the idle fleet filter", () => {
    const { result } = renderHook(() =>
      useLiveFleetSidebarModel({
        dataMode: "mock",
        vehicles: [
          vehicle({ id: "veh-moving", name: "Moving", status: "moving", speedKph: 42 }),
          vehicle({ id: "veh-idling", name: "Idling", status: "idling", speedKph: 0 }),
          vehicle({ id: "veh-parked", name: "Parked", status: "parked", speedKph: 0, ignitionOn: false }),
          vehicle({ id: "veh-stationary", name: "Stationary", status: "stationary", speedKph: 0 }),
          vehicle({ id: "veh-offline", name: "Offline", status: "offline", speedKph: 0 }),
        ],
        alerts: [],
        selectedVehicleId: null,
        selectedVehicleFallback: null,
        route: null,
        selectedSegmentId: null,
        fleetFilter: "Idle",
        widgetOrderIds: ["fleetList"],
        visibleWidgetIds: ["fleetList"],
      }),
    );

    expect(result.current.filteredFleetVehicles.map((entry) => entry.id)).toEqual([
      "veh-idling",
      "veh-parked",
      "veh-stationary",
    ]);
  });
});
