import { describe, expect, it } from "vitest";
import { Vehicle } from "../../../domain/models/vehicle";
import { resolveVehicleMapMarkerStatus } from "../map/vehicleMapMarkerStatus";
import { buildRoutePlaybackVehicleViewModel, getPlaybackVehicleStatus } from "./routePlaybackVehicleViewModel";

const vehicle: Vehicle = {
  id: "veh-atlas-12",
  name: "Atlas 12",
  plate: "BR-482-K",
  status: "moving",
  speedKph: 28,
  ignitionOn: true,
  latitude: 51.4416,
  longitude: 5.4697,
  heading: 92,
  lastUpdatedIso: "2026-05-06T08:45:00Z",
  driverName: "Mila Janssen",
  driverIdentifier: "0007104552",
  trackerId: "352093086403655",
  assetName: "Atlas Prime",
  assetClass: "truck",
  deviceType: "Teltonika FMC003",
  activeAlertCount: 0,
  fuelLevelPercent: 68,
  teltonika: {
    imei: "352093086403655",
    model: "Teltonika FMC003",
    protocol: "tcp",
    codec: "CODEC_8",
    timestampIso: "2026-05-06T08:00:00.000Z",
    attributes: {
      gpsLocation: {
        avlId: "0",
        attributeName: "gpsLocation",
        displayName: "GPS location",
        value: { latitude: 51.4416, longitude: 5.4697 },
        parameterGroup: "Location",
        timestampIso: "2026-05-06T08:00:00.000Z",
      },
      speed: {
        avlId: "24",
        attributeName: "speed",
        displayName: "Speed",
        value: 28,
        unit: "km/h",
        parameterGroup: "GPS",
        timestampIso: "2026-05-06T08:00:00.000Z",
      },
      direction: {
        avlId: "239",
        attributeName: "direction",
        displayName: "Direction",
        value: 92,
        unit: "deg",
        parameterGroup: "GPS",
        timestampIso: "2026-05-06T08:00:00.000Z",
      },
      ignition: {
        avlId: "239",
        attributeName: "ignition",
        displayName: "Ignition",
        value: true,
        parameterGroup: "Permanent I/O elements",
        timestampIso: "2026-05-06T08:00:00.000Z",
      },
      movement: {
        avlId: "240",
        attributeName: "movement",
        displayName: "Movement",
        value: true,
        parameterGroup: "Permanent I/O elements",
        timestampIso: "2026-05-06T08:00:00.000Z",
      },
      priority: {
        avlId: "priority",
        attributeName: "priority",
        displayName: "Priority",
        value: 0,
        parameterGroup: "AVL packet",
        timestampIso: "2026-05-06T08:00:00.000Z",
      },
    },
  },
};

