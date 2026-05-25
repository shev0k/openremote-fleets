import { describe, expect, it } from "vitest";
import type { TeltonikaAttributeValue, TeltonikaTrackerSnapshot } from "../../../domain/models/teltonika";
import type { Vehicle } from "../../../domain/models/vehicle";
import { getVehicleMapMarkerStatusMeta, resolveVehicleMapMarkerStatus } from "./vehicleMapMarkerStatus";

function teltonika(attributes: Record<string, TeltonikaAttributeValue>): TeltonikaTrackerSnapshot {
  return {
    imei: "352093086403655",
    model: "FMC003",
    protocol: "teltonika:tcp:avl",
    codec: "CODEC_8",
    timestampIso: "2026-05-15T08:00:00.000Z",
    attributes: Object.fromEntries(
      Object.entries(attributes).map(([attributeName, value]) => [
        attributeName,
        {
          avlId: attributeName,
          attributeName,
          displayName: attributeName,
          value,
          parameterGroup: "test",
          timestampIso: "2026-05-15T08:00:00.000Z",
        },
      ]),
    ),
  };
}

function vehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "veh-atlas-12",
    name: "Atlas 12",
    plate: "BR-482-K",
    status: "moving",
    speedKph: 32,
    ignitionOn: true,
    latitude: 51.45,
    longitude: 5.49,
    heading: 90,
    lastUpdatedIso: "2026-05-15T08:00:00.000Z",
    driverName: "Mila Janssen",
    trackerId: "352093086403655",
    assetName: "Atlas Prime",
    assetClass: "truck",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 0,
    teltonika: teltonika({
      speed: 32,
      ignition: true,
      movement: true,
      trip: true,
      gsmSignal: 5,
      gnssStatus: true,
      gnssHdop: 0.8,
      satellites: 12,
      dataMode: 1,
      sleepMode: 0,
    }),
    ...overrides,
  };
}

describe("vehicleMapMarkerStatus", () => {
  it("uses richer marker states without changing the domain vehicle status", () => {
    expect(
      resolveVehicleMapMarkerStatus(
        vehicle({
          status: "idling",
          speedKph: 0,
          ignitionOn: true,
          teltonika: teltonika({ speed: 0, ignition: true, movement: false, trip: false, dataMode: 1 }),
        }),
      ),
    ).toBe("driverBreak");
  });

  it("surfaces signal degradation for moving vehicles", () => {
    expect(
      getVehicleMapMarkerStatusMeta(
        vehicle({
          teltonika: teltonika({ speed: 31, ignition: true, movement: true, gsmSignal: 2, gnssStatus: true, gnssHdop: 0.8, satellites: 12 }),
        }),
      ),
    ).toMatchObject({ id: "signalDegraded", label: "Signal degraded" });
  });

  it("treats ignition-off stationary telemetry as parked", () => {
    expect(
      resolveVehicleMapMarkerStatus(
        vehicle({
          status: "parked",
          speedKph: 0,
          ignitionOn: false,
          teltonika: teltonika({ speed: 0, ignition: false, movement: false, dataMode: 1, sleepMode: 0, gnssStatus: true }),
        }),
      ),
    ).toBe("parked");
  });

  it("does not treat sleep mode, data mode, or missing GNSS alone as offline", () => {
    expect(
      resolveVehicleMapMarkerStatus(
        vehicle({
          status: "parked",
          speedKph: 0,
          ignitionOn: false,
          teltonika: teltonika({ speed: 0, ignition: false, movement: false, dataMode: 4, sleepMode: 2, gnssStatus: false }),
        }),
      ),
    ).toBe("parked");
  });

  it("keeps stationary vehicles with unknown ignition out of parked", () => {
    expect(
      resolveVehicleMapMarkerStatus(
        vehicle({
          status: "stationary",
          speedKph: 0,
          ignitionOn: false,
          telemetryQuality: { hasIgnition: false },
          teltonika: teltonika({ speed: 0, movement: false, gsmSignal: 5, gnssStatus: true, gnssHdop: 0.8, satellites: 12 }),
        }),
      ),
    ).toBe("stationary");
  });

  it("keeps explicit offline state offline", () => {
    expect(
      resolveVehicleMapMarkerStatus(
        vehicle({
          status: "offline",
          speedKph: 0,
          ignitionOn: false,
          teltonika: teltonika({ speed: 0, ignition: false, movement: false, dataMode: 4, sleepMode: 2, gnssStatus: false }),
        }),
      ),
    ).toBe("offline");
  });

  it("keeps alerting above all tracker-derived marker states", () => {
    expect(
      resolveVehicleMapMarkerStatus(
        vehicle({
          status: "alerting",
          activeAlertCount: 2,
          teltonika: teltonika({ speed: 0, ignition: true, movement: false, trip: false, gsmSignal: 1 }),
        }),
      ),
    ).toBe("alerting");
  });

  it("uses playback marker overrides after alerting priority", () => {
    expect(
      resolveVehicleMapMarkerStatus(
        vehicle({
          status: "moving",
          speedKph: 32,
          mapMarkerStatusOverride: "stopped",
          teltonika: teltonika({ speed: 32, ignition: true, movement: true, trip: true, gsmSignal: 5 }),
        }),
      ),
    ).toBe("stopped");

    expect(
      resolveVehicleMapMarkerStatus(
        vehicle({
          status: "alerting",
          activeAlertCount: 1,
          mapMarkerStatusOverride: "offline",
          teltonika: teltonika({ speed: 32, ignition: true, movement: true, trip: true, gsmSignal: 5 }),
        }),
      ),
    ).toBe("alerting");
  });
});
