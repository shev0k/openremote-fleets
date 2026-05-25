import { describe, expect, it } from "vitest";
import { PlaybackRoute, RouteSegmentMarkerType } from "../../../domain/models/playback";
import {
  formatDistanceLabel,
  formatDurationLabel,
  formatPlaybackTimeLabel,
  formatSpeedLabel,
  getCurrentRouteHeadingDegrees,
  getCurrentRouteSpeedKph,
  getCurrentRouteTelemetryState,
  getPlaybackProgressForRouteRefresh,
  getPlaybackProgressForRouteTimestamp,
  getPlaybackProgressStep,
  getPointIndex,
  interpolatePlaybackRoutePosition,
} from "./playbackUtils";

function createVariableSpeedRoute(): PlaybackRoute {
  return {
    vehicleId: "veh-test",
    points: [
      {
        latitude: 0,
        longitude: 0,
        timestampIso: "2026-03-29T08:00:00.000Z",
        speedKph: 10,
      },
      {
        latitude: 10,
        longitude: 0,
        timestampIso: "2026-03-29T08:10:00.000Z",
        speedKph: 50,
      },
      {
        latitude: 20,
        longitude: 0,
        timestampIso: "2026-03-29T09:00:00.000Z",
        speedKph: 5,
      },
    ],
    tripSegments: [],
  };
}

function createMultiDayRoute(): PlaybackRoute {
  return {
    vehicleId: "veh-multi-day",
    points: [
      {
        latitude: 0,
        longitude: 0,
        timestampIso: "2026-04-30T08:00:00.000Z",
        speedKph: 10,
      },
      {
        latitude: 0,
        longitude: 1,
        timestampIso: "2026-04-30T08:10:00.000Z",
        speedKph: 20,
      },
      {
        latitude: 10,
        longitude: 10,
        timestampIso: "2026-05-06T09:00:00.000Z",
        speedKph: 12,
      },
      {
        latitude: 10,
        longitude: 11,
        timestampIso: "2026-05-06T09:10:00.000Z",
        speedKph: 22,
      },
    ],
    tripSegments: [
      {
        id: "trip-1",
        startLabel: "08:00",
        endLabel: "08:10",
        startTimeIso: "2026-04-30T08:00:00.000Z",
        endTimeIso: "2026-04-30T08:10:00.000Z",
        durationLabel: "10 min",
        durationMinutes: 10,
        distanceLabel: "1.0 km",
        distanceKm: 1,
        stopCount: 0,
        maxSpeedLabel: "20 km/h",
        maxSpeedKph: 20,
        averageSpeedLabel: "15 km/h",
        averageSpeedKph: 15,
        startProgressPercent: 0,
        endProgressPercent: 50,
      },
      {
        id: "trip-2",
        startLabel: "09:00",
        endLabel: "09:10",
        startTimeIso: "2026-05-06T09:00:00.000Z",
        endTimeIso: "2026-05-06T09:10:00.000Z",
        durationLabel: "10 min",
        durationMinutes: 10,
        distanceLabel: "1.0 km",
        distanceKm: 1,
        stopCount: 0,
        maxSpeedLabel: "22 km/h",
        maxSpeedKph: 22,
        averageSpeedLabel: "16 km/h",
        averageSpeedKph: 16,
        startProgressPercent: 50,
        endProgressPercent: 100,
      },
    ],
  };
}

