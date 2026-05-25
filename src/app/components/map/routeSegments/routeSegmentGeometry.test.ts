import { describe, expect, it } from "vitest";
import { PlaybackRoute } from "../../../../domain/models/playback";
import { getRouteSegmentLatLngs, hasDrawableRouteSegments } from "./routeSegmentGeometry";

function createRoute(overrides: Partial<PlaybackRoute> = {}): PlaybackRoute {
  return {
    vehicleId: "veh-test",
    points: [
      { latitude: 51.44, longitude: 5.46, timestampIso: "2026-03-29T08:00:00Z" },
      { latitude: 51.45, longitude: 5.47, timestampIso: "2026-03-29T08:05:00Z" },
      { latitude: 51.46, longitude: 5.48, timestampIso: "2026-03-29T08:10:00Z" },
    ],
    tripSegments: [],
    ...overrides,
  };
}

describe("route segment geometry", () => {
  it("does not treat routes without drawable segment geometry as segmented overlays", () => {
    expect(hasDrawableRouteSegments(null)).toBe(false);
    expect(hasDrawableRouteSegments(createRoute())).toBe(false);
    expect(
      hasDrawableRouteSegments(
        createRoute({
          tripSegments: [
            {
              id: "segment-flat",
              startLabel: "A",
              endLabel: "A",
              startTimeIso: "2026-03-29T08:00:00Z",
              endTimeIso: "2026-03-29T08:00:00Z",
              durationLabel: "0 min",
              durationMinutes: 0,
              distanceLabel: "0 km",
              distanceKm: 0,
              stopCount: 0,
              maxSpeedLabel: "0 km/h",
              maxSpeedKph: 0,
              averageSpeedLabel: "0 km/h",
              averageSpeedKph: 0,
              startProgressPercent: 40,
              endProgressPercent: 40,
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("detects routes with at least one segment that maps to two route points", () => {
    expect(
      hasDrawableRouteSegments(
        createRoute({
          tripSegments: [
            {
              id: "segment-moving",
              startLabel: "Depot",
              endLabel: "Customer",
              startTimeIso: "2026-03-29T08:00:00Z",
              endTimeIso: "2026-03-29T08:10:00Z",
              durationLabel: "10 min",
              durationMinutes: 10,
              distanceLabel: "4 km",
              distanceKm: 4,
              stopCount: 0,
              maxSpeedLabel: "55 km/h",
              maxSpeedKph: 55,
              averageSpeedLabel: "42 km/h",
              averageSpeedKph: 42,
              startProgressPercent: 0,
              endProgressPercent: 100,
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  it("keeps split trip geometry separate instead of adding connector points between trips", () => {
    const route = createRoute({
      points: [
        { latitude: 51.44, longitude: 5.46, timestampIso: "2026-03-29T08:00:00Z" },
        { latitude: 51.45, longitude: 5.47, timestampIso: "2026-03-29T08:05:00Z" },
        { latitude: 51.55, longitude: 5.6, timestampIso: "2026-03-29T09:00:00Z" },
        { latitude: 51.56, longitude: 5.61, timestampIso: "2026-03-29T09:05:00Z" },
      ],
      tripSegments: [
        {
          id: "trip-1",
          startLabel: "A",
          endLabel: "B",
          startTimeIso: "2026-03-29T08:00:00Z",
          endTimeIso: "2026-03-29T08:05:00Z",
          durationLabel: "5 min",
          durationMinutes: 5,
          distanceLabel: "1 km",
          distanceKm: 1,
          stopCount: 0,
          maxSpeedLabel: "30 km/h",
          maxSpeedKph: 30,
          averageSpeedLabel: "24 km/h",
          averageSpeedKph: 24,
          startProgressPercent: 0,
          endProgressPercent: 33.33333333333333,
        },
        {
          id: "trip-2",
          startLabel: "C",
          endLabel: "D",
          startTimeIso: "2026-03-29T09:00:00Z",
          endTimeIso: "2026-03-29T09:05:00Z",
          durationLabel: "5 min",
          durationMinutes: 5,
          distanceLabel: "1 km",
          distanceKm: 1,
          stopCount: 0,
          maxSpeedLabel: "40 km/h",
          maxSpeedKph: 40,
          averageSpeedLabel: "35 km/h",
          averageSpeedKph: 35,
          startProgressPercent: 66.66666666666666,
          endProgressPercent: 100,
        },
      ],
    });

    expect(getRouteSegmentLatLngs(route, route.tripSegments[0])).toEqual([
      [51.44, 5.46],
      [51.45, 5.47],
    ]);
    expect(getRouteSegmentLatLngs(route, route.tripSegments[1])).toEqual([
      [51.55, 5.6],
      [51.56, 5.61],
    ]);
  });
});
