import { afterEach, describe, expect, it, vi } from "vitest";
import { FleetAlert } from "../../../domain/models/alerts";
import { PlaybackRoute } from "../../../domain/models/playback";
import { MockAlertsRepository } from "../../../infrastructure/repositories/mock/mockAlertsRepository";
import { MockPlaybackRepository } from "../../../infrastructure/repositories/mock/mockPlaybackRepository";
import { addCriticalAlertEventMarkersToRoute } from "./routeAlarmMarkers";

const route: PlaybackRoute = {
  vehicleId: "veh-delta-24",
  points: [
    { latitude: 51.41, longitude: 5.49, timestampIso: "2026-05-07T08:00:00.000Z" },
    { latitude: 51.42, longitude: 5.5, timestampIso: "2026-05-07T08:15:00.000Z" },
    { latitude: 51.43, longitude: 5.51, timestampIso: "2026-05-07T08:30:00.000Z" },
  ],
  tripSegments: [
    {
      id: "delta-trip-1",
      startLabel: "08:00",
      endLabel: "08:30",
      startTimeIso: "2026-05-07T08:00:00.000Z",
      endTimeIso: "2026-05-07T08:30:00.000Z",
      durationLabel: "30 min",
      durationMinutes: 30,
      distanceLabel: "12 km",
      distanceKm: 12,
      stopCount: 0,
      maxSpeedLabel: "88 km/h",
      maxSpeedKph: 88,
      averageSpeedLabel: "54 km/h",
      averageSpeedKph: 54,
      startProgressPercent: 0,
      endProgressPercent: 100,
    },
  ],
};

function createAlert(overrides: Partial<FleetAlert> = {}): FleetAlert {
  return {
    id: "alert-overspeed-delta",
    severity: "high",
    vehicleId: "veh-delta-24",
    vehicleName: "Delta 24",
    type: "Overspeed",
    rule: "Speed > 80 km/h",
    timeIso: "2026-05-07T08:16:00.000Z",
    state: "Active",
    sourceAttribute: "speed",
    sourceValue: 88,
    ...overrides,
  };
}

describe("route alarm markers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds unresolved critical alerts as route event markers on the selected vehicle route", () => {
    const routeWithMarkers = addCriticalAlertEventMarkersToRoute(route, [createAlert()]);

    if (!routeWithMarkers) {
      throw new Error("Expected route with markers.");
    }

    expect(routeWithMarkers.tripSegments[0].eventMarkers).toContainEqual(
      expect.objectContaining({
        id: "alert-overspeed-delta",
        eventType: "alarm",
        label: "Overspeed",
        severity: "critical",
        sourceAttribute: "speed",
        timestampIso: "2026-05-07T08:16:00.000Z",
      }),
    );
  });

  it("keeps resolved critical alerts as route history while ignoring non-critical and unrelated alerts", () => {
    const routeWithMarkers = addCriticalAlertEventMarkersToRoute(route, [
      createAlert({ id: "resolved", state: "Resolved" }),
      createAlert({ id: "warning", severity: "medium" }),
      createAlert({ id: "other-vehicle", vehicleId: "veh-atlas-12" }),
    ]);

    if (!routeWithMarkers) {
      throw new Error("Expected route.");
    }

    expect(routeWithMarkers.tripSegments[0].eventMarkers).toEqual([
      expect.objectContaining({
        id: "resolved",
        eventType: "alarm",
        label: "Overspeed",
      }),
    ]);
  });

  it("does not add alert markers before the live route has reached the alert timestamp", () => {
    const partialRoute: PlaybackRoute = {
      ...route,
      points: route.points.slice(0, 1),
      tripSegments: [
        {
          ...route.tripSegments[0],
          endTimeIso: route.points[0].timestampIso,
          endProgressPercent: 0,
        },
      ],
    };

    const routeWithMarkers = addCriticalAlertEventMarkersToRoute(partialRoute, [createAlert()]);

    expect(routeWithMarkers?.tripSegments[0].eventMarkers ?? []).toHaveLength(0);
  });

  it("does not rebase real alert timestamps onto the selected route date", () => {
    const routeWithMarkers = addCriticalAlertEventMarkersToRoute(route, [
      createAlert({ id: "yesterday-real-alert", timeIso: "2026-05-06T08:16:00.000Z" }),
    ]);

    expect(routeWithMarkers?.tripSegments[0].eventMarkers ?? []).toHaveLength(0);
  });

  it("adds the Harbor mock critical alert as a visible path event marker", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-07T10:00:00Z"));
    const playbackRepository = new MockPlaybackRepository();
    const alertsRepository = new MockAlertsRepository();
    const harborRoute = await playbackRepository.getPlaybackRoute("veh-harbor-07", { preset: "last24Hours" });
    const alerts = await alertsRepository.listAlerts();

    if (!harborRoute) {
      throw new Error("Expected Harbor route.");
    }

    const routeWithMarkers = addCriticalAlertEventMarkersToRoute(harborRoute, alerts);
    const eventMarkers = routeWithMarkers?.tripSegments.flatMap((segment) => segment.eventMarkers ?? []);

    expect(eventMarkers).toContainEqual(
      expect.objectContaining({
        id: "alert-route-deviation-harbor",
        eventType: "alarm",
        label: "Route Deviation",
        severity: "critical",
        sourceAttribute: "gpsLocation",
      }),
    );
  });
});
