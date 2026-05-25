import { describe, expect, it } from "vitest";
import { PlaybackRoute, TripSegment } from "../../../domain/models/playback";
import {
  buildSegmentSignalRows,
  buildTimelineSignalRows,
  formatTimelineSignalValue,
  getTimelineSignalSnapshotAtProgress,
  getTimelineSignalValuesAtProgress,
  getTimelineTooltipTimestampIsoAtProgress,
  shouldUseFullTooltipTimestamp,
  getTimelineSignalOptions,
} from "./timelineSignalViewModel";

function createSegment(
  id: string,
  startProgressPercent: number,
  endProgressPercent: number,
  startTimeIso: string,
  endTimeIso: string,
  samples: TripSegment["telemetrySamples"],
): TripSegment {
  return {
    id,
    startLabel: startTimeIso.slice(11, 16),
    endLabel: endTimeIso.slice(11, 16),
    startTimeIso,
    endTimeIso,
    durationLabel: "20 min",
    durationMinutes: 20,
    distanceLabel: "4.2 km",
    distanceKm: 4.2,
    stopCount: 1,
    maxSpeedLabel: "48 km/h",
    maxSpeedKph: 48,
    averageSpeedLabel: "28 km/h",
    averageSpeedKph: 28,
    startProgressPercent,
    endProgressPercent,
    telemetrySamples: samples,
    eventMarkers: [
      {
        id: `${id}-alarm`,
        eventType: "harsh-braking",
        timestampIso: startTimeIso,
        label: "Harsh braking",
        severity: "warning",
        sourceAttribute: "alarm",
      },
    ],
  };
}

function createRoute(): PlaybackRoute {
  const tripOne = createSegment("trip-1", 0, 40, "2026-04-30T08:00:00.000Z", "2026-04-30T08:20:00.000Z", [
    { signalId: "speed", timestampIso: "2026-04-30T08:00:00.000Z", value: 0, sourceAttribute: "speed" },
    { signalId: "speed", timestampIso: "2026-04-30T08:10:00.000Z", value: 36, sourceAttribute: "speed" },
    { signalId: "ignition", timestampIso: "2026-04-30T08:00:00.000Z", value: true, sourceAttribute: "ignition" },
    { signalId: "movement", timestampIso: "2026-04-30T08:10:00.000Z", value: true, sourceAttribute: "movement" },
    { signalId: "fuelLevel", timestampIso: "2026-04-30T08:10:00.000Z", value: 72, sourceAttribute: "fuelLevel" },
    { signalId: "batteryLevel", timestampIso: "2026-04-30T08:10:00.000Z", value: 91, sourceAttribute: "batteryLevel" },
    { signalId: "engineRpm", timestampIso: "2026-04-30T08:10:00.000Z", value: 1450, sourceAttribute: "engineRpm" },
    { signalId: "gnssHdop", timestampIso: "2026-04-30T08:10:00.000Z", value: 0.8, sourceAttribute: "gnssHdop" },
    {
      signalId: "alarm",
      timestampIso: "2026-04-30T08:10:00.000Z",
      value: { eventType: "harsh-braking", severity: "warning" },
      sourceAttribute: "alarm",
    },
  ]);

  const tripSeven = createSegment("trip-7", 60, 100, "2026-05-06T09:00:00.000Z", "2026-05-06T09:20:00.000Z", [
    { signalId: "speed", timestampIso: "2026-05-06T09:10:00.000Z", value: 44, sourceAttribute: "speed" },
    { signalId: "ignition", timestampIso: "2026-05-06T09:10:00.000Z", value: false, sourceAttribute: "ignition" },
  ]);

  return {
    vehicleId: "veh-atlas-12",
    points: [
      { latitude: 51.44, longitude: 5.45, timestampIso: "2026-04-30T08:00:00.000Z", speedKph: 0 },
      { latitude: 51.45, longitude: 5.46, timestampIso: "2026-04-30T08:20:00.000Z", speedKph: 36 },
      { latitude: 51.46, longitude: 5.47, timestampIso: "2026-05-06T09:00:00.000Z", speedKph: 0 },
      { latitude: 51.47, longitude: 5.48, timestampIso: "2026-05-06T09:20:00.000Z", speedKph: 44 },
    ],
    tripSegments: [tripOne, tripSeven],
  };
}

