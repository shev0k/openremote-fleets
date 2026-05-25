import { describe, expect, it } from "vitest";
import { FleetAlert } from "../../../domain/models/alerts";
import { buildAlertFilterOptions, filterAlerts } from "./alertFilters";

const alerts: FleetAlert[] = [
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
    id: "alert-harbor-idle",
    severity: "medium",
    vehicleId: "veh-harbor-07",
    vehicleName: "Harbor 07",
    type: "Extended Idle",
    rule: "Ignition on for 20 min",
    timeIso: "2026-05-06T07:10:00.000Z",
    state: "Acknowledged",
    sourceAttribute: "ignition",
    sourceValue: true,
  },
  {
    id: "alert-nimbus-battery",
    severity: "low",
    vehicleId: "veh-nimbus-03",
    vehicleName: "Nimbus 03",
    type: "Tracker Battery Low",
    rule: "Battery < 25%",
    timeIso: "2026-04-30T11:00:00.000Z",
    state: "Resolved",
    sourceAttribute: "batteryLevel",
    sourceValue: 21,
  },
];

describe("alertFilters", () => {
  it("filters by vehicle, severity, state, type, date range, and search text", () => {
    const result = filterAlerts(
      alerts,
      {
        vehicleId: "veh-atlas-12",
        severity: "high",
        state: "Active",
        type: "Overspeed",
        dateRange: "today",
        searchQuery: "speed",
      },
      new Date("2026-05-06T12:00:00.000Z"),
    );

    expect(result.map((alert) => alert.id)).toEqual(["alert-atlas-speed"]);
  });

  it("searches operational metadata including rule and source attribute", () => {
    expect(
      filterAlerts(alerts, {
        vehicleId: "all",
        severity: "all",
        state: "all",
        type: "all",
        dateRange: "all",
        searchQuery: "batteryLevel",
      }).map((alert) => alert.id),
    ).toEqual(["alert-nimbus-battery"]);
  });

  it("builds vehicle and type options from alert data", () => {
    const options = buildAlertFilterOptions(alerts);

    expect(options.vehicles).toEqual([
      { id: "all", label: "All vehicles" },
      { id: "veh-atlas-12", label: "Atlas 12" },
      { id: "veh-harbor-07", label: "Harbor 07" },
      { id: "veh-nimbus-03", label: "Nimbus 03" },
    ]);
    expect(options.types).toEqual([
      { id: "all", label: "All types" },
      { id: "Extended Idle", label: "Extended Idle" },
      { id: "Overspeed", label: "Overspeed" },
      { id: "Tracker Battery Low", label: "Tracker Battery Low" },
    ]);
  });
});
