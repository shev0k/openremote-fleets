import { afterEach, describe, expect, it, vi } from "vitest";
import { isTelemetrySignalValueCompatible } from "../../../domain/models/telemetry";
import { deriveVehicleOperationalStatus } from "../../../domain/models/vehicleOperationalStatus";
import { getCurrentRouteTelemetryState, getPlaybackProgressForRouteTimestamp } from "../../../app/components/playback/playbackUtils";
import { MockAlertsRepository } from "./mockAlertsRepository";
import { MockAssetsRepository } from "./mockAssetsRepository";
import { MockFleetRepository } from "./mockFleetRepository";
import { MockPlaybackRepository } from "./mockPlaybackRepository";
import { MockReportsRepository } from "./mockReportsRepository";
import {
  MOCK_DAILY_ACTIVITY_FIXTURES,
  MOCK_EVENT_FIXTURES,
} from "../../../domain/legacy/obsoleteScope/fixtures/dailyActivityFixtures";
import { MOCK_DISPATCHER_FIXTURES } from "../../../domain/legacy/obsoleteScope/fixtures/dispatcherFixtures";
import { MOCK_FLEET_FIXTURES } from "./fixtures/fleetFixtures";
import { MOCK_PLAYBACK_ROUTE_FIXTURES } from "./fixtures/playbackFixtures";
import { createMockTeltonikaVehicle, type TeltonikaValueMap } from "./fixtures/teltonikaTelemetryFixtures";
import { MOCK_VEHICLE_DETAIL_FIXTURES } from "./fixtures/vehicleDetailsFixtures";