describe("routePlaybackVehicleViewModel", () => {
  it("derives playback status from reached alerts and movement threshold", () => {
    expect(getPlaybackVehicleStatus({ ...vehicle, status: "offline" }, 80, 4)).toBe("alerting");
    expect(getPlaybackVehicleStatus(vehicle, 0, 1)).toBe("alerting");
    expect(getPlaybackVehicleStatus(vehicle, 2, 0)).toBe("idling");
    expect(getPlaybackVehicleStatus(vehicle, 2.1, 0)).toBe("moving");
  });

  it("projects route position, timestamp, alert count, and heading onto the selected vehicle", () => {
    const playbackVehicle = buildRoutePlaybackVehicleViewModel({
      vehicle,
      playbackPosition: [51.45, 5.48],
      speedKph: 36,
      headingDegrees: 184,
      timestampIso: "2026-05-06T08:06:00.000Z",
      activeAlertCount: 2,
    });

    expect(playbackVehicle).toMatchObject({
      id: "veh-atlas-12",
      latitude: 51.45,
      longitude: 5.48,
      speedKph: 36,
      heading: 184,
      status: "alerting",
      ignitionOn: true,
      activeAlertCount: 2,
      lastUpdatedIso: "2026-05-06T08:06:00.000Z",
      teltonika: {
        timestampIso: "2026-05-06T08:06:00.000Z",
        attributes: {
          gpsLocation: expect.objectContaining({
            value: { latitude: 51.45, longitude: 5.48 },
            timestampIso: "2026-05-06T08:06:00.000Z",
          }),
          speed: expect.objectContaining({ value: 36, timestampIso: "2026-05-06T08:06:00.000Z" }),
          direction: expect.objectContaining({ value: 184, timestampIso: "2026-05-06T08:06:00.000Z" }),
          ignition: expect.objectContaining({ value: true, timestampIso: "2026-05-06T08:06:00.000Z" }),
          movement: expect.objectContaining({ value: true, timestampIso: "2026-05-06T08:06:00.000Z" }),
          priority: expect.objectContaining({ value: 1, timestampIso: "2026-05-06T08:06:00.000Z" }),
        },
      },
    });
  });

  it("uses route telemetry instead of current live offline status during playback", () => {
    const playbackVehicle = buildRoutePlaybackVehicleViewModel({
      vehicle: {
        ...vehicle,
        status: "offline",
        ignitionOn: false,
      },
      playbackPosition: [51.45, 5.48],
      speedKph: 36,
      headingDegrees: 184,
      timestampIso: "2026-05-06T08:06:00.000Z",
      activeAlertCount: 0,
      routeIgnitionOn: true,
      routeMovement: true,
    });

    expect(playbackVehicle).toMatchObject({
      status: "moving",
      ignitionOn: true,
      teltonika: {
        attributes: {
          ignition: expect.objectContaining({ value: true }),
          movement: expect.objectContaining({ value: true }),
        },
      },
    });
  });

  it("uses route speed when historical ignition and movement samples are unavailable", () => {
    const playbackVehicle = buildRoutePlaybackVehicleViewModel({
      vehicle: {
        ...vehicle,
        status: "offline",
        ignitionOn: false,
      },
      playbackPosition: [51.45, 5.48],
      speedKph: 36,
      headingDegrees: 184,
      timestampIso: "2026-05-06T08:06:00.000Z",
      activeAlertCount: 0,
      hasRouteTelemetry: true,
    });

    expect(playbackVehicle).toMatchObject({
      status: "moving",
      ignitionOn: true,
      teltonika: {
        attributes: {
          ignition: expect.objectContaining({ value: true }),
          movement: expect.objectContaining({ value: true }),
        },
      },
    });
  });

  it("keeps stationary speed-only route telemetry stationary instead of inheriting live offline", () => {
    const playbackVehicle = buildRoutePlaybackVehicleViewModel({
      vehicle: {
        ...vehicle,
        status: "offline",
        ignitionOn: false,
      },
      playbackPosition: [51.45, 5.48],
      speedKph: 0,
      headingDegrees: 184,
      timestampIso: "2026-05-06T08:06:00.000Z",
      activeAlertCount: 0,
      hasRouteTelemetry: true,
    });

    expect(playbackVehicle.status).toBe("stationary");
  });

  it("does not reuse stale live trip state as driver break during historical route playback", () => {
    const playbackVehicle = buildRoutePlaybackVehicleViewModel({
      vehicle: {
        ...vehicle,
        status: "idling",
        speedKph: 0,
        teltonika: {
          ...vehicle.teltonika!,
          attributes: {
            ...vehicle.teltonika!.attributes,
            speed: { ...vehicle.teltonika!.attributes.speed, value: 0 },
            movement: { ...vehicle.teltonika!.attributes.movement, value: false },
            trip: {
              avlId: "250",
              attributeName: "trip",
              displayName: "Trip",
              value: false,
              parameterGroup: "Permanent I/O elements",
              timestampIso: "2026-05-06T08:00:00.000Z",
            },
          },
        },
      },
      playbackPosition: [51.45, 5.48],
      speedKph: 0,
      headingDegrees: null,
      timestampIso: "2026-05-06T08:06:00.000Z",
      activeAlertCount: 0,
      hasRouteTelemetry: true,
      routeIgnitionOn: true,
      routeMovement: false,
    });

    expect(playbackVehicle.status).toBe("idling");
    expect(playbackVehicle.teltonika?.attributes.trip).toBeUndefined();
    expect(resolveVehicleMapMarkerStatus(playbackVehicle)).toBe("idling");
  });

  it("uses current route telemetry attributes when marker diagnostics are present in history", () => {
    const playbackVehicle = buildRoutePlaybackVehicleViewModel({
      vehicle: {
        ...vehicle,
        teltonika: {
          ...vehicle.teltonika!,
          attributes: {
            ...vehicle.teltonika!.attributes,
            trip: {
              avlId: "250",
              attributeName: "trip",
              displayName: "Trip",
              value: true,
              parameterGroup: "Permanent I/O elements",
              timestampIso: "2026-05-06T08:00:00.000Z",
            },
          },
        },
      },
      playbackPosition: [51.45, 5.48],
      speedKph: 0,
      headingDegrees: null,
      timestampIso: "2026-05-06T08:06:00.000Z",
      activeAlertCount: 0,
      hasRouteTelemetry: true,
      routeIgnitionOn: true,
      routeMovement: false,
      routeTrip: false,
      routeGsmSignal: 5,
      routeGnssStatus: true,
      routeGnssHdop: 0.8,
      routeSatellites: 10,
    });

    expect(playbackVehicle.teltonika?.attributes.trip).toMatchObject({
      value: false,
      timestampIso: "2026-05-06T08:06:00.000Z",
    });
    expect(playbackVehicle.teltonika?.attributes.gsmSignal).toMatchObject({
      value: 5,
      timestampIso: "2026-05-06T08:06:00.000Z",
    });
    expect(resolveVehicleMapMarkerStatus(playbackVehicle)).toBe("driverBreak");
  });

  it("uses route marker status overrides for playback states that are not point telemetry", () => {
    const movingRoutePointVehicle = {
      ...vehicle,
      speedKph: 32,
      ignitionOn: true,
      status: "moving" as const,
    };

    expect(
      resolveVehicleMapMarkerStatus(
        buildRoutePlaybackVehicleViewModel({
          vehicle: movingRoutePointVehicle,
          playbackPosition: [51.45, 5.48],
          speedKph: 32,
          headingDegrees: 184,
          timestampIso: "2026-05-06T08:06:00.000Z",
          activeAlertCount: 0,
          hasRouteTelemetry: true,
          routeIgnitionOn: true,
          routeMovement: true,
          routeMarkerStatus: "stopped",
        }),
      ),
    ).toBe("stopped");

    expect(
      resolveVehicleMapMarkerStatus(
        buildRoutePlaybackVehicleViewModel({
          vehicle: movingRoutePointVehicle,
          playbackPosition: [51.45, 5.48],
          speedKph: 32,
          headingDegrees: 184,
          timestampIso: "2026-05-06T08:06:00.000Z",
          activeAlertCount: 0,
          hasRouteTelemetry: true,
          routeIgnitionOn: true,
          routeMovement: true,
          routeMarkerStatus: "driverBreak",
        }),
      ),
    ).toBe("driverBreak");

    expect(
      resolveVehicleMapMarkerStatus(
        buildRoutePlaybackVehicleViewModel({
          vehicle: movingRoutePointVehicle,
          playbackPosition: [51.45, 5.48],
          speedKph: 32,
          headingDegrees: 184,
          timestampIso: "2026-05-06T08:06:00.000Z",
          activeAlertCount: 0,
          hasRouteTelemetry: true,
          routeIgnitionOn: true,
          routeMovement: true,
          routeMarkerStatus: "offline",
        }),
      ),
    ).toBe("offline");

    expect(
      resolveVehicleMapMarkerStatus(
        buildRoutePlaybackVehicleViewModel({
          vehicle: movingRoutePointVehicle,
          playbackPosition: [51.45, 5.48],
          speedKph: 32,
          headingDegrees: 184,
          timestampIso: "2026-05-06T08:06:00.000Z",
          activeAlertCount: 0,
          hasRouteTelemetry: true,
          routeIgnitionOn: true,
          routeMovement: true,
          routeMarkerStatus: "parked",
        }),
      ),
    ).toBe("parked");
  });

  it("does not mutate the source vehicle Teltonika snapshot", () => {
    const playbackVehicle = buildRoutePlaybackVehicleViewModel({
      vehicle,
      playbackPosition: [51.45, 5.48],
      speedKph: 0,
      headingDegrees: null,
      timestampIso: null,
      activeAlertCount: 0,
    });

    expect(playbackVehicle.teltonika?.attributes.speed.value).toBe(0);
    expect(vehicle.teltonika?.attributes.speed.value).toBe(28);
    expect(playbackVehicle.heading).toBe(92);
    expect(playbackVehicle.lastUpdatedIso).toBe(vehicle.lastUpdatedIso);
  });
});
