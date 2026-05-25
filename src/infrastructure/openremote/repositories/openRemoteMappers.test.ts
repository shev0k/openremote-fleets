import type { Asset, AssetDatapoint, SentAlarm } from "@openremote/model";
import { describe, expect, it } from "vitest";
import {
  createOpenRemoteFleetReportSnapshot,
  createOpenRemoteReportDefinitions,
  createOpenRemoteReportParameters,
  mapOpenRemoteAlarmToFleetAlert,
  mapOpenRemoteAssetToAssetDevice,
  mapOpenRemoteAssetToVehicle,
  mapOpenRemoteDatapointsToPlaybackRoute,
  mapOpenRemoteDatapointsToTelemetryTimeline,
  OPENREMOTE_PLAYBACK_ATTRIBUTE_NAMES,
  previewOpenRemoteReport,
} from "./openRemoteMappers";

const baseTimestamp = Date.parse("2026-03-29T09:12:00.000Z");

function attribute(value: unknown, timestamp = baseTimestamp) {
  return { value, timestamp };
}

function createTrackerAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: "or-asset-atlas",
    name: "Atlas <script>",
    type: "TeltonikaTrackerAsset",
    attributes: {
      imei: attribute("352093086403655"),
      protocol: attribute("teltonika:tcp:avl"),
      codec: attribute("CODEC_8"),
      model: attribute("FMC003"),
      gpsLocation: attribute({ latitude: 51.458188, longitude: 5.49321 }),
      speed: attribute(42),
      direction: attribute(274),
      ignition: attribute(true),
      movement: attribute(true),
      gsmSignal: attribute(4),
      externalVoltage: attribute(12.184),
      batteryVoltage: attribute(3.812),
      batteryCurrent: attribute(0.08),
      batteryLevel: attribute(93),
      gnssStatus: attribute(1),
      gnssHdop: attribute(0.8),
      satellites: attribute(16),
      totalOdometer: attribute(182_431_000),
      tripOdometer: attribute(84_200),
      fuelUsedGps: attribute(31.4),
      fuelRateGps: attribute(28.4),
      fuelLevel: attribute(68),
      eventTriggered: attribute(24),
      sleepMode: attribute(0),
      dataMode: attribute(1),
      engineRpm: attribute(1240),
      iButton: attribute("0007104552"),
      plate: attribute("BR-482-K"),
      driverName: attribute("Driver & Co"),
      assetClass: attribute("truck"),
      activeAlertCount: attribute(2),
      firmwareVersion: attribute("FMB.Ver.03.29.00"),
      connectionStatus: attribute("Connected"),
    },
    ...overrides,
  };
}

function datapoint(attributeName: string, timestampIso: string, value: unknown): AssetDatapoint {
  return {
    assetId: "or-asset-atlas",
    attributeName,
    timestamp: Date.parse(timestampIso),
    value,
  };
}

