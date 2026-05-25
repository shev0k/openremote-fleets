import { describe, expect, it } from "vitest";
import type { PlaybackRoute, TripSegment } from "../../../domain/models/playback";
import type { TeltonikaAttributeSample, TeltonikaAttributeValue } from "../../../domain/models/teltonika";
import type { Vehicle, VehicleDetail } from "../../../domain/models/vehicle";
import { buildLiveFleetHistoricalOverlayState } from "./liveFleetHistoricalOverlay";

function attribute<TValue extends TeltonikaAttributeValue>(
  attributeName: string,
  value: TValue,
  timestampIso = "2026-05-06T08:45:00.000Z",
): TeltonikaAttributeSample<TValue> {
  return {
    avlId: attributeName,
    attributeName,
    displayName: attributeName,
    parameterGroup: "Permanent I/O elements",
    value,
    timestampIso,
  };
}

const vehicle: Vehicle = {
  id: "veh-atlas-12",
  name: "Atlas 12",
  plate: "BR-482-K",
  status: "moving",
  speedKph: 42,
  ignitionOn: true,
  latitude: 51.4416,
  longitude: 5.4697,
  heading: 92,
  lastUpdatedIso: "2026-05-06T08:45:00.000Z",
  driverName: "Mila Janssen",
  trackerId: "352093086403655",
  assetName: "Atlas Prime",
  assetClass: "truck",
  deviceType: "Teltonika FMC003",
  activeAlertCount: 0,
  fuelLevelPercent: 72,
  batteryLevelPercent: 91,
  latestTelemetrySamples: [
    { signalId: "fuelLevel", value: 72, timestampIso: "2026-05-06T08:45:00.000Z", sourceAttribute: "fuelLevel" },
  ],
  teltonika: {
    imei: "352093086403655",
    model: "Teltonika FMC003",
    protocol: "teltonika:tcp:avl",
    codec: "CODEC_8",
    timestampIso: "2026-05-06T08:45:00.000Z",
    attributes: {
      speed: attribute("speed", 42),
      ignition: attribute("ignition", true),
      movement: attribute("movement", true),
      fuelLevel: attribute("fuelLevel", 72),
      batteryLevel: attribute("batteryLevel", 91),
      gnssHdop: attribute("gnssHdop", 0.8),
      totalOdometer: attribute("totalOdometer", 182431000),
      tripOdometer: attribute("tripOdometer", 84200),
      fuelRateGps: attribute("fuelRateGps", 28.4),
    },
  },
};

const detail: VehicleDetail = {
  ...vehicle,
  lastCommunicationIso: "2026-05-06T08:45:00.000Z",
  gpsAccuracyMeters: 8,
  todayMileageKm: 84.2,
  odometerKm: 182431,
  fuelInTankLiters: 246,
  averageFuelConsumptionLitersPer100Km: 28.4,
  stoppedDurationMinutes: 18,
};

