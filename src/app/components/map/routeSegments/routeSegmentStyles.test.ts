import { describe, expect, it } from "vitest";
import { TripSegment } from "../../../../domain/models/playback";
import { DEFAULT_APP_PREFERENCES } from "../../../../domain/models/preferences";
import { getRouteSegmentClassName, resolveRouteSegmentStyle } from "./routeSegmentStyles";

function createSegment(overrides: Partial<TripSegment> = {}): TripSegment {
  return {
    id: "segment-test",
    startLabel: "Depot",
    endLabel: "Customer",
    startTimeIso: "2026-03-29T08:00:00Z",
    endTimeIso: "2026-03-29T08:30:00Z",
    durationLabel: "30 min",
    durationMinutes: 30,
    distanceLabel: "18 km",
    distanceKm: 18,
    stopCount: 0,
    maxSpeedLabel: "80 km/h",
    maxSpeedKph: 80,
    averageSpeedLabel: "52 km/h",
    averageSpeedKph: 52,
    startProgressPercent: 0,
    endProgressPercent: 20,
    ...overrides,
  };
}

describe("route segment styles", () => {
  it("uses dotted segment-colored styles for inactive segments", () => {
    expect(resolveRouteSegmentStyle(createSegment({ speedBand: "stationary" }))).toMatchObject({
      color: "#a1d200",
      weight: 5,
      opacity: 0.92,
      dashArray: "10 8",
      animation: "none",
    });
    expect(resolveRouteSegmentStyle(createSegment({ speedBand: "normal" }), { segmentIndex: 1 })).toMatchObject({
      color: "#38bdf8",
      weight: 5,
      opacity: 0.92,
      dashArray: "10 8",
      animation: "none",
    });
    expect(resolveRouteSegmentStyle(createSegment({ speedBand: "overspeed" }), { segmentIndex: 2 })).toMatchObject({
      color: "#8b5cf6",
      weight: 5,
      opacity: 0.92,
      dashArray: "10 8",
      animation: "none",
    });
  });

  it("keeps segment event states on the route segment identity palette", () => {
    expect(resolveRouteSegmentStyle(createSegment({ state: "engineOff", speedBand: "normal" }))).toMatchObject({
      color: "#a1d200",
      dashArray: "10 8",
      animation: "none",
    });
    expect(resolveRouteSegmentStyle(createSegment({ state: "break", speedBand: "overspeed" }), { segmentIndex: 1 })).toMatchObject({
      color: "#38bdf8",
      dashArray: "10 8",
      animation: "none",
    });
    expect(resolveRouteSegmentStyle(createSegment({ state: "alarm", speedBand: "normal" }), { segmentIndex: 2 })).toMatchObject({
      color: "#8b5cf6",
      weight: 5,
      animation: "none",
    });
  });

  it("keeps diagnostic route markers from replacing route segment identity colors", () => {
    const mapColors = {
      ...DEFAULT_APP_PREFERENCES.mapColors,
      vehicleSignalDegraded: "#fb923c",
      vehicleDriverBreak: "#8b5cf6",
      vehicleOffline: "#111111",
      vehicleParked: "#38bdf8",
    };

    expect(
      resolveRouteSegmentStyle(
        createSegment({
          markers: [
            {
              id: "marker-signal",
              type: "signal",
              timestampIso: "2026-03-29T08:05:00Z",
              latitude: 51.45,
              longitude: 5.49,
              label: "Signal degraded",
            },
          ],
        }),
        {
          segmentIndex: 2,
          mapColors,
        },
      ).color,
    ).toBe("#8b5cf6");
    expect(
      resolveRouteSegmentStyle(
        createSegment({
          markers: [
            {
              id: "marker-break",
              type: "break",
              timestampIso: "2026-03-29T08:10:00Z",
              latitude: 51.45,
              longitude: 5.49,
              label: "Driver break",
            },
          ],
        }),
        {
          segmentIndex: 2,
          mapColors,
        },
      ).color,
    ).toBe("#8b5cf6");
    expect(
      resolveRouteSegmentStyle(
        createSegment({
          markers: [
            {
              id: "marker-offline",
              type: "offline",
              timestampIso: "2026-03-29T08:15:00Z",
              latitude: 51.45,
              longitude: 5.49,
              label: "Offline",
            },
          ],
        }),
        {
          segmentIndex: 2,
          mapColors,
        },
      ).color,
    ).toBe("#8b5cf6");
    expect(
      resolveRouteSegmentStyle(
        createSegment({
          markers: [
            {
              id: "marker-engine-off",
              type: "engineOff",
              timestampIso: "2026-03-29T08:20:00Z",
              latitude: 51.45,
              longitude: 5.49,
              label: "Engine off",
            },
          ],
        }),
        {
          segmentIndex: 2,
          mapColors,
        },
      ).color,
    ).toBe("#8b5cf6");
  });

  it("marks the active segment with stronger weight and opacity while preserving its segment color", () => {
    const inactive = resolveRouteSegmentStyle(createSegment({ speedBand: "fast" }), { segmentIndex: 1 });
    const active = resolveRouteSegmentStyle(createSegment({ speedBand: "fast" }), { isActive: true, segmentIndex: 1 });

    expect(inactive.color).toBe("#38bdf8");
    expect(active.color).toBe(inactive.color);
    expect(active.weight).toBeGreaterThan(inactive.weight);
    expect(active.weight).toBeLessThanOrEqual(inactive.weight + 2);
    expect(active.opacity).toBeGreaterThan(inactive.opacity);
    expect(inactive.dashArray).toBe("10 8");
    expect(active.dashArray).toBeUndefined();
  });

  it("gives each inactive trip segment a distinct dotted color", () => {
    const first = resolveRouteSegmentStyle(createSegment(), { segmentIndex: 0 });
    const second = resolveRouteSegmentStyle(createSegment(), { segmentIndex: 1 });
    const third = resolveRouteSegmentStyle(createSegment(), { segmentIndex: 2 });

    expect(new Set([first.color, second.color, third.color]).size).toBe(3);
    expect(first.dashArray).toBe("10 8");
    expect(second.dashArray).toBe("10 8");
    expect(third.dashArray).toBe("10 8");
  });

  it("keeps trip segment palette colors distinct when map preferences are supplied", () => {
    const mapColors = {
      ...DEFAULT_APP_PREFERENCES.mapColors,
      route: "#123456",
      routeActive: "#ffffff",
      routeSlow: "#123456",
      routeFast: "#123456",
      routeOverspeed: "#123456",
    };

    const first = resolveRouteSegmentStyle(createSegment({ speedBand: "normal" }), { segmentIndex: 0, mapColors });
    const second = resolveRouteSegmentStyle(createSegment({ speedBand: "normal" }), { segmentIndex: 1, mapColors });
    const activeSecond = resolveRouteSegmentStyle(createSegment({ speedBand: "normal" }), {
      isActive: true,
      segmentIndex: 1,
      mapColors,
    });

    expect(first.color).not.toBe(second.color);
    expect(activeSecond.color).toBe(second.color);
  });

  it("does not replace trip palette colors with configured route speed colors", () => {
    const mapColors = {
      ...DEFAULT_APP_PREFERENCES.mapColors,
      route: "#123456",
      routeSlow: "#654321",
      routeFast: "#abcdef",
      routeOverspeed: "#fedcba",
      vehicleOffline: "#111111",
    };

    expect(resolveRouteSegmentStyle(createSegment({ speedBand: "normal" }), { segmentIndex: 0, mapColors }).color).toBe(
      "#a1d200",
    );
    expect(resolveRouteSegmentStyle(createSegment({ speedBand: "slow" }), { segmentIndex: 1, mapColors }).color).toBe(
      "#38bdf8",
    );
    expect(resolveRouteSegmentStyle(createSegment({ speedBand: "fast" }), { segmentIndex: 2, mapColors }).color).toBe(
      "#8b5cf6",
    );
    expect(
      resolveRouteSegmentStyle(createSegment({ speedBand: "overspeed" }), { segmentIndex: 3, mapColors }).color,
    ).toBe("#f59e0b");
    expect(
      resolveRouteSegmentStyle(createSegment({ speedBand: "stationary" }), { segmentIndex: 4, mapColors }).color,
    ).toBe("#ef4444");
  });

  it("restores the appear class while preserving semantic route animations", () => {
    expect(getRouteSegmentClassName({ ...resolveRouteSegmentStyle(createSegment()), animation: "none" })).toBe(
      "route-segment-line route-segment-line-appear",
    );
    expect(getRouteSegmentClassName({ ...resolveRouteSegmentStyle(createSegment()), animation: "pulse" })).toBe(
      "route-segment-line route-segment-line-appear route-segment-line-pulse",
    );
    expect(getRouteSegmentClassName({ ...resolveRouteSegmentStyle(createSegment()), animation: "flow" })).toBe(
      "route-segment-line route-segment-line-appear route-segment-line-flow",
    );
  });
});