describe("OpenRemote real-mode mappers", () => {
  it("maps partial Teltonika asset attributes into an app-safe vehicle and detail shape", () => {
    const vehicle = mapOpenRemoteAssetToVehicle(createTrackerAsset());

    expect(vehicle).toMatchObject({
      id: "or-asset-atlas",
      name: "Atlas <script>",
      plate: "BR-482-K",
      status: "alerting",
      speedKph: 42,
      ignitionOn: true,
      latitude: 51.458188,
      longitude: 5.49321,
      hasLocation: true,
      heading: 274,
      driverName: "Driver & Co",
      driverIdentifier: "0007104552",
      trackerId: "352093086403655",
      assetClass: "truck",
      activeAlertCount: 2,
      fuelLevelPercent: 68,
      batteryLevelPercent: 93,
      telemetryQuality: {
        hasSpeed: true,
        hasIgnition: true,
        hasHeading: true,
        hasLocation: true,
      },
    });
    expect(vehicle.availableTelemetrySignals?.map((signal) => signal.id)).toEqual(
      expect.arrayContaining(["speed", "ignition", "movement", "fuelLevel", "batteryLevel", "engineRpm", "gnssHdop", "gsmSignal", "iButton"]),
    );
    expect(vehicle.latestTelemetrySamples?.map((sample) => sample.signalId)).toEqual(
      expect.arrayContaining(["speed", "externalVoltage", "totalOdometer", "alarm"]),
    );
    expect(vehicle.teltonika?.attributes.gpsLocation.value).toEqual({ latitude: 51.458188, longitude: 5.49321 });
  });

  it("keeps missing optional Teltonika attributes safe instead of throwing", () => {
    const vehicle = mapOpenRemoteAssetToVehicle({
      id: "or-minimal",
      name: "Minimal tracker",
      attributes: {
        imei: attribute("352093086403656"),
      },
    });

    expect(vehicle).toMatchObject({
      id: "or-minimal",
      name: "Minimal tracker",
      plate: "--",
      status: "stationary",
      latitude: 0,
      longitude: 0,
      hasLocation: false,
      speedKph: 0,
      ignitionOn: false,
      trackerId: "352093086403656",
      activeAlertCount: 0,
      telemetryQuality: {
        hasSpeed: false,
        hasIgnition: false,
        hasHeading: false,
        hasLocation: false,
      },
    });
    expect(vehicle.teltonika?.attributes.imei.value).toBe("352093086403656");
  });

  it("keeps iButton as a driver identifier instead of treating it as the driver name", () => {
    const attributes = { ...createTrackerAsset().attributes };
    delete attributes.driverName;
    delete attributes.plate;

    const vehicle = mapOpenRemoteAssetToVehicle(createTrackerAsset({
      attributes,
    }));

    expect(vehicle.driverName).toBe("Unassigned");
    expect(vehicle.driverIdentifier).toBe("0007104552");
    expect(vehicle.plate).toBe("--");
  });

  it("marks missing telemetry unknown without deriving a valid-location tracker as offline", () => {
    const vehicle = mapOpenRemoteAssetToVehicle({
      id: "or-location-only",
      name: "Location-only tracker",
      attributes: {
        gpsLocation: attribute({ latitude: 51.458188, longitude: 5.49321 }),
        activeAlertCount: attribute(0),
      },
    });

    expect(vehicle).toMatchObject({
      status: "stationary",
      speedKph: 0,
      ignitionOn: false,
      heading: 0,
      hasLocation: true,
      telemetryQuality: {
        hasSpeed: false,
        hasIgnition: false,
        hasHeading: false,
        hasLocation: true,
      },
    });
  });

  it("uses Manager-preprocessed location when gpsLocation is absent", () => {
    const attributes = { ...createTrackerAsset().attributes };
    delete attributes.gpsLocation;
    attributes.location = attribute({ type: "Point", coordinates: [5.49321, 51.458188] });
    attributes.activeAlertCount = attribute(0);

    const vehicle = mapOpenRemoteAssetToVehicle(createTrackerAsset({
      attributes,
    }));

    expect(vehicle).toMatchObject({
      latitude: 51.458188,
      longitude: 5.49321,
      hasLocation: true,
      status: "moving",
      telemetryQuality: {
        hasLocation: true,
      },
    });
  });

  it("keeps explicit zero coordinates distinct from missing GPS", () => {
    const vehicle = mapOpenRemoteAssetToVehicle(createTrackerAsset({
      attributes: {
        ...createTrackerAsset().attributes,
        gpsLocation: attribute({ latitude: 0, longitude: 0 }),
        activeAlertCount: attribute(0),
      },
    }));

    expect(vehicle).toMatchObject({
      latitude: 0,
      longitude: 0,
      hasLocation: true,
    });
  });

  it("coerces string booleans and string numbers from OpenRemote attributes", () => {
    const vehicle = mapOpenRemoteAssetToVehicle(createTrackerAsset({
      attributes: {
        ...createTrackerAsset().attributes,
        activeAlertCount: attribute("0"),
        batteryLevel: attribute("88"),
        fuelLevel: attribute("63"),
        ignition: attribute("yes"),
        movement: attribute("1"),
        speed: attribute("42.4"),
      },
    }));

    expect(vehicle).toMatchObject({
      activeAlertCount: 0,
      batteryLevelPercent: 88,
      fuelLevelPercent: 63,
      ignitionOn: true,
      speedKph: 42,
      status: "moving",
    });
  });

  it("parses GeoJSON point coordinates in longitude-latitude order", () => {
    const vehicle = mapOpenRemoteAssetToVehicle(createTrackerAsset({
      attributes: {
        ...createTrackerAsset().attributes,
        gpsLocation: attribute({ type: "Point", coordinates: [5.49321, 51.458188] }),
        activeAlertCount: attribute(0),
      },
    }));

    expect(vehicle).toMatchObject({
      latitude: 51.458188,
      longitude: 5.49321,
      hasLocation: true,
    });
    expect(vehicle.teltonika?.attributes.gpsLocation.value).toEqual({
      latitude: 51.458188,
      longitude: 5.49321,
    });
  });

  it("ignores invalid timestamps without throwing", () => {
    const asset = createTrackerAsset({
      createdOn: Number.NaN,
      attributes: {
        imei: attribute("352093086403656", Number.NaN),
        speed: attribute(24, Number.NaN),
      },
    });

    expect(() => mapOpenRemoteAssetToVehicle(asset)).not.toThrow();

    const vehicle = mapOpenRemoteAssetToVehicle(asset);
    expect(vehicle.lastUpdatedIso).toBe("1970-01-01T00:00:00.000Z");
    expect(vehicle.teltonika?.attributes.speed.timestampIso).toBe("1970-01-01T00:00:00.000Z");
  });

  it("maps the same OpenRemote asset into the Assets workspace shape", () => {
    const asset = mapOpenRemoteAssetToAssetDevice(createTrackerAsset());

    expect(asset).toMatchObject({
      id: "or-asset-atlas",
      assetName: "Atlas <script>",
      linkedVehicleName: "Atlas <script>",
      linkedVehiclePlate: "BR-482-K",
      trackerId: "352093086403655",
      deviceType: "Teltonika FMC003",
      signalStrengthPercent: 80,
      batteryPercent: 93,
      status: "Connected",
      firmwareVersion: "FMB.Ver.03.29.00",
    });
    expect(asset.metadata).toMatchObject({
      imei: "352093086403655",
      protocol: "teltonika:tcp:avl",
      codec: "CODEC_8",
      model: "FMC003",
    });
  });

  it("maps OpenRemote alarms into operational fleet alerts", () => {
    const alert = mapOpenRemoteAlarmToFleetAlert({
      id: 44,
      title: "Tracker Battery Low",
      content: "Battery < 25%",
      severity: "HIGH",
      status: "ACKNOWLEDGED",
      createdOn: baseTimestamp,
      sourceId: "batteryLevel",
      asset: [createTrackerAsset()],
    } as SentAlarm);

    expect(alert).toEqual({
      id: "44",
      severity: "high",
      vehicleId: "or-asset-atlas",
      vehicleName: "Atlas <script>",
      type: "Tracker Battery Low",
      rule: "Battery < 25%",
      timeIso: "2026-03-29T09:12:00.000Z",
      state: "Acknowledged",
      sourceAttribute: "batteryLevel",
      sourceValue: 93,
      speedKph: 42,
    });
  });

  it("maps speed-source OpenRemote alarms with alert-time speed context", () => {
    const alert = mapOpenRemoteAlarmToFleetAlert({
      id: 45,
      title: "Overspeed",
      content: "Speed > 80 km/h",
      severity: "HIGH",
      status: "OPEN",
      createdOn: baseTimestamp,
      sourceId: "speed",
      asset: [createTrackerAsset()],
    } as SentAlarm);

    expect(alert).toMatchObject({
      id: "45",
      severity: "high",
      vehicleId: "or-asset-atlas",
      type: "Overspeed",
      state: "Active",
      sourceAttribute: "speed",
      sourceValue: 42,
      speedKph: 42,
    });
  });

  it("maps linked asset speed onto non-speed alarms when the value is available", () => {
    const alert = mapOpenRemoteAlarmToFleetAlert({
      id: 46,
      title: "Route Deviation",
      content: "Outside planned route",
      severity: "HIGH",
      status: "OPEN",
      createdOn: baseTimestamp,
      sourceId: "gpsLocation",
      asset: [createTrackerAsset()],
    } as SentAlarm);

    expect(alert).toMatchObject({
      id: "46",
      type: "Route Deviation",
      sourceAttribute: "gpsLocation",
      speedKph: 42,
    });
  });

  it("normalizes LOW and MEDIUM alarm severities", () => {
    const lowAlert = mapOpenRemoteAlarmToFleetAlert({
      id: 47,
      title: "Low Signal",
      content: "Signal degraded",
      severity: "LOW",
      status: "OPEN",
      createdOn: baseTimestamp,
      asset: [createTrackerAsset()],
    } as SentAlarm);
    const mediumAlert = mapOpenRemoteAlarmToFleetAlert({
      id: 48,
      title: "Medium Signal",
      content: "Signal unstable",
      severity: "MEDIUM",
      status: "OPEN",
      createdOn: baseTimestamp,
      asset: [createTrackerAsset()],
    } as SentAlarm);

    expect(lowAlert.severity).toBe("low");
    expect(mediumAlert.severity).toBe("medium");
  });

  it("normalizes CLOSED and unknown alarm states", () => {
    const closedAlert = mapOpenRemoteAlarmToFleetAlert({
      id: 49,
      title: "Closed Alarm",
      content: "Resolved by Manager",
      severity: "HIGH",
      status: "CLOSED",
      createdOn: baseTimestamp,
      asset: [createTrackerAsset()],
    } as SentAlarm);
    const unknownAlert = mapOpenRemoteAlarmToFleetAlert({
      id: 50,
      title: "Unknown Alarm",
      content: "Unknown Manager state",
      severity: "HIGH",
      status: "SNOOZED",
      createdOn: baseTimestamp,
      asset: [createTrackerAsset()],
    } as unknown as SentAlarm);

    expect(closedAlert.state).toBe("Resolved");
    expect(unknownAlert.state).toBe("Active");
  });

  it("maps datapoint history into route segments and selectable telemetry timelines", () => {
    const history = {
      gpsLocation: [
        datapoint("gpsLocation", "2026-03-29T08:00:00.000Z", { latitude: 51.45, longitude: 5.49 }),
        datapoint("gpsLocation", "2026-03-29T08:05:00.000Z", { latitude: 51.46, longitude: 5.5 }),
      ],
      speed: [
        datapoint("speed", "2026-03-29T08:00:00.000Z", 20),
        datapoint("speed", "2026-03-29T08:05:00.000Z", 58),
      ],
      direction: [datapoint("direction", "2026-03-29T08:00:00.000Z", 90)],
      ignition: [datapoint("ignition", "2026-03-29T08:00:00.000Z", true)],
      movement: [datapoint("movement", "2026-03-29T08:00:00.000Z", true)],
      fuelLevel: [datapoint("fuelLevel", "2026-03-29T08:00:00.000Z", 68)],
    };

    const route = mapOpenRemoteDatapointsToPlaybackRoute("or-asset-atlas", history);
    const timeline = mapOpenRemoteDatapointsToTelemetryTimeline("or-asset-atlas", history, ["speed", "fuelLevel"]);

    expect(route?.points).toHaveLength(2);
    expect(route?.points[0]).toMatchObject({ speedKph: 20, directionDegrees: 90, ignitionOn: true, movement: true });
    expect(route?.tripSegments[0]).toMatchObject({
      id: "or-asset-atlas-segment-1",
      startTimeIso: "2026-03-29T08:00:00.000Z",
      endTimeIso: "2026-03-29T08:05:00.000Z",
      stopCount: 0,
      speedBand: "normal",
      state: "moving",
    });
    expect(route?.tripSegments[0].telemetrySamples?.map((sample) => sample.signalId)).toContain("fuelLevel");
    expect(timeline).toMatchObject({
      vehicleId: "or-asset-atlas",
      rangeStartIso: "2026-03-29T08:00:00.000Z",
      rangeEndIso: "2026-03-29T08:05:00.000Z",
    });
    expect(timeline?.samples.map((sample) => sample.signalId)).toEqual(["speed", "speed", "fuelLevel"]);
  });

  it("requests optional Teltonika playback attributes that can appear as timeline signals", () => {
    expect(OPENREMOTE_PLAYBACK_ATTRIBUTE_NAMES).toEqual(
      expect.arrayContaining([
        "trip",
        "batteryLevel",
        "engineRpm",
        "gnssHdop",
        "gsmSignal",
        "externalVoltage",
        "batteryVoltage",
        "batteryCurrent",
      ]),
    );
  });

  it("splits real playback by Teltonika trip state when the trip signal is available", () => {
    const history = {
      location: [
        datapoint("location", "2026-03-29T08:00:00.000Z", { type: "Point", coordinates: [5.49, 51.45] }),
        datapoint("location", "2026-03-29T08:01:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
        datapoint("location", "2026-03-29T08:02:00.000Z", { type: "Point", coordinates: [5.51, 51.47] }),
        datapoint("location", "2026-03-29T08:03:00.000Z", { type: "Point", coordinates: [5.51, 51.47] }),
        datapoint("location", "2026-03-29T08:04:00.000Z", { type: "Point", coordinates: [5.52, 51.48] }),
        datapoint("location", "2026-03-29T08:05:00.000Z", { type: "Point", coordinates: [5.53, 51.49] }),
      ],
      speed: [
        datapoint("speed", "2026-03-29T08:00:00.000Z", 32),
        datapoint("speed", "2026-03-29T08:01:00.000Z", 36),
        datapoint("speed", "2026-03-29T08:02:00.000Z", 0),
        datapoint("speed", "2026-03-29T08:03:00.000Z", 0),
        datapoint("speed", "2026-03-29T08:04:00.000Z", 28),
        datapoint("speed", "2026-03-29T08:05:00.000Z", 34),
      ],
      movement: [
        datapoint("movement", "2026-03-29T08:00:00.000Z", true),
        datapoint("movement", "2026-03-29T08:02:00.000Z", false),
        datapoint("movement", "2026-03-29T08:04:00.000Z", true),
      ],
      ignition: [datapoint("ignition", "2026-03-29T08:00:00.000Z", true)],
      trip: [
        datapoint("trip", "2026-03-29T08:00:00.000Z", true),
        datapoint("trip", "2026-03-29T08:02:00.000Z", false),
        datapoint("trip", "2026-03-29T08:04:00.000Z", true),
      ],
    };

    const route = mapOpenRemoteDatapointsToPlaybackRoute("or-asset-atlas", history);

    expect(route?.tripSegments).toHaveLength(2);
    expect(route?.tripSegments.map((segment) => [segment.startTimeIso, segment.endTimeIso])).toEqual([
      ["2026-03-29T08:00:00.000Z", "2026-03-29T08:02:00.000Z"],
      ["2026-03-29T08:04:00.000Z", "2026-03-29T08:05:00.000Z"],
    ]);
  });

  it("keeps a short stationary period inside a trip and creates stop and idle markers", () => {
    const history = {
      location: [
        datapoint("location", "2026-03-29T08:00:00.000Z", { type: "Point", coordinates: [5.49, 51.45] }),
        datapoint("location", "2026-03-29T08:01:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
        datapoint("location", "2026-03-29T08:02:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
        datapoint("location", "2026-03-29T08:07:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
        datapoint("location", "2026-03-29T08:08:00.000Z", { type: "Point", coordinates: [5.51, 51.47] }),
      ],
      speed: [
        datapoint("speed", "2026-03-29T08:00:00.000Z", 30),
        datapoint("speed", "2026-03-29T08:02:00.000Z", 0),
        datapoint("speed", "2026-03-29T08:07:00.000Z", 0),
        datapoint("speed", "2026-03-29T08:08:00.000Z", 34),
      ],
      ignition: [datapoint("ignition", "2026-03-29T08:00:00.000Z", true)],
      movement: [
        datapoint("movement", "2026-03-29T08:00:00.000Z", true),
        datapoint("movement", "2026-03-29T08:02:00.000Z", false),
        datapoint("movement", "2026-03-29T08:08:00.000Z", true),
      ],
      trip: [datapoint("trip", "2026-03-29T08:00:00.000Z", true)],
    };

    const route = mapOpenRemoteDatapointsToPlaybackRoute("or-asset-atlas", history);
    const markerTypes = route?.tripSegments.flatMap((segment) => segment.markers?.map((marker) => marker.type) ?? []);

    expect(route?.tripSegments).toHaveLength(1);
    expect(markerTypes).toEqual(expect.arrayContaining(["stop", "idle"]));
  });

  it("creates stop markers from the same stationary evidence used by stop counts", () => {
    const history = {
      location: [
        datapoint("location", "2026-03-29T08:00:00.000Z", { type: "Point", coordinates: [5.49, 51.45] }),
        datapoint("location", "2026-03-29T08:01:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
        datapoint("location", "2026-03-29T08:01:30.000Z", { type: "Point", coordinates: [5.501, 51.461] }),
      ],
      speed: [
        datapoint("speed", "2026-03-29T08:00:00.000Z", 30),
        datapoint("speed", "2026-03-29T08:01:00.000Z", 0),
        datapoint("speed", "2026-03-29T08:01:30.000Z", 28),
      ],
      ignition: [datapoint("ignition", "2026-03-29T08:00:00.000Z", true)],
      movement: [
        datapoint("movement", "2026-03-29T08:00:00.000Z", true),
        datapoint("movement", "2026-03-29T08:01:00.000Z", false),
        datapoint("movement", "2026-03-29T08:01:30.000Z", true),
      ],
      trip: [datapoint("trip", "2026-03-29T08:00:00.000Z", true)],
    };

    const route = mapOpenRemoteDatapointsToPlaybackRoute("or-asset-atlas", history);
    const markers = route?.tripSegments.flatMap((segment) => segment.markers ?? []) ?? [];

    expect(route?.tripSegments[0].stopCount).toBe(1);
    expect(markers).toContainEqual(expect.objectContaining({
      type: "stop",
      timestampIso: "2026-03-29T08:01:00.000Z",
    }));
    expect(markers.map((marker) => marker.type)).not.toContain("idle");
  });

  it("creates idle markers after two stationary ignition-on minutes", () => {
    const history = {
      location: [
        datapoint("location", "2026-03-29T08:00:00.000Z", { type: "Point", coordinates: [5.49, 51.45] }),
        datapoint("location", "2026-03-29T08:02:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
        datapoint("location", "2026-03-29T08:04:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
        datapoint("location", "2026-03-29T08:05:00.000Z", { type: "Point", coordinates: [5.51, 51.47] }),
      ],
      speed: [
        datapoint("speed", "2026-03-29T08:00:00.000Z", 28),
        datapoint("speed", "2026-03-29T08:02:00.000Z", 0),
        datapoint("speed", "2026-03-29T08:04:00.000Z", 0),
        datapoint("speed", "2026-03-29T08:05:00.000Z", 30),
      ],
      ignition: [datapoint("ignition", "2026-03-29T08:00:00.000Z", true)],
      movement: [
        datapoint("movement", "2026-03-29T08:00:00.000Z", true),
        datapoint("movement", "2026-03-29T08:02:00.000Z", false),
        datapoint("movement", "2026-03-29T08:05:00.000Z", true),
      ],
      trip: [datapoint("trip", "2026-03-29T08:00:00.000Z", true)],
    };

    const route = mapOpenRemoteDatapointsToPlaybackRoute("or-asset-atlas", history);
    const markers = route?.tripSegments.flatMap((segment) => segment.markers ?? []) ?? [];

    expect(markers).toContainEqual(expect.objectContaining({
      type: "idle",
      timestampIso: "2026-03-29T08:02:00.000Z",
      durationMinutes: 2,
    }));
    expect(markers.map((marker) => marker.type)).not.toContain("break");
  });

  it("creates break markers after ten stationary minutes even when ignition is off", () => {
    const history = {
      location: [
        datapoint("location", "2026-03-29T08:00:00.000Z", { type: "Point", coordinates: [5.49, 51.45] }),
        datapoint("location", "2026-03-29T08:02:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
        datapoint("location", "2026-03-29T08:12:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
        datapoint("location", "2026-03-29T08:13:00.000Z", { type: "Point", coordinates: [5.51, 51.47] }),
      ],
      speed: [
        datapoint("speed", "2026-03-29T08:00:00.000Z", 28),
        datapoint("speed", "2026-03-29T08:02:00.000Z", 0),
        datapoint("speed", "2026-03-29T08:12:00.000Z", 0),
        datapoint("speed", "2026-03-29T08:13:00.000Z", 30),
      ],
      ignition: [
        datapoint("ignition", "2026-03-29T08:00:00.000Z", true),
        datapoint("ignition", "2026-03-29T08:02:00.000Z", false),
        datapoint("ignition", "2026-03-29T08:13:00.000Z", true),
      ],
      movement: [
        datapoint("movement", "2026-03-29T08:00:00.000Z", true),
        datapoint("movement", "2026-03-29T08:02:00.000Z", false),
        datapoint("movement", "2026-03-29T08:13:00.000Z", true),
      ],
      trip: [datapoint("trip", "2026-03-29T08:00:00.000Z", true)],
    };

    const route = mapOpenRemoteDatapointsToPlaybackRoute("or-asset-atlas", history);
    const markers = route?.tripSegments.flatMap((segment) => segment.markers ?? []) ?? [];

    expect(markers).toContainEqual(expect.objectContaining({
      type: "break",
      timestampIso: "2026-03-29T08:02:00.000Z",
      durationMinutes: 10,
    }));
    expect(markers.map((marker) => marker.type)).not.toContain("idle");
  });

  it("falls back to movement history and splits after a long stationary break", () => {
    const history = {
      location: [
        datapoint("location", "2026-03-29T08:00:00.000Z", { type: "Point", coordinates: [5.49, 51.45] }),
        datapoint("location", "2026-03-29T08:01:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
        datapoint("location", "2026-03-29T08:02:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
        datapoint("location", "2026-03-29T08:17:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
        datapoint("location", "2026-03-29T08:18:00.000Z", { type: "Point", coordinates: [5.51, 51.47] }),
        datapoint("location", "2026-03-29T08:19:00.000Z", { type: "Point", coordinates: [5.52, 51.48] }),
      ],
      speed: [
        datapoint("speed", "2026-03-29T08:00:00.000Z", 35),
        datapoint("speed", "2026-03-29T08:02:00.000Z", 0),
        datapoint("speed", "2026-03-29T08:17:00.000Z", 0),
        datapoint("speed", "2026-03-29T08:18:00.000Z", 33),
      ],
      ignition: [datapoint("ignition", "2026-03-29T08:00:00.000Z", true)],
      movement: [
        datapoint("movement", "2026-03-29T08:00:00.000Z", true),
        datapoint("movement", "2026-03-29T08:02:00.000Z", false),
        datapoint("movement", "2026-03-29T08:18:00.000Z", true),
      ],
    };

    const route = mapOpenRemoteDatapointsToPlaybackRoute("or-asset-atlas", history);
    const markers = route?.tripSegments.flatMap((segment) => segment.markers ?? []);

    expect(route?.tripSegments).toHaveLength(2);
    expect(markers).toContainEqual(expect.objectContaining({ type: "break", durationMinutes: 15 }));
  });

  it("adds engine-off, offline, and degraded-signal markers from real datapoints", () => {
    const history = {
      location: [
        datapoint("location", "2026-03-29T08:00:00.000Z", { type: "Point", coordinates: [5.49, 51.45] }),
        datapoint("location", "2026-03-29T08:01:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
        datapoint("location", "2026-03-29T08:02:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
        datapoint("location", "2026-03-29T08:18:00.000Z", { type: "Point", coordinates: [5.51, 51.47] }),
        datapoint("location", "2026-03-29T08:19:00.000Z", { type: "Point", coordinates: [5.52, 51.48] }),
      ],
      speed: [
        datapoint("speed", "2026-03-29T08:00:00.000Z", 30),
        datapoint("speed", "2026-03-29T08:02:00.000Z", 0),
        datapoint("speed", "2026-03-29T08:18:00.000Z", 28),
      ],
      ignition: [
        datapoint("ignition", "2026-03-29T08:00:00.000Z", true),
        datapoint("ignition", "2026-03-29T08:02:00.000Z", false),
        datapoint("ignition", "2026-03-29T08:18:00.000Z", true),
      ],
      movement: [
        datapoint("movement", "2026-03-29T08:00:00.000Z", true),
        datapoint("movement", "2026-03-29T08:02:00.000Z", false),
        datapoint("movement", "2026-03-29T08:18:00.000Z", true),
      ],
      gsmSignal: [
        datapoint("gsmSignal", "2026-03-29T08:18:00.000Z", 2),
        datapoint("gsmSignal", "2026-03-29T08:19:00.000Z", 2),
      ],
      gnssHdop: [datapoint("gnssHdop", "2026-03-29T08:19:00.000Z", 3.4)],
    };

    const route = mapOpenRemoteDatapointsToPlaybackRoute("or-asset-atlas", history);
    const markerTypes = route?.tripSegments.flatMap((segment) => segment.markers?.map((marker) => marker.type) ?? []);

    expect(markerTypes).toEqual(expect.arrayContaining(["engineOff", "offline", "signal"]));
  });

  it("maps playback routes from Manager location datapoints when gpsLocation history is absent", () => {
    const history = {
      location: [
        datapoint("location", "2026-03-29T08:00:00.000Z", { type: "Point", coordinates: [5.49, 51.45] }),
        datapoint("location", "2026-03-29T08:05:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
      ],
      speed: [datapoint("speed", "2026-03-29T08:00:00.000Z", 20)],
    };

    const route = mapOpenRemoteDatapointsToPlaybackRoute("or-asset-atlas", history);

    expect(route?.points).toHaveLength(2);
    expect(route?.points[0]).toMatchObject({
      latitude: 51.45,
      longitude: 5.49,
      speedKph: 20,
    });
  });

  it("counts one continuous stationary period as one real-mode stop event", () => {
    const history = {
      location: [
        datapoint("location", "2026-03-29T08:00:00.000Z", { type: "Point", coordinates: [5.49, 51.45] }),
        datapoint("location", "2026-03-29T08:01:00.000Z", { type: "Point", coordinates: [5.49, 51.45] }),
        datapoint("location", "2026-03-29T08:02:00.000Z", { type: "Point", coordinates: [5.49, 51.45] }),
        datapoint("location", "2026-03-29T08:03:00.000Z", { type: "Point", coordinates: [5.49, 51.45] }),
      ],
      speed: [
        datapoint("speed", "2026-03-29T08:00:00.000Z", 0),
        datapoint("speed", "2026-03-29T08:01:00.000Z", 0),
        datapoint("speed", "2026-03-29T08:02:00.000Z", 0),
        datapoint("speed", "2026-03-29T08:03:00.000Z", 0),
      ],
      movement: [
        datapoint("movement", "2026-03-29T08:00:00.000Z", false),
        datapoint("movement", "2026-03-29T08:01:00.000Z", false),
        datapoint("movement", "2026-03-29T08:02:00.000Z", false),
        datapoint("movement", "2026-03-29T08:03:00.000Z", false),
      ],
    };

    const route = mapOpenRemoteDatapointsToPlaybackRoute("or-asset-atlas", history);

    expect(route?.tripSegments[0].stopCount).toBe(1);
  });

  it("does not count missing speed and movement history as stop events", () => {
    const history = {
      location: [
        datapoint("location", "2026-03-29T08:00:00.000Z", { type: "Point", coordinates: [5.49, 51.45] }),
        datapoint("location", "2026-03-29T08:01:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
        datapoint("location", "2026-03-29T08:02:00.000Z", { type: "Point", coordinates: [5.51, 51.47] }),
      ],
    };

    const route = mapOpenRemoteDatapointsToPlaybackRoute("or-asset-atlas", history);

    expect(route?.tripSegments[0].stopCount).toBe(0);
  });

  it("splits route history into separate trip segments across large datapoint gaps", () => {
    const history = {
      location: [
        datapoint("location", "2026-03-29T08:00:00.000Z", { type: "Point", coordinates: [5.49, 51.45] }),
        datapoint("location", "2026-03-29T08:05:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
        datapoint("location", "2026-03-29T09:00:00.000Z", { type: "Point", coordinates: [5.6, 51.55] }),
        datapoint("location", "2026-03-29T09:05:00.000Z", { type: "Point", coordinates: [5.61, 51.56] }),
      ],
      speed: [
        datapoint("speed", "2026-03-29T08:00:00.000Z", 20),
        datapoint("speed", "2026-03-29T08:05:00.000Z", 28),
        datapoint("speed", "2026-03-29T09:00:00.000Z", 32),
        datapoint("speed", "2026-03-29T09:05:00.000Z", 38),
      ],
    };

    const route = mapOpenRemoteDatapointsToPlaybackRoute("or-asset-atlas", history);

    expect(route?.points).toHaveLength(4);
    expect(route?.tripSegments).toHaveLength(2);
    expect(route?.tripSegments[0]).toMatchObject({
      id: "or-asset-atlas-segment-1",
      startTimeIso: "2026-03-29T08:00:00.000Z",
      endTimeIso: "2026-03-29T08:05:00.000Z",
      startProgressPercent: 0,
    });
    expect(route?.tripSegments[1]).toMatchObject({
      id: "or-asset-atlas-segment-2",
      startTimeIso: "2026-03-29T09:00:00.000Z",
      endTimeIso: "2026-03-29T09:05:00.000Z",
      endProgressPercent: 100,
    });
    expect(route?.tripSegments[0].endProgressPercent).toBeLessThan(route?.tripSegments[1].startProgressPercent ?? 0);
  });

  it("keeps the latest copy when Manager history contains exact duplicate route clusters", () => {
    const history = {
      location: [
        datapoint("location", "2026-03-29T08:00:00.000Z", { type: "Point", coordinates: [5.49, 51.45] }),
        datapoint("location", "2026-03-29T08:05:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
        datapoint("location", "2026-03-29T11:00:00.000Z", { type: "Point", coordinates: [5.49, 51.45] }),
        datapoint("location", "2026-03-29T11:05:00.000Z", { type: "Point", coordinates: [5.5, 51.46] }),
      ],
      speed: [
        datapoint("speed", "2026-03-29T08:00:00.000Z", 20),
        datapoint("speed", "2026-03-29T08:05:00.000Z", 28),
        datapoint("speed", "2026-03-29T11:00:00.000Z", 20),
        datapoint("speed", "2026-03-29T11:05:00.000Z", 28),
      ],
    };

    const route = mapOpenRemoteDatapointsToPlaybackRoute("or-asset-atlas", history);

    expect(route?.points.map((point) => point.timestampIso)).toEqual([
      "2026-03-29T11:00:00.000Z",
      "2026-03-29T11:05:00.000Z",
    ]);
    expect(route?.tripSegments).toHaveLength(1);
    expect(route?.tripSegments[0]).toMatchObject({
      id: "or-asset-atlas-segment-1",
      startTimeIso: "2026-03-29T11:00:00.000Z",
      endTimeIso: "2026-03-29T11:05:00.000Z",
      startProgressPercent: 0,
      endProgressPercent: 100,
    });
  });

  it("derives full report definitions, parameters, snapshots, and previews from real asset telemetry", () => {
    const request = {
      definitionId: "fuel-management",
      period: { type: "preset" as const, preset: "today" as const },
      vehicleSelection: { mode: "all" as const },
      parameterIds: ["fuelLevel", "fuelRateGps", "tripOdometer", "speed"],
      outputMode: "preview" as const,
      includeSummary: true,
      includeCharts: true,
    };
    const assets = [createTrackerAsset()];

    expect(createOpenRemoteReportDefinitions().map((definition) => definition.id)).toEqual([
      "daily-summary",
      "alarms",
      "fuel-management",
      "asset-health",
      "trip-activity",
      "vehicle-stops",
      "telemetry-history",
      "driver-activity",
      "canbus-details",
      "temperature",
    ]);
    expect(createOpenRemoteReportDefinitions().every((definition) => (
      ["preview", "print", "export", "email", "schedule"] as const
    ).every((mode) => definition.supportedOutputModes.includes(mode)))).toBe(true);
    expect(createOpenRemoteReportParameters().map((parameter) => parameter.id)).toEqual(expect.arrayContaining(["speed", "fuelLevel", "gnssHdop"]));
    expect(createOpenRemoteFleetReportSnapshot(assets)).toMatchObject({
      metrics: {
        maxSpeedKph: 42,
        totalDistanceKm: 84,
      },
      dailyTrips: [],
      dailySpeed: [],
      mostActiveVehicles: [expect.objectContaining({ vehicleId: "Atlas <script>" })],
    });
    expect(previewOpenRemoteReport(request, assets)).toMatchObject({
      request,
      columns: [
        expect.objectContaining({ id: "fuelLevel" }),
        expect.objectContaining({ id: "fuelRateGps" }),
        expect.objectContaining({ id: "tripOdometer" }),
        expect.objectContaining({ id: "speed" }),
      ],
      rows: [
        {
          vehicleId: "or-asset-atlas",
          timestampIso: "2026-03-29T09:12:00.000Z",
          values: {
            fuelLevel: 68,
            fuelRateGps: 28.4,
            tripOdometer: 84200,
            speed: 42,
          },
        },
      ],
      summary: expect.objectContaining({
        vehicleCount: 1,
        parameterCount: 4,
      }),
    });
  });
});