function createRouteWithMarker(
  type: RouteSegmentMarkerType,
  durationMinutes?: number,
): PlaybackRoute {
  return {
    vehicleId: "veh-marker-route",
    points: [
      {
        latitude: 0,
        longitude: 0,
        timestampIso: "2026-03-29T08:00:00.000Z",
        speedKph: 24,
        ignitionOn: true,
        movement: true,
      },
      {
        latitude: 0,
        longitude: 1,
        timestampIso: "2026-03-29T08:05:00.000Z",
        speedKph: 24,
        ignitionOn: true,
        movement: true,
      },
      {
        latitude: 0,
        longitude: 2,
        timestampIso: "2026-03-29T08:10:00.000Z",
        speedKph: 24,
        ignitionOn: true,
        movement: true,
      },
    ],
    tripSegments: [
      {
        id: "trip-marker",
        startLabel: "08:00",
        endLabel: "08:10",
        startTimeIso: "2026-03-29T08:00:00.000Z",
        endTimeIso: "2026-03-29T08:10:00.000Z",
        durationLabel: "10 min",
        durationMinutes: 10,
        distanceLabel: "2.0 km",
        distanceKm: 2,
        stopCount: type === "stop" ? 1 : 0,
        maxSpeedLabel: "24 km/h",
        maxSpeedKph: 24,
        averageSpeedLabel: "24 km/h",
        averageSpeedKph: 24,
        startProgressPercent: 0,
        endProgressPercent: 100,
        markers: [
          {
            id: `marker-${type}`,
            type,
            timestampIso: "2026-03-29T08:05:00.000Z",
            latitude: 0,
            longitude: 1,
            label: type,
            durationMinutes,
          },
        ],
      },
    ],
  };
}