function getDistanceMeters(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const lat1 = toRadians(start.latitude);
  const lat2 = toRadians(end.latitude);
  const deltaLat = toRadians(end.latitude - start.latitude);
  const deltaLon = toRadians(end.longitude - start.longitude);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatRuntimeTimeLabel(timestampIso: string): string {
  return new Date(timestampIso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getTeltonikaValuesFromVehicle(vehicle: (typeof MOCK_FLEET_FIXTURES)[number]): TeltonikaValueMap {
  return Object.fromEntries(
    Object.entries(vehicle.teltonika?.attributes ?? {}).map(([attributeName, attribute]) => [attributeName, attribute.value]),
  ) as TeltonikaValueMap;
}

describe("mock repositories", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("models live fleet fixtures as Teltonika FMC003 tracker attribute snapshots", () => {
    const requiredAttributes = {
      speed: "24",
      ignition: "239",
      movement: "240",
      gsmSignal: "21",
      externalVoltage: "66",
      batteryLevel: "113",
      totalOdometer: "16",
      tripOdometer: "199",
      fuelRateGps: "13",
      fuelLevel: "48",
    };

    for (const vehicle of MOCK_FLEET_FIXTURES) {
      const teltonika = (vehicle as any).teltonika;

      expect(vehicle.deviceType).toBe("Teltonika FMC003");
      expect(vehicle.trackerId).toMatch(/^\d{15}$/);
      expect(teltonika.imei).toBe(vehicle.trackerId);
      expect(teltonika.protocol).toMatch(/^teltonika:/);
      expect(teltonika.codec).toBe("CODEC_8");

      for (const [attributeName, avlId] of Object.entries(requiredAttributes)) {
        expect(teltonika.attributes[attributeName]).toMatchObject({
          avlId,
          attributeName,
          timestampIso: vehicle.lastUpdatedIso,
        });
      }

      expect(vehicle.speedKph).toBe(teltonika.attributes.speed.value);
      expect(vehicle.ignitionOn).toBe(teltonika.attributes.ignition.value);
      expect(vehicle.fuelLevelPercent).toBe(teltonika.attributes.fuelLevel.value);
      expect(vehicle.batteryLevelPercent).toBe(teltonika.attributes.batteryLevel.value);
    }
  });

  it("derives base mock vehicle status from Teltonika telemetry and active alerts", () => {
    for (const vehicle of MOCK_FLEET_FIXTURES) {
      const attributes = vehicle.teltonika?.attributes;
      const expectedStatus = deriveVehicleOperationalStatus({
        activeAlertCount: vehicle.activeAlertCount,
        explicitStatus: vehicle.status === "offline" ? "offline" : null,
        hasLocation: true,
        ignitionOn: attributes?.ignition.value === true,
        movement: attributes?.movement.value === true,
        speedKph: typeof attributes?.speed.value === "number" ? attributes.speed.value : 0,
      });

      expect(vehicle.status).toBe(expectedStatus);
    }
  });

  it("derives created Teltonika vehicle status instead of trusting stale fixture input", () => {
    const movingValues = {
      ...getTeltonikaValuesFromVehicle(MOCK_FLEET_FIXTURES[0]),
      speed: 37,
      ignition: true,
      movement: true,
    };
    const alertingVehicle = createMockTeltonikaVehicle({
      id: "veh-derived-alert",
      name: "Derived Alert",
      plate: "DR-001-A",
      status: "moving",
      driverName: "Mock Driver",
      assetName: "Derived Asset",
      assetClass: "van",
      activeAlertCount: 1,
      imei: "352094085231700",
      timestampIso: "2026-03-29T09:15:00.000Z",
      values: movingValues,
    });
    const movingVehicle = createMockTeltonikaVehicle({
      id: "veh-derived-moving",
      name: "Derived Moving",
      plate: "DR-002-A",
      status: "idling",
      driverName: "Mock Driver",
      assetName: "Derived Asset",
      assetClass: "van",
      activeAlertCount: 0,
      imei: "352094085231701",
      timestampIso: "2026-03-29T09:15:00.000Z",
      values: movingValues,
    });

    expect(alertingVehicle.status).toBe("alerting");
    expect(movingVehicle.status).toBe("moving");
  });

  it("derives vehicle detail metrics from Teltonika odometer and fuel attributes", () => {
    for (const detail of Object.values(MOCK_VEHICLE_DETAIL_FIXTURES)) {
      const attributes = (detail as any).teltonika.attributes;

      expect(detail.odometerKm).toBeCloseTo(attributes.totalOdometer.value / 1000, 3);
      expect(detail.todayMileageKm).toBeCloseTo(attributes.tripOdometer.value / 1000, 3);
      expect(detail.averageFuelConsumptionLitersPer100Km).toBe(attributes.fuelRateGps.value);
      expect(detail.fuelLevelPercent).toBe(attributes.fuelLevel.value);
      expect(detail.batteryLevelPercent).toBe(attributes.batteryLevel.value);
    }
  });

  it("returns deterministic fleet fixtures from fresh repository instances", async () => {
    const firstRepository = new MockFleetRepository();
    const secondRepository = new MockFleetRepository();

    const firstFleet = await firstRepository.listVehicles();
    const secondFleet = await secondRepository.listVehicles();

    expect(firstFleet).toEqual(secondFleet);
    expect(firstFleet).toHaveLength(5);
    expect(firstFleet.map((vehicle) => vehicle.status)).toEqual(
      expect.arrayContaining(["moving", "idling", "alerting", "offline"]),
    );
  });

  it("rebases mock fleet timestamps without shifting their route-clock time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-07T10:00:00Z"));
    const repository = new MockFleetRepository();

    const vehicles = await repository.listVehicles();
    const sourceVehicle = MOCK_FLEET_FIXTURES.find((vehicle) => vehicle.id === "veh-harbor-07");
    const vehicle = vehicles.find((entry) => entry.id === "veh-harbor-07");

    expect(vehicle?.lastUpdatedIso.startsWith("2026-05-07")).toBe(true);
    expect(vehicle?.lastUpdatedIso.slice(11)).toBe(sourceVehicle?.lastUpdatedIso.slice(11));
  });

  it("rebases list, detail, and playback vehicle timestamps to the current mock date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-07T10:00:00Z"));
    const fleetRepository = new MockFleetRepository();
    const playbackRepository = new MockPlaybackRepository();

    const listedVehicle = (await fleetRepository.listVehicles()).find((vehicle) => vehicle.id === "veh-atlas-12");
    const vehicleDetail = await fleetRepository.getVehicleDetail("veh-atlas-12");
    const playbackVehicle = (await playbackRepository.listPlaybackVehicles()).find((vehicle) => vehicle.id === "veh-atlas-12");

    expect(listedVehicle?.lastUpdatedIso.slice(0, 10)).toBe("2026-05-07");
    expect(vehicleDetail?.lastUpdatedIso.slice(0, 10)).toBe("2026-05-07");
    expect(vehicleDetail?.lastCommunicationIso.slice(0, 10)).toBe("2026-05-07");
    expect(playbackVehicle?.lastUpdatedIso.slice(0, 10)).toBe("2026-05-07");
    expect(playbackVehicle?.teltonika?.timestampIso.slice(0, 10)).toBe("2026-05-07");
  });

  it("returns deterministic playback fixtures and null for unknown route requests", async () => {
    const repository = new MockPlaybackRepository();

    const vehicles = await repository.listPlaybackVehicles();
    const route = await repository.getPlaybackRoute("veh-atlas-12", { preset: "last7Days" });
    const unknownRoute = await repository.getPlaybackRoute("veh-atlas-12", { preset: "customDate", customDateIso: "2026-03-01" });

    expect(vehicles).toHaveLength(5);
    expect(route).not.toBeNull();
    expect(route?.points.length).toBeGreaterThan(0);
    expect(route?.tripSegments.length).toBeGreaterThan(0);
    expect(unknownRoute).toBeNull();
  });

  it("keeps trip segment labels in sync with user-timezone playback timestamps", async () => {
    const repository = new MockPlaybackRepository();
    const route = await repository.getPlaybackRoute("veh-atlas-12", { preset: "today" });
    const firstTrip = route?.tripSegments[0];

    expect(firstTrip?.startLabel).toBe(formatRuntimeTimeLabel(firstTrip?.startTimeIso ?? ""));
    expect(firstTrip?.endLabel).toBe(formatRuntimeTimeLabel(firstTrip?.endTimeIso ?? ""));
  });

  it("resolves manual date selection the same way as matching relative playback presets", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-07T10:00:00Z"));
    const repository = new MockPlaybackRepository();

    const yesterdayPreset = await repository.getPlaybackRoute("veh-atlas-12", { preset: "yesterday" });
    const manualYesterday = await repository.getPlaybackRoute("veh-atlas-12", {
      preset: "customDate",
      customDateIso: "2026-05-06",
    });

    expect(manualYesterday).toEqual(yesterdayPreset);
    expect(manualYesterday?.points[0]?.timestampIso.startsWith("2026-05-06")).toBe(true);
  });

  it("populates manual playback dates inside the mock last-7-days window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-07T10:00:00Z"));
    const repository = new MockPlaybackRepository();

    const manualHistoryDate = await repository.getPlaybackRoute("veh-harbor-07", {
      preset: "customDate",
      customDateIso: "2026-05-05",
    });

    expect(manualHistoryDate).not.toBeNull();
    expect(manualHistoryDate?.points[0]?.timestampIso.startsWith("2026-05-05")).toBe(true);
  });

  it("rebases today and yesterday playback presets onto the current calendar window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-07T10:00:00Z"));
    const repository = new MockPlaybackRepository();

    const todayRoute = await repository.getPlaybackRoute("veh-atlas-12", { preset: "today" });
    const yesterdayRoute = await repository.getPlaybackRoute("veh-atlas-12", { preset: "yesterday" });

    expect(todayRoute?.points[0]?.timestampIso.startsWith("2026-05-07")).toBe(true);
    expect(yesterdayRoute?.points[0]?.timestampIso.startsWith("2026-05-06")).toBe(true);
  });

  it("rebases playback routes without shifting fixture route-clock times", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-07T10:00:00Z"));
    const repository = new MockPlaybackRepository();
    const sourceRoute = MOCK_PLAYBACK_ROUTE_FIXTURES["veh-harbor-07"].today;

    const todayRoute = await repository.getPlaybackRoute("veh-harbor-07", { preset: "today" });

    expect(todayRoute?.points[0]?.timestampIso.startsWith("2026-05-07")).toBe(true);
    expect(todayRoute?.points[0]?.timestampIso.slice(11)).toBe(sourceRoute.points[0]?.timestampIso.slice(11));
    expect(todayRoute?.tripSegments[0]?.startTimeIso.slice(11)).toBe(sourceRoute.points[0]?.timestampIso.slice(11));
  });

  it("provides varied yesterday and last-7-days playback history for every mock vehicle", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-07T10:00:00Z"));
    const repository = new MockPlaybackRepository();
    const vehicles = await repository.listPlaybackVehicles();
    const yesterdayCounts: number[] = [];
    const last7DaysCounts: number[] = [];

    for (const vehicle of vehicles) {
      const yesterdayRoute = await repository.getPlaybackRoute(vehicle.id, { preset: "yesterday" });
      const last7DaysRoute = await repository.getPlaybackRoute(vehicle.id, { preset: "last7Days" });

      if (!yesterdayRoute || !last7DaysRoute) {
        throw new Error(`Expected historical playback routes for ${vehicle.id}.`);
      }

      yesterdayCounts.push(yesterdayRoute.tripSegments.length);
      last7DaysCounts.push(last7DaysRoute.tripSegments.length);

      expect(yesterdayRoute.tripSegments.length).toBeGreaterThanOrEqual(1);
      expect(yesterdayRoute.tripSegments.length).toBeLessThanOrEqual(8);
      expect(last7DaysRoute.tripSegments.length).toBeGreaterThan(yesterdayRoute.tripSegments.length);
      expect(last7DaysRoute.tripSegments.length).toBeLessThanOrEqual(21);
      expect(last7DaysRoute.tripSegments.every((trip) => trip.durationMinutes <= 120)).toBe(true);
      expect(last7DaysRoute.tripSegments.every((trip) => trip.averageSpeedKph <= 80)).toBe(true);
      expect(yesterdayRoute.points[0]?.timestampIso.startsWith("2026-05-06")).toBe(true);
      expect(last7DaysRoute.points[0]?.timestampIso.startsWith("2026-05-01")).toBe(true);
    }

    expect(new Set(yesterdayCounts).size).toBeGreaterThan(1);
    expect(new Set(last7DaysCounts).size).toBeGreaterThan(1);
  });

  it("rebases last-7-days playback points across the current mock week", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-07T10:00:00Z"));
    const repository = new MockPlaybackRepository();

    const route = await repository.getPlaybackRoute("veh-atlas-12", { preset: "last7Days" });
    const routeDates = new Set(route?.points.map((point) => point.timestampIso.slice(0, 10)));

    expect(routeDates.size).toBeGreaterThan(1);
    expect(routeDates).toContain("2026-05-01");
    expect(routeDates).toContain("2026-05-07");
  });

  it("keeps alerts session-mutable while fresh instances reset to the seed", async () => {
    const repository = new MockAlertsRepository();

    await repository.updateAlertState("alert-overspeed-delta", "Resolved");

    const alerts = await repository.listAlerts();
    const freshAlerts = await new MockAlertsRepository().listAlerts();

    expect(alerts.find((alert) => alert.id === "alert-overspeed-delta")?.state).toBe("Resolved");
    expect(freshAlerts.find((alert) => alert.id === "alert-overspeed-delta")?.state).toBe("Active");
  });

  it("adds source attribute context to mock alerts", async () => {
    const alerts = await new MockAlertsRepository().listAlerts();

    expect(alerts.every((alert) => Boolean(alert.sourceAttribute))).toBe(true);
    expect(alerts.map((alert) => alert.sourceAttribute)).toEqual(
      expect.arrayContaining(["speed", "gpsLocation", "batteryLevel", "movement"]),
    );
  });

  it("adds alert-time speed context to mock critical alerts", async () => {
    const alerts = await new MockAlertsRepository().listAlerts();

    expect(alerts.find((alert) => alert.id === "alert-overspeed-delta")).toMatchObject({
      sourceAttribute: "speed",
      sourceValue: 88,
      speedKph: 88,
    });
    expect(alerts.find((alert) => alert.id === "alert-route-deviation-harbor")).toMatchObject({
      sourceAttribute: "gpsLocation",
      speedKph: 2,
    });
  });

  it("rebases mock alert timestamps onto the current calendar day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-07T10:00:00Z"));
    const repository = new MockAlertsRepository();

    const alerts = await repository.listAlerts();

    expect(alerts).not.toHaveLength(0);
    expect(alerts.every((alert) => alert.timeIso.startsWith("2026-05-07"))).toBe(true);
    expect(alerts.find((alert) => alert.id === "alert-route-deviation-harbor")?.timeIso).toBe("2026-05-07T08:46:00.000Z");
  });

  it("keeps assets read-only and returns fresh cloned tracker telemetry fixtures", async () => {
    const repository = new MockAssetsRepository();
    const assets = await repository.listAssets();
    const atlas = assets.find((asset) => asset.id === "asset-atlas-prime");

    if (!atlas?.latestTelemetrySamples?.length) {
      throw new Error("Expected asset telemetry samples.");
    }

    atlas.assetName = "Mutated Atlas";
    atlas.latestTelemetrySamples[0].value = 999;

    const freshAtlas = (await new MockAssetsRepository().listAssets()).find(
      (asset) => asset.id === "asset-atlas-prime",
    );

    expect(assets).toHaveLength(5);
    expect(freshAtlas?.assetName).toBe("Atlas Prime");
    expect(freshAtlas?.latestTelemetrySamples?.[0].value).not.toBe(999);
    expect(freshAtlas?.teltonika?.protocol).toMatch(/^teltonika:/);
  });

  it("returns deterministic report fixtures by range", async () => {
    const firstRepository = new MockReportsRepository();
    const secondRepository = new MockReportsRepository();

    const firstSnapshot = await firstRepository.getFleetReports("Last 7 Days");
    const secondSnapshot = await secondRepository.getFleetReports("Last 7 Days");

    expect(firstSnapshot).toEqual(secondSnapshot);
    expect(firstSnapshot.metrics.totalDistanceKm).toBeGreaterThan(0);
    expect(firstSnapshot.dailyTrips.length).toBeGreaterThan(0);
    expect(firstSnapshot.mostActiveVehicles.length).toBeGreaterThan(0);
  });

  it("exposes Teltonika-aligned telemetry timelines for mock vehicles", async () => {
    const repository = new MockFleetRepository();
    const requiredSignals = [
      "speed",
      "ignition",
      "movement",
      "fuelLevel",
      "batteryLevel",
      "externalVoltage",
      "engineRpm",
      "gnssHdop",
      "gsmSignal",
      "alarm",
    ];

    const signals = await repository.listAvailableTelemetrySignals("veh-atlas-12");
    const timeline = await repository.getVehicleTelemetryTimeline("veh-atlas-12", { preset: "today" });

    expect(signals.map((signal) => signal.id)).toEqual(expect.arrayContaining(requiredSignals));
    expect(timeline?.signals.map((signal) => signal.id)).toEqual(expect.arrayContaining(requiredSignals));

    for (const signalId of requiredSignals) {
      expect(timeline?.samples.some((sample) => sample.signalId === signalId)).toBe(true);
    }

    const speedSignal = signals.find((signal) => signal.id === "speed");
    expect(speedSignal).toMatchObject({
      attributeName: "speed",
      teltonikaAvlId: "24",
      unit: "km/h",
    });
  });

  it("derives mock telemetry timelines from repository instance vehicles", async () => {
    const seedVehicle = {
      ...MOCK_FLEET_FIXTURES[0],
      id: "veh-custom-seed",
      name: "Custom Seed Vehicle",
    };
    const repository = new MockFleetRepository([seedVehicle]);

    const listedVehicles = await repository.listVehicles();
    const timeline = await repository.getVehicleTelemetryTimeline("veh-custom-seed", { preset: "today" });
    const defaultTimeline = await repository.getVehicleTelemetryTimeline(MOCK_FLEET_FIXTURES[0].id, { preset: "today" });

    expect(listedVehicles.map((vehicle) => vehicle.id)).toEqual(["veh-custom-seed"]);
    expect(timeline?.vehicleId).toBe("veh-custom-seed");
    expect(timeline?.samples.length).toBeGreaterThan(0);
    expect(defaultTimeline).toBeNull();
  });

  it("rebases custom-date telemetry timelines onto the requested date", async () => {
    const repository = new MockFleetRepository();
    const timeline = await repository.getVehicleTelemetryTimeline("veh-atlas-12", {
      preset: "customDate",
      customDateIso: "2026-04-03",
    });

    expect(timeline?.rangeStartIso.startsWith("2026-04-03")).toBe(true);
    expect(timeline?.rangeEndIso.startsWith("2026-04-03")).toBe(true);
    expect(timeline?.samples.every((sample) => sample.timestampIso.startsWith("2026-04-03"))).toBe(true);
  });

  it("returns route segments with telemetry state, markers, direction samples, and alarm events", async () => {
    const repository = new MockPlaybackRepository();
    const route = await repository.getPlaybackRoute("veh-atlas-12", { preset: "today" });

    expect(route?.tripSegments.length).toBeGreaterThan(0);

    const segments = route?.tripSegments ?? [];
    expect(segments.every((segment) => segment.telemetryState?.state && segment.telemetryState.speedBand)).toBe(true);
    expect(segments.every((segment) => (segment.directionSamples?.length ?? 0) > 0)).toBe(true);
    expect(segments.every((segment) => (segment.telemetrySamples?.length ?? 0) > 0)).toBe(true);

    const markerTypes = segments.flatMap((segment) => segment.markers?.map((marker) => marker.type) ?? []);
    expect(markerTypes).toEqual(expect.arrayContaining(["stop", "break", "engineOff"]));

    const eventTypes = segments.flatMap((segment) => segment.eventMarkers?.map((marker) => marker.eventType) ?? []);
    expect(eventTypes).toContain("alarm");
  });

  it("keeps mock playback marker display durations from leaking into the moving vehicle marker state", async () => {
    const repository = new MockPlaybackRepository();
    const route = await repository.getPlaybackRoute("veh-atlas-12", { preset: "today" });

    if (!route) {
      throw new Error("Expected Atlas route.");
    }

    const breakMarker = route.tripSegments
      .flatMap((segment) => segment.markers ?? [])
      .find((marker) => marker.type === "break");

    if (!breakMarker?.durationMinutes) {
      throw new Error("Expected mock break marker with display duration.");
    }

    const markerProgress = getPlaybackProgressForRouteTimestamp(route, breakMarker.timestampIso);
    const afterPlaybackWindowProgress = getPlaybackProgressForRouteTimestamp(
      route,
      new Date(new Date(breakMarker.timestampIso).valueOf() + 3 * 60_000).toISOString(),
    );

    expect(markerProgress).not.toBeNull();
    expect(afterPlaybackWindowProgress).not.toBeNull();
    expect(breakMarker.durationMinutes).toBeGreaterThan(3);
    expect(getCurrentRouteTelemetryState(route, markerProgress ?? 0)?.markerStatus).toBe("driverBreak");
    expect(getCurrentRouteTelemetryState(route, afterPlaybackWindowProgress ?? 0)?.markerStatus).toBeUndefined();
  });

  it("uses road-following Eindhoven playback routes for every playback vehicle and derives sparse directions from the route path", async () => {
    const repository = new MockPlaybackRepository();
    const vehicles = await repository.listPlaybackVehicles();

    for (const vehicle of vehicles) {
      const route = await repository.getPlaybackRoute(vehicle.id, { preset: "today" });

      if (!route) {
        throw new Error(`Expected playback route for ${vehicle.id}.`);
      }

      expect(route.points.length).toBeGreaterThan(24);
      expect(route.tripSegments.every((segment) => (segment.directionSamples?.length ?? 0) <= 5)).toBe(true);

      const uniqueBearings = new Set(
        route.tripSegments
          .flatMap((segment) => segment.directionSamples ?? [])
          .map((sample) => Math.round(sample.directionDegrees / 15) * 15),
      );
      expect(uniqueBearings.size).toBeGreaterThan(1);

      for (const segment of route.tripSegments) {
        for (const sample of segment.directionSamples ?? []) {
          const pointIndex = route.points.findIndex(
            (point) => point.latitude === sample.latitude && point.longitude === sample.longitude,
          );
          const nextPoint = route.points[pointIndex + 1];

          expect(pointIndex).toBeGreaterThanOrEqual(0);
          expect(nextPoint).toBeTruthy();

          const expectedBearing =
            (((Math.atan2(
              Math.sin(((nextPoint.longitude - sample.longitude) * Math.PI) / 180) *
                Math.cos((nextPoint.latitude * Math.PI) / 180),
              Math.cos((sample.latitude * Math.PI) / 180) * Math.sin((nextPoint.latitude * Math.PI) / 180) -
                Math.sin((sample.latitude * Math.PI) / 180) *
                  Math.cos((nextPoint.latitude * Math.PI) / 180) *
                  Math.cos(((nextPoint.longitude - sample.longitude) * Math.PI) / 180),
            ) *
              180) /
              Math.PI +
              360) %
              360);
          const difference = Math.abs(((sample.directionDegrees - expectedBearing + 540) % 360) - 180);

          expect(difference).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("keeps demo trip segment routes visually separated and uses variable route speeds", async () => {
    const repository = new MockPlaybackRepository();
    const vehicles = await repository.listPlaybackVehicles();

    for (const vehicle of vehicles) {
      const route = await repository.getPlaybackRoute(vehicle.id, { preset: "today" });
      if (!route) {
        throw new Error(`Expected playback route for ${vehicle.id}.`);
      }

      const speedBuckets = new Set(route.points.map((point) => Math.round((point.speedKph ?? 0) / 5) * 5));
      expect(speedBuckets.size).toBeGreaterThanOrEqual(5);

      const segmentBounds = route.tripSegments.map((segment) => {
        const startIndex = Math.round((segment.startProgressPercent / 100) * (route.points.length - 1));
        const endIndex = Math.max(startIndex, Math.round((segment.endProgressPercent / 100) * (route.points.length - 1)));
        const points = route.points.slice(startIndex, endIndex + 1);

        return {
          minLat: Math.min(...points.map((point) => point.latitude)),
          maxLat: Math.max(...points.map((point) => point.latitude)),
          minLon: Math.min(...points.map((point) => point.longitude)),
          maxLon: Math.max(...points.map((point) => point.longitude)),
        };
      });

      for (let firstIndex = 0; firstIndex < segmentBounds.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 2; secondIndex < segmentBounds.length; secondIndex += 1) {
          const first = segmentBounds[firstIndex];
          const second = segmentBounds[secondIndex];
          const overlapLat = Math.max(0, Math.min(first.maxLat, second.maxLat) - Math.max(first.minLat, second.minLat));
          const overlapLon = Math.max(0, Math.min(first.maxLon, second.maxLon) - Math.max(first.minLon, second.minLon));

          expect(overlapLat * overlapLon).toBeLessThanOrEqual(0.00002);
        }
      }
    }
  });

  it("models current-day playback as one continuous journey split into connected trip segments", async () => {
    const repository = new MockPlaybackRepository();
    const vehicles = await repository.listPlaybackVehicles();

    for (const vehicle of vehicles) {
      const route = await repository.getPlaybackRoute(vehicle.id, { preset: "today" });
      if (!route) {
        throw new Error(`Expected playback route for ${vehicle.id}.`);
      }

      for (let segmentIndex = 0; segmentIndex < route.tripSegments.length - 1; segmentIndex += 1) {
        const currentSegment = route.tripSegments[segmentIndex];
        const nextSegment = route.tripSegments[segmentIndex + 1];
        const currentEndIndex = Math.round((currentSegment.endProgressPercent / 100) * (route.points.length - 1));
        const nextStartIndex = Math.round((nextSegment.startProgressPercent / 100) * (route.points.length - 1));

        expect(nextStartIndex).toBe(currentEndIndex);
        expect(route.points[nextStartIndex]).toMatchObject(route.points[currentEndIndex]);
      }
    }
  });

  it("keeps playback speed graph samples aligned with route point speeds", async () => {
    const repository = new MockPlaybackRepository();
    const route = await repository.getPlaybackRoute("veh-atlas-12", { preset: "today" });

    if (!route) {
      throw new Error("Expected Atlas playback route.");
    }

    for (const segment of route.tripSegments) {
      for (const graphPoint of segment.graphSeries ?? []) {
        const routePoint = route.points.find((point) => point.timestampIso === graphPoint.timestampIso);

        expect(routePoint).toBeTruthy();
        expect(graphPoint.speedKph).toBe(routePoint?.speedKph);
      }
    }
  });

  it("keeps live fleet vehicle positions correlated with the latest point in current route history", async () => {
    const fleetRepository = new MockFleetRepository();
    const playbackRepository = new MockPlaybackRepository();
    const vehicles = await fleetRepository.listVehicles();

    for (const vehicle of vehicles) {
      const route = await playbackRepository.getPlaybackRoute(vehicle.id, { preset: "today" });
      if (!route) {
        throw new Error(`Expected playback route for ${vehicle.id}.`);
      }

      const latestRoutePoint = route.points.at(-1);
      if (!latestRoutePoint) {
        throw new Error(`Expected route point for ${vehicle.id}.`);
      }

      expect(getDistanceMeters(vehicle, latestRoutePoint)).toBeLessThanOrEqual(15);
      expect(vehicle.lastUpdatedIso).toBe(latestRoutePoint.timestampIso);
      expect((vehicle.teltonika?.attributes.gpsLocation.value as any)).toMatchObject({
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
      });
    }
  });

  it("returns cloned playback telemetry timelines", async () => {
    const firstRepository = new MockPlaybackRepository();
    const firstTimeline = await firstRepository.getPlaybackTelemetryTimeline("veh-atlas-12", { preset: "today" });

    if (!firstTimeline) {
      throw new Error("Expected mock playback telemetry timeline.");
    }

    firstTimeline.samples[0].value = 999;

    const secondTimeline = await new MockPlaybackRepository().getPlaybackTelemetryTimeline("veh-atlas-12", { preset: "today" });
    expect(secondTimeline?.samples[0].value).not.toBe(999);
  });

  it("exposes report definitions, Teltonika-backed parameters, and generated preview rows", async () => {
    const repository = new MockReportsRepository();
    const definitions = await repository.listReportDefinitions();
    const parameters = await repository.listReportParameters();
    const preview = await repository.previewReport({
      definitionId: "daily-summary",
      period: { type: "preset", preset: "today" },
      vehicleSelection: { mode: "selected", vehicleIds: ["veh-atlas-12"] },
      parameterIds: ["speed", "ignition", "fuelLevel", "totalOdometer"],
      outputMode: "preview",
    });

    expect(definitions.map((definition) => definition.id)).toEqual(
      [
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
      ],
    );
    expect(definitions.every((definition) => (
      ["preview", "print", "export", "email", "schedule"] as const
    ).every((mode) => definition.supportedOutputModes.includes(mode)))).toBe(true);
    expect(parameters.find((parameter) => parameter.id === "totalOdometer")).toMatchObject({
      attributeName: "totalOdometer",
      teltonikaAvlId: "16",
    });
    expect(preview.columns.map((column) => column.id)).toEqual(["speed", "ignition", "fuelLevel", "totalOdometer"]);
    expect(preview.rows.length).toBeGreaterThan(0);
    expect(preview.rows[0].values).toHaveProperty("speed");
    expect(preview.summary).toHaveProperty("vehicleCount");
  });

  it("uses selected report columns when building preview rows", async () => {
    const repository = new MockReportsRepository();
    const preview = await repository.previewReport({
      definitionId: "daily-summary",
      period: { type: "preset", preset: "today" },
      vehicleSelection: { mode: "selected", vehicleIds: ["veh-atlas-12"] },
      parameterIds: ["speed", "ignition", "fuelLevel", "totalOdometer"],
      columnIds: ["speed", "fuelLevel"],
      outputMode: "preview",
    });

    expect(preview.columns.map((column) => column.id)).toEqual(["speed", "fuelLevel"]);
    expect(Object.keys(preview.rows[0].values)).toEqual(["speed", "fuelLevel"]);
    expect(preview.summary.parameterCount).toBe(2);
  });

  it("generates populated report preview sections from mock fleet data", async () => {
    const repository = new MockReportsRepository();
    const preview = await repository.previewReport({
      definitionId: "daily-summary",
      period: { type: "preset", preset: "today" },
      vehicleSelection: { mode: "all" },
      parameterIds: ["speed", "movement", "ignition", "tripOdometer", "alarm"],
      columnIds: ["speed", "movement", "alarm"],
      chartIds: ["distance-by-day", "activity-by-vehicle"],
      outputMode: "preview",
    });
    const summarySection = preview.sections?.find((section) => section.kind === "summary") as
      | { items?: Array<{ label: string; value: string }> }
      | undefined;
    const chartSections = preview.sections?.filter((section) => section.kind === "chart") as
      | Array<{ chart?: { points?: Array<{ label: string; value: number }> } }>
      | undefined;

    expect(summarySection?.items?.map((item) => item.label)).toEqual(
      expect.arrayContaining(["Total distance", "Trips", "Active vehicles", "Alarms"]),
    );
    expect(chartSections?.length).toBeGreaterThan(0);
    expect(chartSections?.[0].chart?.points?.length).toBeGreaterThan(0);
  });

  it("adds map and raw report sections when output options request them", async () => {
    const repository = new MockReportsRepository();
    const preview = await repository.previewReport({
      definitionId: "daily-summary",
      period: { type: "preset", preset: "today" },
      vehicleSelection: { mode: "all" },
      parameterIds: ["speed", "movement", "ignition", "tripOdometer", "alarm"],
      columnIds: ["speed", "movement", "alarm"],
      outputMode: "preview",
      includeMap: true,
      includeRawData: true,
    });

    expect(preview.sections?.map((section) => section.title)).toEqual(
      expect.arrayContaining(["Route map", "Raw datapoints"]),
    );
  });

  it("keeps report preview values compatible with their parameter definitions", async () => {
    const repository = new MockReportsRepository();
    const preview = await repository.previewReport({
      definitionId: "alarms",
      period: { type: "preset", preset: "last7Days" },
      vehicleSelection: { mode: "all" },
      parameterIds: ["alarm", "speed", "ignition", "gsmSignal"],
      outputMode: "preview",
    });

    for (const row of preview.rows) {
      for (const column of preview.columns) {
        const value = row.values[column.id];
        if (value === null) continue;
        expect(isTelemetrySignalValueCompatible(column, value)).toBe(true);
      }
    }
  });

  it("filters report preview rows by selected vehicle status", async () => {
    const repository = new MockReportsRepository();
    const preview = await repository.previewReport({
      definitionId: "asset-health",
      period: { type: "preset", preset: "today" },
      vehicleSelection: { mode: "status", statusIds: ["alerting"] },
      parameterIds: ["batteryLevel", "externalVoltage", "gsmSignal"],
      outputMode: "preview",
    });

    expect(preview.rows.map((row) => row.vehicleId)).toEqual(["veh-delta-24"]);
    expect(preview.summary.vehicleCount).toBe(1);
  });

  it("provides realistic historical activity and dispatcher assistance fixtures", () => {
    expect(MOCK_EVENT_FIXTURES.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(["trip", "ignition", "alarm", "stop", "break", "engineOff", "telemetry"]),
    );
    expect(MOCK_DAILY_ACTIVITY_FIXTURES[0]).toMatchObject({
      vehicleId: "veh-atlas-12",
      dateIso: "2026-03-28",
    });
    expect(MOCK_DAILY_ACTIVITY_FIXTURES[0].telemetryRanges.map((range) => range.signalId)).toEqual(
      expect.arrayContaining(["speed", "fuelLevel", "batteryLevel", "engineRpm"]),
    );

    expect(MOCK_DISPATCHER_FIXTURES[0].candidates[0]).toMatchObject({
      rank: 1,
      availability: "available",
    });
    expect(MOCK_DISPATCHER_FIXTURES[0].candidates[0].routeSummary).toContain("min");
  });

  it("adds dense Teltonika telemetry to mock assets without leaking mutable fixture state", async () => {
    const repository = new MockAssetsRepository();
    const assets = await repository.listAssets();
    const atlas = assets.find((asset) => asset.id === "asset-atlas-prime");

    expect(atlas?.availableTelemetrySignals?.map((signal) => signal.id)).toEqual(
      expect.arrayContaining(["gnssHdop", "engineRpm", "externalVoltage", "fuelLevel", "totalOdometer", "gsmSignal"]),
    );
    expect(atlas?.latestTelemetrySamples?.map((sample) => sample.signalId)).toEqual(
      expect.arrayContaining(["speed", "engineRpm", "batteryLevel", "gnssHdop"]),
    );

    if (!atlas?.latestTelemetrySamples?.length) {
      throw new Error("Expected asset telemetry samples.");
    }

    atlas.latestTelemetrySamples[0].value = 999;
    const freshAtlas = (await new MockAssetsRepository().listAssets()).find((asset) => asset.id === "asset-atlas-prime");
    expect(freshAtlas?.latestTelemetrySamples?.[0].value).not.toBe(999);
  });
});
