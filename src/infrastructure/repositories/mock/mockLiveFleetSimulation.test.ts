import { describe, expect, it } from "vitest";
import { MockFleetRepository } from "./mockFleetRepository";
import { createMockLiveFleetSimulationSnapshot } from "./mockLiveFleetSimulation";
import { MockPlaybackRepository } from "./mockPlaybackRepository";
import { MOCK_ALERT_FIXTURES } from "./fixtures/alertsFixtures";

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function getDistanceMeters(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
): number {
  const earthRadiusMeters = 6_371_000;
  const lat1 = toRadians(start.latitude);
  const lat2 = toRadians(end.latitude);
  const deltaLat = toRadians(end.latitude - start.latitude);
  const deltaLon = toRadians(end.longitude - start.longitude);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

describe("mock live fleet simulation", () => {
  it("starts live mock vehicles with meaningful already-traversed route history", async () => {
    const fleetRepository = new MockFleetRepository();
    const playbackRepository = new MockPlaybackRepository();
    const vehicles = await fleetRepository.listVehicles();
    const route = await playbackRepository.getPlaybackRoute("veh-atlas-12", { preset: "last24Hours" });

    if (!route) {
      throw new Error("Expected Atlas route.");
    }

    const snapshot = createMockLiveFleetSimulationSnapshot({
      vehicles,
      routesByVehicleId: { "veh-atlas-12": route },
      selectedVehicleId: "veh-atlas-12",
      nowMs: 0,
    });

    expect(snapshot.selectedRoute?.points.length).toBeGreaterThan(route.points.length * 0.25);
    expect(snapshot.selectedRoute?.points.length).toBeLessThan(route.points.length);
    expect(snapshot.selectedRoute?.tripSegments.length).toBeGreaterThan(1);
  });

  it("can start the mock map with route-reached active alerts already visible", async () => {
    const fleetRepository = new MockFleetRepository();
    const playbackRepository = new MockPlaybackRepository();
    const vehicles = await fleetRepository.listVehicles();
    const routes = await Promise.all([
      playbackRepository.getPlaybackRoute("veh-harbor-07", { preset: "last24Hours" }),
      playbackRepository.getPlaybackRoute("veh-delta-24", { preset: "last24Hours" }),
    ]);

    if (!routes[0] || !routes[1]) {
      throw new Error("Expected Harbor and Delta routes.");
    }

    const snapshot = createMockLiveFleetSimulationSnapshot({
      vehicles,
      routesByVehicleId: {
        "veh-harbor-07": routes[0],
        "veh-delta-24": routes[1],
      },
      nowMs: 0,
    });

    const harborVehicle = snapshot.vehicles.find((vehicle) => vehicle.id === "veh-harbor-07");
    const deltaVehicle = snapshot.vehicles.find((vehicle) => vehicle.id === "veh-delta-24");

    expect([harborVehicle?.status, deltaVehicle?.status]).toContain("alerting");
    expect((harborVehicle?.activeAlertCount ?? 0) + (deltaVehicle?.activeAlertCount ?? 0)).toBeGreaterThan(0);
  });

  it("moves mock vehicles along their road-following current route and updates Teltonika heading", async () => {
    const fleetRepository = new MockFleetRepository();
    const playbackRepository = new MockPlaybackRepository();
    const vehicles = await fleetRepository.listVehicles();
    const route = await playbackRepository.getPlaybackRoute("veh-atlas-12", { preset: "last24Hours" });

    if (!route) {
      throw new Error("Expected Atlas route.");
    }

    const firstSnapshot = createMockLiveFleetSimulationSnapshot({
      vehicles,
      routesByVehicleId: { "veh-atlas-12": route },
      selectedVehicleId: "veh-atlas-12",
      nowMs: 1_000,
      useVehicleOffsets: false,
    });
    const secondSnapshot = createMockLiveFleetSimulationSnapshot({
      vehicles,
      routesByVehicleId: { "veh-atlas-12": route },
      selectedVehicleId: "veh-atlas-12",
      nowMs: 70_000,
      useVehicleOffsets: false,
    });

    const firstVehicle = firstSnapshot.vehicles.find((vehicle) => vehicle.id === "veh-atlas-12");
    const secondVehicle = secondSnapshot.vehicles.find((vehicle) => vehicle.id === "veh-atlas-12");

    expect(firstVehicle).toBeTruthy();
    expect(secondVehicle).toBeTruthy();
    expect(secondVehicle?.latitude).not.toBe(firstVehicle?.latitude);
    expect(secondVehicle?.longitude).not.toBe(firstVehicle?.longitude);
    expect(secondVehicle?.heading).toBe(secondVehicle?.teltonika?.attributes.direction.value);
    expect(secondVehicle?.teltonika?.attributes.gpsLocation.value).toMatchObject({
      latitude: secondVehicle?.latitude,
      longitude: secondVehicle?.longitude,
    });
  });

  it("moves at a real-world pace across a 10 second live update window", async () => {
    const fleetRepository = new MockFleetRepository();
    const playbackRepository = new MockPlaybackRepository();
    const vehicles = await fleetRepository.listVehicles();
    const route = await playbackRepository.getPlaybackRoute("veh-atlas-12", { preset: "last24Hours" });

    if (!route) {
      throw new Error("Expected Atlas route.");
    }

    const firstSnapshot = createMockLiveFleetSimulationSnapshot({
      vehicles,
      routesByVehicleId: { "veh-atlas-12": route },
      selectedVehicleId: "veh-atlas-12",
      nowMs: 1_000,
      useVehicleOffsets: false,
    });
    const secondSnapshot = createMockLiveFleetSimulationSnapshot({
      vehicles,
      routesByVehicleId: { "veh-atlas-12": route },
      selectedVehicleId: "veh-atlas-12",
      nowMs: 11_000,
      useVehicleOffsets: false,
    });

    const firstVehicle = firstSnapshot.vehicles.find((vehicle) => vehicle.id === "veh-atlas-12");
    const secondVehicle = secondSnapshot.vehicles.find((vehicle) => vehicle.id === "veh-atlas-12");

    if (!firstVehicle || !secondVehicle) {
      throw new Error("Expected simulated Atlas positions.");
    }

    expect(getDistanceMeters(firstVehicle, secondVehicle)).toBeLessThanOrEqual(350);
  });

  it("does not move offline mock vehicles", async () => {
    const fleetRepository = new MockFleetRepository();
    const playbackRepository = new MockPlaybackRepository();
    const vehicles = await fleetRepository.listVehicles();
    const route = await playbackRepository.getPlaybackRoute("veh-nimbus-03", { preset: "last24Hours" });
    const sourceVehicle = vehicles.find((vehicle) => vehicle.id === "veh-nimbus-03");

    if (!route || !sourceVehicle) {
      throw new Error("Expected Nimbus route and vehicle.");
    }

    const snapshot = createMockLiveFleetSimulationSnapshot({
      vehicles,
      routesByVehicleId: { "veh-nimbus-03": route },
      selectedVehicleId: "veh-nimbus-03",
      nowMs: 11_000,
      useVehicleOffsets: false,
    });
    const simulatedVehicle = snapshot.vehicles.find((vehicle) => vehicle.id === "veh-nimbus-03");

    expect(simulatedVehicle?.latitude).toBe(sourceVehicle.latitude);
    expect(simulatedVehicle?.longitude).toBe(sourceVehicle.longitude);
    expect(simulatedVehicle?.lastUpdatedIso).toBe(sourceVehicle.lastUpdatedIso);
  });

  it("clips the selected vehicle route history to the current live endpoint as time advances", async () => {
    const fleetRepository = new MockFleetRepository();
    const playbackRepository = new MockPlaybackRepository();
    const vehicles = await fleetRepository.listVehicles();
    const route = await playbackRepository.getPlaybackRoute("veh-atlas-12", { preset: "last24Hours" });

    if (!route) {
      throw new Error("Expected Atlas route.");
    }

    const firstSnapshot = createMockLiveFleetSimulationSnapshot({
      vehicles,
      routesByVehicleId: { "veh-atlas-12": route },
      selectedVehicleId: "veh-atlas-12",
      nowMs: 1_000,
      useVehicleOffsets: false,
    });
    const secondSnapshot = createMockLiveFleetSimulationSnapshot({
      vehicles,
      routesByVehicleId: { "veh-atlas-12": route },
      selectedVehicleId: "veh-atlas-12",
      nowMs: 70_000,
      useVehicleOffsets: false,
    });

    expect(firstSnapshot.selectedRoute?.points.length).toBeGreaterThan(1);
    expect(secondSnapshot.selectedRoute?.points.length).toBeGreaterThan(firstSnapshot.selectedRoute?.points.length ?? 0);
    expect(secondSnapshot.selectedRoute?.points.at(-1)?.timestampIso).toBe(secondSnapshot.vehicles[0].lastUpdatedIso);
    expect(secondSnapshot.selectedRoute?.tripSegments.at(-1)?.endTimeIso).toBe(secondSnapshot.vehicles[0].lastUpdatedIso);
  });

  it("starts alerting mock vehicles as normal and transitions them after the alert event time", async () => {
    const fleetRepository = new MockFleetRepository();
    const playbackRepository = new MockPlaybackRepository();
    const vehicles = await fleetRepository.listVehicles();
    const route = await playbackRepository.getPlaybackRoute("veh-delta-24", { preset: "last24Hours" });

    if (!route) {
      throw new Error("Expected Delta route.");
    }

    const beforeAlertSnapshot = createMockLiveFleetSimulationSnapshot({
      vehicles,
      routesByVehicleId: { "veh-delta-24": route },
      selectedVehicleId: "veh-delta-24",
      nowMs: 60_000,
      useVehicleOffsets: false,
    });
    const afterAlertSnapshot = createMockLiveFleetSimulationSnapshot({
      vehicles,
      routesByVehicleId: { "veh-delta-24": route },
      selectedVehicleId: "veh-delta-24",
      nowMs: 16 * 60_000,
      useVehicleOffsets: false,
    });

    const beforeAlertVehicle = beforeAlertSnapshot.vehicles.find((vehicle) => vehicle.id === "veh-delta-24");
    const afterAlertVehicle = afterAlertSnapshot.vehicles.find((vehicle) => vehicle.id === "veh-delta-24");

    expect(beforeAlertVehicle?.status).toBe("moving");
    expect(beforeAlertVehicle?.activeAlertCount).toBe(0);
    expect(afterAlertVehicle?.status).toBe("alerting");
    expect(afterAlertVehicle?.activeAlertCount).toBeGreaterThan(0);
  });

  it("moves Harbor 07 out of idling once live motion begins", async () => {
    const fleetRepository = new MockFleetRepository();
    const playbackRepository = new MockPlaybackRepository();
    const vehicles = await fleetRepository.listVehicles();
    const route = await playbackRepository.getPlaybackRoute("veh-harbor-07", { preset: "last24Hours" });

    if (!route) {
      throw new Error("Expected Harbor route.");
    }

    const snapshot = createMockLiveFleetSimulationSnapshot({
      vehicles,
      routesByVehicleId: { "veh-harbor-07": route },
      selectedVehicleId: "veh-harbor-07",
      nowMs: 60_000,
      useVehicleOffsets: false,
    });
    const harborVehicle = snapshot.vehicles.find((vehicle) => vehicle.id === "veh-harbor-07");

    expect(harborVehicle?.speedKph).toBeGreaterThan(2);
    expect(harborVehicle?.status).toBe("moving");
    expect(harborVehicle?.activeAlertCount).toBe(0);
  });

  it("uses a motion-compatible critical Harbor alert after the route event time", async () => {
    const fleetRepository = new MockFleetRepository();
    const playbackRepository = new MockPlaybackRepository();
    const vehicles = await fleetRepository.listVehicles();
    const route = await playbackRepository.getPlaybackRoute("veh-harbor-07", { preset: "last24Hours" });
    const harborAlert = MOCK_ALERT_FIXTURES.find((alert) => alert.vehicleId === "veh-harbor-07");

    if (!route) {
      throw new Error("Expected Harbor route.");
    }

    const beforeAlertSnapshot = createMockLiveFleetSimulationSnapshot({
      vehicles,
      routesByVehicleId: { "veh-harbor-07": route },
      selectedVehicleId: "veh-harbor-07",
      nowMs: 60_000,
      useVehicleOffsets: false,
    });
    const afterAlertSnapshot = createMockLiveFleetSimulationSnapshot({
      vehicles,
      routesByVehicleId: { "veh-harbor-07": route },
      selectedVehicleId: "veh-harbor-07",
      nowMs: 7 * 60_000,
      useVehicleOffsets: false,
    });

    const beforeAlertVehicle = beforeAlertSnapshot.vehicles.find((vehicle) => vehicle.id === "veh-harbor-07");
    const afterAlertVehicle = afterAlertSnapshot.vehicles.find((vehicle) => vehicle.id === "veh-harbor-07");

    expect(harborAlert).toMatchObject({
      id: "alert-route-deviation-harbor",
      severity: "high",
      type: "Route Deviation",
      sourceAttribute: "gpsLocation",
    });
    expect(harborAlert?.rule).not.toContain("Ignition");
    expect(beforeAlertVehicle?.status).toBe("moving");
    expect(beforeAlertVehicle?.activeAlertCount).toBe(0);
    expect(afterAlertVehicle?.status).toBe("alerting");
    expect(afterAlertVehicle?.activeAlertCount).toBeGreaterThan(0);
  });
});