describe("timelineSignalViewModel", () => {
  it("offers Teltonika-aligned timeline signals in a stable preferred order", () => {
    const options = getTimelineSignalOptions(createRoute());

    expect(options.map((option) => option.id)).toEqual([
      "ignition",
      "movement",
      "alarm",
      "speed",
      "fuelLevel",
      "batteryLevel",
      "engineRpm",
      "gnssHdop",
    ]);
  });

  it("builds single and multi signal rows from trip telemetry samples", () => {
    const route = createRoute();

    expect(buildTimelineSignalRows(route, ["speed", "ignition"], "single").map((row) => row.signalId)).toEqual(["speed"]);
    expect(buildTimelineSignalRows(route, ["speed", "ignition"], "multi").map((row) => row.signalId)).toEqual(["ignition", "speed"]);
  });

  it("maps sample progress inside each segment instead of across overnight gaps", () => {
    const route = createRoute();
    const speedRow = buildTimelineSignalRows(route, ["speed"], "single")[0];

    expect(speedRow.points.map((point) => Math.round(point.progressPercent))).toEqual([0, 20, 80]);
  });

  it("builds segment-only signal rows and event markers for the overlay", () => {
    const segment = createRoute().tripSegments[0];

    const rows = buildSegmentSignalRows(segment, ["speed", "alarm"], "multi");

    expect(rows.map((row) => row.signalId)).toEqual(["alarm", "speed"]);
    expect(rows[0].points[0]).toMatchObject({
      label: "Harsh braking",
      progressPercent: 50,
    });
  });

  it("uses route event markers as alarm signal samples when alarm datapoints are absent", () => {
    const route = createRoute();
    const routeWithMarkerOnlyAlarms = {
      ...route,
      tripSegments: route.tripSegments.map((segment) => ({
        ...segment,
        telemetrySamples: segment.telemetrySamples?.filter((sample) => sample.signalId !== "alarm") ?? [],
      })),
    };

    expect(getTimelineSignalOptions(routeWithMarkerOnlyAlarms).map((option) => option.id)).toContain("alarm");

    const rows = buildTimelineSignalRows(routeWithMarkerOnlyAlarms, ["alarm"], "single");

    expect(rows).toHaveLength(1);
    expect(rows[0].points[0]).toMatchObject({
      label: "Harsh braking",
      progressPercent: 0,
      severity: "warning",
    });
  });

  it("formats numeric, boolean, and event values consistently", () => {
    expect(formatTimelineSignalValue("speed", 34)).toBe("34 km/h");
    expect(formatTimelineSignalValue("ignition", false)).toBe("Off");
    expect(formatTimelineSignalValue("movement", true)).toBe("Moving");
    expect(formatTimelineSignalValue("alarm", { eventType: "harsh-braking", severity: "warning" })).toBe("Harsh braking");
  });

  it("resolves visible signal values at the current playback progress", () => {
    const rows = buildTimelineSignalRows(createRoute(), ["speed", "ignition"], "multi");

    expect(getTimelineSignalValuesAtProgress(rows, 20)).toEqual({
      ignition: "On",
      speed: "36 km/h",
    });
  });

  it("interpolates numeric signal values between telemetry samples", () => {
    const rows = buildTimelineSignalRows(createRoute(), ["speed"], "single");

    expect(getTimelineSignalValuesAtProgress(rows, 10)).toEqual({
      speed: "18 km/h",
    });
  });

  it("interpolates timeline-known numeric signals across sub-percent progress ranges", () => {
    const segment = createSegment(
      "trip-narrow",
      0,
      0.5,
      "2026-05-06T08:00:00.000Z",
      "2026-05-06T08:00:30.000Z",
      [
        { signalId: "fuelLevel", timestampIso: "2026-05-06T08:00:00.000Z", value: 0, sourceAttribute: "fuelLevel" },
        { signalId: "fuelLevel", timestampIso: "2026-05-06T08:00:30.000Z", value: 100, sourceAttribute: "fuelLevel" },
      ],
    );
    const rows = buildTimelineSignalRows(
      {
        vehicleId: "veh-atlas-12",
        points: [
          { latitude: 51.44, longitude: 5.45, timestampIso: "2026-05-06T08:00:00.000Z", speedKph: 0 },
          { latitude: 51.45, longitude: 5.46, timestampIso: "2026-05-06T08:00:30.000Z", speedKph: 0 },
        ],
        tripSegments: [segment],
      },
      ["fuelLevel"],
      "single",
    );

    expect(getTimelineSignalValuesAtProgress(rows, 0.25)).toEqual({ fuelLevel: "50 %" });
    expect(getTimelineSignalSnapshotAtProgress(rows, 0.25).fuelLevel).toMatchObject({
      value: 50,
      label: "50 %",
      timestampIso: "2026-05-06T08:00:15.000Z",
      sourceAttribute: "fuelLevel",
    });
    expect(getTimelineTooltipTimestampIsoAtProgress(rows, 0.25)).toBe("2026-05-06T08:00:15.000Z");
  });

  it("resolves raw signal snapshots at playback progress", () => {
    const rows = buildTimelineSignalRows(createRoute(), ["speed", "fuelLevel", "ignition"], "multi");

    expect(getTimelineSignalSnapshotAtProgress(rows, 10)).toMatchObject({
      speed: {
        value: 18,
        label: "18 km/h",
        sourceAttribute: "speed",
        timestampIso: "2026-04-30T08:05:00.000Z",
      },
      fuelLevel: {
        value: 72,
        label: "72 %",
        sourceAttribute: "fuelLevel",
        timestampIso: "2026-04-30T08:10:00.000Z",
      },
      ignition: {
        value: true,
        label: "On",
        sourceAttribute: "ignition",
        timestampIso: "2026-04-30T08:00:00.000Z",
      },
    });
  });

  it("uses the first telemetry sample at the trip start", () => {
    const rows = buildTimelineSignalRows(createRoute(), ["speed"], "single");

    expect(getTimelineSignalValuesAtProgress(rows, 0)).toEqual({
      speed: "0 km/h",
    });
  });

  it("resolves tooltip timestamps from the densest signal row", () => {
    const rows = buildTimelineSignalRows(createRoute(), ["speed", "ignition"], "multi");

    expect(getTimelineTooltipTimestampIsoAtProgress(rows, 10)).toBe("2026-04-30T08:05:00.000Z");
  });

  it("uses full tooltip timestamps when signal data spans multiple dates", () => {
    const rows = buildTimelineSignalRows(createRoute(), ["speed"], "single");
    const singleDayRows = buildTimelineSignalRows(
      {
        ...createRoute(),
        tripSegments: [createRoute().tripSegments[0]],
      },
      ["speed"],
      "single",
    );

    expect(shouldUseFullTooltipTimestamp(rows)).toBe(true);
    expect(shouldUseFullTooltipTimestamp(singleDayRows)).toBe(false);
  });
});
