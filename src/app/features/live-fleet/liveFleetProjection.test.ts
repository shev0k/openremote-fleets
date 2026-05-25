import { describe, expect, it } from "vitest";
import type { FleetAlert } from "../../../domain/models/alerts";
import type { PlaybackRoute, TripSegment } from "../../../domain/models/playback";
import type { Vehicle } from "../../../domain/models/vehicle";
import { addCriticalAlertEventMarkersToRoute } from "../../components/map/routeSegments/routeAlarmMarkers";
import { buildLiveFleetProjection } from "./liveFleetProjection";

function vehicle(id: string, overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id,
    name: id,
    plate: "BR-482-K",
    status: "moving",
    speedKph: 42,
    ignitionOn: true,
    latitude: 51.44,
    longitude: 5.46,
    heading: 90,
    lastUpdatedIso: "2026-03-29T08:00:00.000Z",
    driverName: "Mila Janssen",
    trackerId: id,
    assetName: id,
    assetClass: "truck",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 0,
    ...overrides,
  };
}

function alert(id: string, vehicleId: string, state: FleetAlert["state"] = "Active"): FleetAlert {
  return {
    id,
    vehicleId,
    vehicleName: vehicleId,
    severity: "high",
    type: "Overspeed",
    rule: "Speed > 80 km/h",
    timeIso: "2026-03-29T08:05:00.000Z",
    state,
  };
}

function segment(overrides: Partial<TripSegment> = {}): TripSegment {
  return {
    id: "segment-1",
    startLabel: "08:00",
    endLabel: "08:10",
    startTimeIso: "2026-03-29T08:00:00.000Z",
    endTimeIso: "2026-03-29T08:10:00.000Z",
    durationLabel: "10 min",
    durationMinutes: 10,
    distanceLabel: "3.2 km",
    distanceKm: 3.2,
    stopCount: 0,
    maxSpeedLabel: "80 km/h",
    maxSpeedKph: 80,
    averageSpeedLabel: "32 km/h",
    averageSpeedKph: 32,
    startProgressPercent: 0,
    endProgressPercent: 100,
    ...overrides,
  };
}

function route(vehicleId: string): PlaybackRoute {
  return {
    vehicleId,
    points: [
      { latitude: 51.44, longitude: 5.46, timestampIso: "2026-03-29T08:00:00.000Z", speedKph: 24, directionDegrees: 90 },
      { latitude: 51.45, longitude: 5.48, timestampIso: "2026-03-29T08:10:00.000Z", speedKph: 36, directionDegrees: 95 },
    ],
    tripSegments: [segment()],
  };
}

function routeWithLiveTail(vehicleId: string): PlaybackRoute {
  return {
    vehicleId,
    points: [
      { latitude: 51.44, longitude: 5.46, timestampIso: "2026-03-29T08:00:00.000Z", speedKph: 24, directionDegrees: 90 },
      { latitude: 51.45, longitude: 5.48, timestampIso: "2026-03-29T08:05:00.000Z", speedKph: 36, directionDegrees: 95 },
      { latitude: 51.46, longitude: 5.5, timestampIso: "2026-03-29T08:10:00.000Z", speedKph: 44, directionDegrees: 100 },
    ],
    tripSegments: [
      segment({
        id: "segment-1",
        endTimeIso: "2026-03-29T08:05:00.000Z",
        endProgressPercent: 50,
      }),
      segment({
        id: "segment-2",
        startLabel: "08:05",
        endLabel: "08:10",
        startTimeIso: "2026-03-29T08:05:00.000Z",
        endTimeIso: "2026-03-29T08:10:00.000Z",
        startProgressPercent: 50,
        endProgressPercent: 100,
      }),
    ],
  };
}

