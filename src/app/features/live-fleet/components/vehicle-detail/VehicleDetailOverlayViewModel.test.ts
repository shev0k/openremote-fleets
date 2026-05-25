import { describe, expect, it } from "vitest";
import type { FleetAlert } from "../../../../../domain/models/alerts";
import type { Vehicle, VehicleDetail } from "../../../../../domain/models/vehicle";
import { buildVehicleDetailOverlayViewModel } from "./VehicleDetailOverlayViewModel";

const vehicle: Vehicle = {
  id: "veh-atlas-12",
  name: "Atlas 12",
  plate: "BR-482-K",
  status: "alerting",
  speedKph: 52,
  ignitionOn: true,
  latitude: 51.4416,
  longitude: 5.4697,
  hasLocation: true,
  heading: 92,
  lastUpdatedIso: "2026-03-29T09:12:00Z",
  driverName: "Mila Janssen",
  driverIdentifier: "0007104552",
  trackerId: "352093086403655",
  assetName: "Atlas Prime",
  assetClass: "truck",
  deviceType: "Teltonika FMC003",
  activeAlertCount: 2,
  fuelLevelPercent: 68,
  batteryLevelPercent: 93,
  teltonika: {
    imei: "352093086403655",
    model: "FMC003",
    protocol: "teltonika:tcp:avl",
    codec: "CODEC_8",
    timestampIso: "2026-03-29T09:12:00Z",
    attributes: {
      speed: { avlId: "24", attributeName: "speed", displayName: "Speed", value: 52, unit: "km/h", parameterGroup: "Permanent I/O elements", timestampIso: "2026-03-29T09:12:00Z" },
      ignition: { avlId: "239", attributeName: "ignition", displayName: "Ignition", value: true, parameterGroup: "Permanent I/O elements", timestampIso: "2026-03-29T09:12:00Z" },
      movement: { avlId: "240", attributeName: "movement", displayName: "Movement", value: true, parameterGroup: "Permanent I/O elements", timestampIso: "2026-03-29T09:12:00Z" },
      fuelLevel: { avlId: "48", attributeName: "fuelLevel", displayName: "Fuel Level", value: 68, unit: "%", parameterGroup: "Permanent I/O elements", timestampIso: "2026-03-29T09:12:00Z" },
      batteryLevel: { avlId: "113", attributeName: "batteryLevel", displayName: "Battery Level", value: 93, unit: "%", parameterGroup: "Permanent I/O elements", timestampIso: "2026-03-29T09:12:00Z" },
      externalVoltage: { avlId: "66", attributeName: "externalVoltage", displayName: "External Voltage", value: 12.18, unit: "V", parameterGroup: "Permanent I/O elements", timestampIso: "2026-03-29T09:12:00Z" },
    },
  },
};

const detail: VehicleDetail = {
  ...vehicle,
  lastCommunicationIso: "2026-03-29T09:12:00Z",
  gpsAccuracyMeters: 8,
  todayMileageKm: 142.6,
  odometerKm: 125442,
  fuelInTankLiters: 231,
  averageFuelConsumptionLitersPer100Km: 24.1,
  stoppedDurationMinutes: 36,
};

function createAlert(id: string, severity: FleetAlert["severity"], timeIso: string, state: FleetAlert["state"] = "Active"): FleetAlert {
  return {
    id,
    severity,
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    type: "Overspeed",
    rule: "Speed > 80 km/h",
    timeIso,
    state,
  };
}

describe("buildVehicleDetailOverlayViewModel", () => {
  it("sorts active alerts and returns telemetry metrics in display order", () => {
    const model = buildVehicleDetailOverlayViewModel({
      vehicle,
      detail,
      activeAlerts: [
        createAlert("warning", "medium", "2026-03-29T09:15:00Z"),
        createAlert("resolved", "high", "2026-03-29T09:20:00Z", "Resolved"),
        createAlert("critical", "high", "2026-03-29T09:10:00Z"),
        createAlert("low", "low", "2026-03-29T09:25:00Z"),
      ],
      googleMapsApiKey: "maps-test-key",
      formatTime: () => "09:12",
    });

    expect(model.title).toBe("Atlas 12");
    expect(model.subtitle).toBe("BR-482-K • Mila Janssen");
    expect(model.alerts.map((alert) => alert.id)).toEqual(["critical", "warning", "low"]);
    expect(model.metrics.map((metric) => metric.id)).toEqual(["speed", "fuelLevel", "batteryLevel", "ignition", "movement"]);
    expect(model.trackerAttributes.map((attribute) => attribute.attributeName)).toEqual([
      "speed",
      "ignition",
      "movement",
      "externalVoltage",
      "batteryLevel",
      "fuelLevel",
    ]);
    expect(model.canShowStreetView).toBe(true);
  });

  it("uses Driver ID detail and avoids placeholder identity summaries", () => {
    const model = buildVehicleDetailOverlayViewModel({
      vehicle: {
        ...vehicle,
        plate: "--",
        driverName: "Unassigned",
        driverIdentifier: "0007104552",
      },
      detail: {
        ...detail,
        plate: "--",
        driverName: "Unassigned",
        driverIdentifier: "0007104552",
      },
      activeAlerts: [],
      formatTime: () => "09:12",
    });

    expect(model.subtitle).toBe("Driver ID 0007104552");
    expect(model.trackerIdentityItems).toContainEqual({ label: "Driver ID", value: "0007104552" });
    expect(model.trackerIdentityItems).not.toContainEqual(expect.objectContaining({ label: "iButton" }));
  });

  it("limits operational context decimal telemetry to one fraction digit", () => {
    const model = buildVehicleDetailOverlayViewModel({
      vehicle: {
        ...vehicle,
        speedKph: 10.879381831888425,
        fuelLevelPercent: 62.733112413968904,
      },
      detail,
      activeAlerts: [],
      formatTime: () => "09:12",
    });

    expect(model.operationalContextItems.find((item) => item.id === "currentSpeed")?.value).toBe("10.9 km/h");
    expect(model.operationalContextItems.find((item) => item.id === "fuelLevel")?.value).toBe("62.7%");
    expect(model.operationalContextItems.find((item) => item.id === "alerts")?.value).toBe("2");
  });
});