const segment: TripSegment = {
  id: "trip-1",
  startLabel: "08:00",
  endLabel: "08:10",
  startTimeIso: "2026-05-06T08:00:00.000Z",
  endTimeIso: "2026-05-06T08:10:00.000Z",
  durationLabel: "10 min",
  durationMinutes: 10,
  distanceLabel: "5.2 km",
  distanceKm: 5.2,
  stopCount: 0,
  maxSpeedLabel: "30 km/h",
  maxSpeedKph: 30,
  averageSpeedLabel: "21 km/h",
  averageSpeedKph: 21,
  startProgressPercent: 0,
  endProgressPercent: 100,
  telemetrySamples: [
    { signalId: "speed", value: 12, timestampIso: "2026-05-06T08:00:00.000Z", sourceAttribute: "speed" },
    { signalId: "speed", value: 30, timestampIso: "2026-05-06T08:05:00.000Z", sourceAttribute: "speed" },
    { signalId: "ignition", value: true, timestampIso: "2026-05-06T08:00:00.000Z", sourceAttribute: "ignition" },
    { signalId: "movement", value: true, timestampIso: "2026-05-06T08:00:00.000Z", sourceAttribute: "movement" },
    { signalId: "fuelLevel", value: 72, timestampIso: "2026-05-06T08:00:00.000Z", sourceAttribute: "fuelLevel" },
    { signalId: "fuelLevel", value: 63, timestampIso: "2026-05-06T08:05:00.000Z", sourceAttribute: "fuelLevel" },
    { signalId: "batteryLevel", value: 91, timestampIso: "2026-05-06T08:00:00.000Z", sourceAttribute: "batteryLevel" },
    { signalId: "batteryLevel", value: 88, timestampIso: "2026-05-06T08:05:00.000Z", sourceAttribute: "batteryLevel" },
    { signalId: "gnssHdop", value: 1.1, timestampIso: "2026-05-06T08:05:00.000Z", sourceAttribute: "gnssHdop" },
    { signalId: "gnssStatus", value: false, timestampIso: "2026-05-06T08:05:00.000Z", sourceAttribute: "gnssStatus" },
    { signalId: "satellites", value: 14, timestampIso: "2026-05-06T08:05:00.000Z", sourceAttribute: "satellites" },
    {
      signalId: "totalOdometer",
      value: 182440000,
      timestampIso: "2026-05-06T08:05:00.000Z",
      sourceAttribute: "totalOdometer",
    },
    { signalId: "tripOdometer", value: 12400, timestampIso: "2026-05-06T08:05:00.000Z", sourceAttribute: "tripOdometer" },
    { signalId: "fuelRateGps", value: 24.8, timestampIso: "2026-05-06T08:05:00.000Z", sourceAttribute: "fuelRateGps" },
    { signalId: "fuelUsedGps", value: 3.2, timestampIso: "2026-05-06T08:05:00.000Z", sourceAttribute: "fuelUsedGps" },
  ],
};

const route: PlaybackRoute = {
  vehicleId: vehicle.id,
  points: [
    {
      latitude: 51.4416,
      longitude: 5.4697,
      timestampIso: "2026-05-06T08:00:00.000Z",
      speedKph: 12,
      directionDegrees: 92,
      ignitionOn: true,
      movement: true,
      gnssHdop: 0.8,
    },
    {
      latitude: 51.45,
      longitude: 5.48,
      timestampIso: "2026-05-06T08:05:00.000Z",
      speedKph: 30,
      directionDegrees: 96,
      ignitionOn: true,
      movement: true,
      gnssHdop: 1.1,
    },
  ],
  tripSegments: [segment],
};

