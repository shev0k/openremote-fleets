import { describe, expect, it } from "vitest";
import { FleetAlert } from "../../../domain/models/alerts";
import { Vehicle } from "../../../domain/models/vehicle";
import {
  applyLiveFleetAlertStateToVehicles,
  getCriticalLiveFleetAlerts,
  getTriggeredLiveFleetAlerts,
  getTriggeredLiveFleetAlertsCount,
} from "./liveFleetAlertViewModel";

const vehicles: Vehicle[] = [
  {
    id: "veh-delta-24",
    name: "Delta 24",
    plate: "BR-482-K",
    status: "moving",
    speedKph: 54,
    ignitionOn: true,
    latitude: 51.44,
    longitude: 5.46,
    heading: 92,
    lastUpdatedIso: "2026-03-29T08:20:00.000Z",
    driverName: "Mila Janssen",
    trackerId: "352093086403655",
    assetName: "Delta Prime",
    assetClass: "truck",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 0,
  },
  {
    id: "veh-courier-19",
    name: "Courier 19",
    plate: "CD-819-M",
    status: "alerting",
    speedKph: 62,
    ignitionOn: true,
    latitude: 51.45,
    longitude: 5.48,
    heading: 120,
    lastUpdatedIso: "2026-03-29T08:31:00.000Z",
    driverName: "Iris de Vries",
    trackerId: "352093086403656",
    assetName: "Courier Unit",
    assetClass: "van",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 1,
  },
];

const alerts: FleetAlert[] = [
  {
    id: "alert-pending-delta",
    severity: "high",
    vehicleId: "veh-delta-24",
    vehicleName: "Delta 24",
    type: "Overspeed",
    rule: "Speed > 80 km/h",
    timeIso: "2026-03-29T08:26:00.000Z",
    state: "Active",
  },
  {
    id: "alert-triggered-courier",
    severity: "high",
    vehicleId: "veh-courier-19",
    vehicleName: "Courier 19",
    type: "Harsh Braking",
    rule: "Deceleration > 6 m/s²",
    timeIso: "2026-03-29T08:29:00.000Z",
    state: "Active",
  },
  {
    id: "alert-resolved-courier",
    severity: "medium",
    vehicleId: "veh-courier-19",
    vehicleName: "Courier 19",
    type: "Tracker Battery Low",
    rule: "Battery < 25%",
    timeIso: "2026-03-29T08:27:00.000Z",
    state: "Resolved",
  },
];

describe("liveFleetAlertViewModel", () => {
  it("excludes active fixture alerts until the vehicle has triggered them in live state", () => {
    expect(getTriggeredLiveFleetAlerts(alerts, vehicles).map((alert) => alert.id)).toEqual(["alert-triggered-courier"]);
  });

  it("counts only triggered unresolved active alerts", () => {
    expect(getTriggeredLiveFleetAlertsCount(alerts, vehicles)).toBe(1);
  });

  it("keeps acknowledged critical alerts visible until resolved and orders them by newest alert time", () => {
    const projectedVehicles = applyLiveFleetAlertStateToVehicles(vehicles, [
      ...alerts,
      {
        id: "alert-acknowledged-courier",
        severity: "high",
        vehicleId: "veh-courier-19",
        vehicleName: "Courier 19",
        type: "Route Deviation",
        rule: "Unexpected deviation",
        timeIso: "2026-03-29T08:31:00.000Z",
        state: "Acknowledged",
      },
    ]);

    expect(getCriticalLiveFleetAlerts([...alerts, {
      id: "alert-acknowledged-courier",
      severity: "high",
      vehicleId: "veh-courier-19",
      vehicleName: "Courier 19",
      type: "Route Deviation",
      rule: "Unexpected deviation",
      timeIso: "2026-03-29T08:31:00.000Z",
      state: "Acknowledged",
    }], projectedVehicles).map((alert) => alert.id)).toEqual([
      "alert-acknowledged-courier",
      "alert-triggered-courier",
    ]);
  });

  it("does not promote vehicles from unresolved alerts before live state reaches the alert", () => {
    const projectedVehicles = applyLiveFleetAlertStateToVehicles(vehicles, alerts);

    expect(projectedVehicles.find((vehicle) => vehicle.id === "veh-delta-24")).toMatchObject({
      status: "moving",
      activeAlertCount: 0,
    });
    expect(projectedVehicles.find((vehicle) => vehicle.id === "veh-courier-19")).toMatchObject({
      status: "alerting",
      activeAlertCount: 1,
    });
  });

  it("can trust repository alert rows when real mode has no vehicle-side alert counter", () => {
    const projectedVehicles = applyLiveFleetAlertStateToVehicles(vehicles, [alerts[0]], { trustAlertRows: true });

    expect(projectedVehicles.find((vehicle) => vehicle.id === "veh-delta-24")).toMatchObject({
      status: "alerting",
      activeAlertCount: 1,
    });
    expect(getCriticalLiveFleetAlerts([alerts[0]], projectedVehicles, { trustAlertRows: true }).map((alert) => alert.id)).toEqual([
      "alert-pending-delta",
    ]);
  });

  it("clears stale alert counts from non-alerting vehicles without changing their base status", () => {
    const projectedVehicles = applyLiveFleetAlertStateToVehicles(
      [
        { ...vehicles[0], status: "idling", speedKph: 0, ignitionOn: false, activeAlertCount: 2 },
        { ...vehicles[1], status: "offline", speedKph: 0, ignitionOn: false, activeAlertCount: 1 },
      ],
      [],
    );

    expect(projectedVehicles).toEqual([
      expect.objectContaining({ id: "veh-delta-24", status: "idling", activeAlertCount: 0 }),
      expect.objectContaining({ id: "veh-courier-19", status: "offline", activeAlertCount: 0 }),
    ]);
  });

  it("clears alerting state after all known vehicle alerts are resolved", () => {
    const resolvedVehicles = applyLiveFleetAlertStateToVehicles(
      vehicles,
      alerts.map((alert) => ({ ...alert, state: "Resolved" })),
    );

    expect(resolvedVehicles.find((vehicle) => vehicle.id === "veh-courier-19")).toMatchObject({
      status: "moving",
      activeAlertCount: 0,
    });
  });

  it("returns unresolved critical alerts only for vehicles that reached alert state", () => {
    const projectedVehicles = applyLiveFleetAlertStateToVehicles(vehicles, alerts);

    expect(getCriticalLiveFleetAlerts(alerts, projectedVehicles).map((alert) => alert.id)).toEqual(["alert-triggered-courier"]);
  });
});