describe("playback utilities", () => {
  it("formats shared route metric labels", () => {
    expect(formatDurationLabel(35)).toBe("35 min");
    expect(formatDurationLabel(125)).toBe("2h 5m");
    expect(formatDurationLabel(120)).toBe("2h");
    expect(formatDistanceLabel(4.246)).toBe("4.2 km");
    expect(formatSpeedLabel(48.4)).toBe("48 km/h");
  });

  it("resolves progress to a clamped route point index", () => {
    expect(getPointIndex(0, 50)).toBe(0);
    expect(getPointIndex(1, 50)).toBe(0);
    expect(getPointIndex(5, -20)).toBe(0);
    expect(getPointIndex(5, 100)).toBe(4);
    expect(getPointIndex(5, 50)).toBe(2);
  });

  it("formats UTC playback timestamps in the requested user timezone", () => {
    expect(formatPlaybackTimeLabel("2026-05-06T08:00:00.000Z", "Europe/Amsterdam")).toBe("10:00");
  });

  it("formats playback timestamps with the selected time preference", () => {
    expect(formatPlaybackTimeLabel("2026-05-06T08:00:00.000Z", "UTC", "12h")).toMatch(/8:00 AM/i);
  });

  it("interpolates the playback vehicle by route timestamps instead of point index", () => {
    const position = interpolatePlaybackRoutePosition(createVariableSpeedRoute(), 50);

    expect(position[0]).toBeCloseTo(14, 3);
    expect(position[1]).toBe(0);
  });

  it("uses route telemetry speed at the current playback time", () => {
    expect(getCurrentRouteSpeedKph(createVariableSpeedRoute(), 50)).toBe(32);
  });

  it("uses route telemetry state from the current playback point window", () => {
    const route = createVariableSpeedRoute();
    route.points[1].ignitionOn = true;
    route.points[1].movement = true;
    route.points[1].trip = true;
    route.points[1].gsmSignal = 4;
    route.points[1].gnssStatus = true;
    route.points[1].gnssHdop = 0.8;
    route.points[1].satellites = 10;
    route.points[2].ignitionOn = false;
    route.points[2].movement = false;
    route.points[2].trip = false;
    route.points[2].gsmSignal = 1;
    route.points[2].gnssStatus = false;
    route.points[2].gnssHdop = 6;
    route.points[2].satellites = 2;

    expect(getCurrentRouteTelemetryState(route, 50)).toEqual({
      ignitionOn: true,
      movement: true,
      trip: true,
      gsmSignal: 4,
      gnssStatus: true,
      gnssHdop: 0.8,
      satellites: 10,
    });
  });

  it("surfaces route marker states for the playback vehicle marker", () => {
    expect(getCurrentRouteTelemetryState(createRouteWithMarker("stop", 2), 50)?.markerStatus).toBe("stopped");
    expect(getCurrentRouteTelemetryState(createRouteWithMarker("break", 12), 50)?.markerStatus).toBe("driverBreak");
    expect(getCurrentRouteTelemetryState(createRouteWithMarker("offline", 12), 50)?.markerStatus).toBe("offline");
    expect(getCurrentRouteTelemetryState(createRouteWithMarker("engineOff"), 50)?.markerStatus).toBe("parked");
  });

  it("prioritizes stronger overlapping route marker states", () => {
    const route = createRouteWithMarker("stop", 12);
    route.tripSegments[0].markers?.push(
      {
        id: "marker-idle",
        type: "idle",
        timestampIso: "2026-03-29T08:05:00.000Z",
        latitude: 0,
        longitude: 1,
        label: "Idling",
        durationMinutes: 12,
      },
      {
        id: "marker-break",
        type: "break",
        timestampIso: "2026-03-29T08:05:00.000Z",
        latitude: 0,
        longitude: 1,
        label: "Driver break",
        durationMinutes: 12,
      },
    );

    expect(getCurrentRouteTelemetryState(route, 50)?.markerStatus).toBe("driverBreak");
  });

  it("uses a marker playback window separately from the displayed marker duration", () => {
    const route = createRouteWithMarker("break", 24);
    const marker = route.tripSegments[0].markers?.[0];
    if (!marker) {
      throw new Error("Expected marker.");
    }
    marker.playbackWindowMinutes = 1;

    expect(getCurrentRouteTelemetryState(route, 50)?.markerStatus).toBe("driverBreak");
    expect(getCurrentRouteTelemetryState(route, 72)?.markerStatus).toBeUndefined();
  });

  it("uses route direction samples for the current playback heading", () => {
    const route = createVariableSpeedRoute();
    route.points[1].directionDegrees = 123;

    expect(getCurrentRouteHeadingDegrees(route, 50)).toBe(123);
  });

  it("falls back to route bearing when direction samples are missing", () => {
    expect(getCurrentRouteHeadingDegrees(createVariableSpeedRoute(), 50)).toBe(0);
  });

  it("advances timeline progress from route duration instead of a fixed visual rate", () => {
    const route = createVariableSpeedRoute();

    expect(getPlaybackProgressStep(route, 1_000, 1)).toBeCloseTo(1.667, 3);
    expect(getPlaybackProgressStep(route, 1_000, 2)).toBeCloseTo(3.333, 3);
  });

  it("does not interpolate across disconnected multi-day trip gaps", () => {
    const position = interpolatePlaybackRoutePosition(createMultiDayRoute(), 50);

    expect(position[0]).toBe(10);
    expect(position[1]).toBe(10);
  });

  it("advances multi-day playback through trip driving time instead of overnight gaps", () => {
    expect(getPlaybackProgressStep(createMultiDayRoute(), 1_000, 1, 0)).toBeCloseTo(5, 3);
  });

  it("resolves a route timestamp back to the matching playback progress", () => {
    expect(getPlaybackProgressForRouteTimestamp(createVariableSpeedRoute(), "2026-03-29T08:30:00.000Z")).toBeCloseTo(50, 3);
    expect(getPlaybackProgressForRouteTimestamp(createMultiDayRoute(), "2026-05-06T09:05:00.000Z")).toBe(75);
  });

  it("keeps a refreshed route anchored to the previously inspected timestamp", () => {
    const currentRoute = createVariableSpeedRoute();
    const refreshedRoute: PlaybackRoute = {
      ...currentRoute,
      points: [
        ...currentRoute.points,
        {
          latitude: 30,
          longitude: 0,
          timestampIso: "2026-03-29T10:00:00.000Z",
          speedKph: 20,
        },
      ],
    };

    expect(getPlaybackProgressForRouteRefresh(currentRoute, refreshedRoute, 50)).toBe(25);
  });
});