describe("liveFleetHistoricalOverlay", () => {
  it("returns live values when the timeline is not inspecting history", () => {
    const result = buildLiveFleetHistoricalOverlayState({
      vehicle,
      detail,
      route,
      playbackProgress: 50,
      isTimelineInspecting: false,
    });

    expect(result.vehicle).toBe(vehicle);
    expect(result.detail).toBe(detail);
    expect(result.isHistorical).toBe(false);
  });

  it("returns live values when historical route context cannot apply", () => {
    expect(
      buildLiveFleetHistoricalOverlayState({
        vehicle,
        detail,
        route: null,
        playbackProgress: 50,
        isTimelineInspecting: true,
      }).vehicle,
    ).toBe(vehicle);

    expect(
      buildLiveFleetHistoricalOverlayState({
        vehicle,
        detail,
        route: { ...route, vehicleId: "veh-other" },
        playbackProgress: 50,
        isTimelineInspecting: true,
      }).detail,
    ).toBe(detail);

    expect(
      buildLiveFleetHistoricalOverlayState({
        vehicle,
        detail,
        route,
        playbackProgress: 99.5,
        isTimelineInspecting: true,
      }).isHistorical,
    ).toBe(false);
  });

  it("projects selected overlay vehicle and detail values from historical route telemetry", () => {
    const result = buildLiveFleetHistoricalOverlayState({
      vehicle,
      detail,
      route,
      playbackProgress: 50,
      isTimelineInspecting: true,
    });

    expect(result.isHistorical).toBe(true);
    expect(result.vehicle).toMatchObject({
      latitude: 51.45,
      longitude: 5.48,
      speedKph: 30,
      fuelLevelPercent: 63,
      batteryLevelPercent: 88,
      lastUpdatedIso: "2026-05-06T08:05:00.000Z",
    });
    expect(result.detail).toMatchObject({
      lastCommunicationIso: "2026-05-06T08:05:00.000Z",
      gpsAccuracyMeters: 11,
      todayMileageKm: 12.4,
      odometerKm: 182440,
      fuelInTankLiters: 246,
      averageFuelConsumptionLitersPer100Km: 24.8,
    });
    expect(result.vehicle.teltonika?.attributes.fuelLevel.value).toBe(63);
    expect(result.vehicle.latestTelemetrySamples?.some((sample) => sample.signalId === "fuelLevel" && sample.value === 63)).toBe(true);
  });

  it("projects historical GNSS diagnostic samples and fallback Teltonika fuel GPS metadata", () => {
    const { fuelRateGps: _fuelRateGps, ...attributesWithoutFuelRate } = vehicle.teltonika?.attributes ?? {};
    const result = buildLiveFleetHistoricalOverlayState({
      vehicle: {
        ...vehicle,
        latestTelemetrySamples: [],
        teltonika: vehicle.teltonika
          ? {
              ...vehicle.teltonika,
              attributes: attributesWithoutFuelRate,
            }
          : undefined,
      },
      detail,
      route,
      playbackProgress: 50,
      isTimelineInspecting: true,
    });

    expect(result.vehicle.latestTelemetrySamples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ signalId: "gnssStatus", value: false }),
        expect.objectContaining({ signalId: "satellites", value: 14 }),
        expect.objectContaining({ signalId: "fuelRateGps", value: 24.8 }),
        expect.objectContaining({ signalId: "fuelUsedGps", value: 3.2 }),
      ]),
    );
    expect(result.vehicle.teltonika?.attributes.gnssStatus).toMatchObject({
      avlId: "69",
      value: false,
      timestampIso: "2026-05-06T08:05:00.000Z",
    });
    expect(result.vehicle.teltonika?.attributes.satellites).toMatchObject({
      avlId: "sat",
      value: 14,
      timestampIso: "2026-05-06T08:05:00.000Z",
    });
    expect(result.vehicle.teltonika?.attributes.fuelRateGps).toMatchObject({
      avlId: "13",
      value: 24.8,
      unit: "l/100km",
      timestampIso: "2026-05-06T08:05:00.000Z",
    });
    expect(result.vehicle.teltonika?.attributes.fuelUsedGps).toMatchObject({
      avlId: "12",
      value: 3.2,
      unit: "l",
      timestampIso: "2026-05-06T08:05:00.000Z",
    });
  });

  it("interpolates direct route telemetry samples across sub-percent progress ranges", () => {
    const narrowSegment: TripSegment = {
      ...segment,
      id: "trip-narrow",
      startTimeIso: "2026-05-06T08:00:00.000Z",
      endTimeIso: "2026-05-06T08:00:30.000Z",
      startProgressPercent: 0,
      endProgressPercent: 0.5,
      telemetrySamples: [
        { signalId: "fuelUsedGps", value: 0, timestampIso: "2026-05-06T08:00:00.000Z", sourceAttribute: "fuelUsedGps" },
        { signalId: "fuelUsedGps", value: 10, timestampIso: "2026-05-06T08:00:30.000Z", sourceAttribute: "fuelUsedGps" },
      ],
    };
    const narrowRoute: PlaybackRoute = {
      ...route,
      points: [
        {
          latitude: 51.4416,
          longitude: 5.4697,
          timestampIso: "2026-05-06T08:00:00.000Z",
          speedKph: 12,
          directionDegrees: 92,
          ignitionOn: true,
          movement: true,
        },
        {
          latitude: 51.45,
          longitude: 5.48,
          timestampIso: "2026-05-06T08:00:30.000Z",
          speedKph: 30,
          directionDegrees: 96,
          ignitionOn: true,
          movement: true,
        },
      ],
      tripSegments: [narrowSegment],
    };

    const result = buildLiveFleetHistoricalOverlayState({
      vehicle,
      detail,
      route: narrowRoute,
      playbackProgress: 0.25,
      isTimelineInspecting: true,
    });

    expect(result.vehicle.latestTelemetrySamples).toEqual(
      expect.arrayContaining([expect.objectContaining({ signalId: "fuelUsedGps", value: 5 })]),
    );
    expect(result.vehicle.teltonika?.attributes.fuelUsedGps).toMatchObject({
      value: 5,
      timestampIso: "2026-05-06T08:00:15.000Z",
    });
  });
});