describe("buildLiveFleetProjection", () => {
  it("returns one projected model for fleet vehicles, active alerts, critical alerts, and route markers", () => {
    const projection = buildLiveFleetProjection({
      dataMode: "openRemote",
      vehicles: [vehicle("veh-1"), vehicle("veh-2")],
      alerts: [alert("alert-1", "veh-1"), alert("alert-2", "veh-2", "Resolved")],
      selectedVehicleId: "veh-1",
      route: route("veh-1"),
      selectedSegmentId: "segment-1",
      playbackProgress: 50,
      playbackSpeed: 1,
      isTimelineInspecting: true,
    });

    expect(projection.triggeredAlerts.map((entry) => entry.id)).toEqual(["alert-1"]);
    expect(projection.criticalAlerts.map((entry) => entry.id)).toEqual(["alert-1"]);
    expect(projection.activeAlertsByVehicleId["veh-1"]).toHaveLength(1);
    expect(projection.fleetVehicles.find((entry) => entry.id === "veh-1")?.status).toBe("alerting");
    expect(projection.selectedVehicle?.id).toBe("veh-1");
    expect(projection.selectedSegmentWithAlertMarkers?.eventMarkers?.some((marker) => marker.id === "alert-1")).toBe(true);
    expect(projection.routeLine).toHaveLength(2);
    const mapVehicle = projection.mapVehicles.find((entry) => entry.id === "veh-1");
    expect(mapVehicle?.latitude).toBeCloseTo(51.445);
    expect(mapVehicle?.longitude).toBeCloseTo(5.47);
    expect(mapVehicle?.heading).toBe(90);
    expect(projection.timelineStreetViewPosition?.latitude).toBeCloseTo(51.445);
    expect(projection.timelineStreetViewPosition?.longitude).toBeCloseTo(5.47);
    expect(projection.timelineStreetViewPosition?.heading).toBe(90);
  });

  it("reuses a precomputed alert-marker route while timeline progress changes", () => {
    const baseRoute = route("veh-1");
    const alerts = [alert("alert-1", "veh-1")];
    const routeWithAlertMarkers = addCriticalAlertEventMarkersToRoute(baseRoute, alerts);

    const firstProjection = buildLiveFleetProjection({
      dataMode: "openRemote",
      vehicles: [vehicle("veh-1")],
      alerts,
      selectedVehicleId: "veh-1",
      route: baseRoute,
      routeWithAlertMarkers,
      selectedSegmentId: "segment-1",
      playbackProgress: 10,
      isTimelineInspecting: true,
    });

    const scrubbedProjection = buildLiveFleetProjection({
      dataMode: "openRemote",
      vehicles: [vehicle("veh-1")],
      alerts,
      selectedVehicleId: "veh-1",
      route: baseRoute,
      routeWithAlertMarkers,
      selectedSegmentId: "segment-1",
      playbackProgress: 55,
      isTimelineInspecting: true,
    });

    expect(firstProjection.routeWithAlertMarkers).toBe(routeWithAlertMarkers);
    expect(scrubbedProjection.routeWithAlertMarkers).toBe(routeWithAlertMarkers);
    expect(scrubbedProjection.mapVehicles[0].latitude).not.toBe(firstProjection.mapVehicles[0].latitude);
  });

  it("keeps timeline selection separate from the live active map segment", () => {
    const projection = buildLiveFleetProjection({
      dataMode: "mock",
      vehicles: [vehicle("veh-1")],
      alerts: [],
      selectedVehicleId: "veh-1",
      route: routeWithLiveTail("veh-1"),
      selectedSegmentId: "segment-1",
      activeMapSegmentId: "segment-2",
      playbackProgress: 25,
      isTimelineInspecting: true,
    });

    expect(projection.selectedSegmentWithAlertMarkers?.id).toBe("segment-1");
    expect(projection.activeMapSegmentId).toBe("segment-2");
    expect(projection.activeSegmentLine).toEqual([
      [51.45, 5.48],
      [51.46, 5.5],
    ]);
    expect(projection.playbackPosition[0]).toBeCloseTo(51.445);
    expect(projection.playbackPosition[1]).toBeCloseTo(5.47);
  });

  it("extends the openRemote live route display to the selected vehicle when history is one tick behind", () => {
    const projection = buildLiveFleetProjection({
      dataMode: "openRemote",
      vehicles: [
        vehicle("veh-1", {
          latitude: 51.46,
          longitude: 5.5,
          heading: 100,
          speedKph: 44,
          lastUpdatedIso: "2026-03-29T08:15:00.000Z",
        }),
      ],
      alerts: [],
      selectedVehicleId: "veh-1",
      route: route("veh-1"),
      selectedSegmentId: "segment-1",
      playbackProgress: 100,
      isTimelineInspecting: false,
    });

    expect(projection.routeLine.at(-1)).toEqual([51.46, 5.5]);
    expect(projection.activeSegmentLine.at(-1)).toEqual([51.46, 5.5]);
    expect(projection.playbackPosition).toEqual([51.46, 5.5]);
    expect(projection.mapVehicles[0].latitude).toBe(51.46);
    expect(projection.mapVehicles[0].longitude).toBe(5.5);
  });
});
