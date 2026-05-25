import { describe, expect, it } from "vitest";
import type { DispatcherAssistanceRequest } from "./dispatcher";
import type { DailyActivitySummary, FleetEvent } from "./events";

describe("obsolete scope contracts", () => {
  it("models event and daily activity contracts around tracker identifiers", () => {
    const event: FleetEvent = {
      id: "evt-ignition-on",
      vehicleId: "veh-atlas-12",
      eventType: "ignition",
      timestampIso: "2026-03-29T06:45:00Z",
      title: "Ignition on",
      state: "started",
      sourceAttribute: "ignition",
      driverIdentifier: "ibutton-0007104552",
      location: { latitude: 52.0907, longitude: 5.1214 },
    };

    const summary: DailyActivitySummary = {
      vehicleId: "veh-atlas-12",
      dateIso: "2026-03-29",
      driverIdentifiers: ["ibutton-0007104552"],
      tripCount: 4,
      distanceKm: 186.4,
      activeMinutes: 312,
      idleMinutes: 44,
      stopCount: 8,
      alarmCount: 2,
      fuelUsedLiters: 18.6,
      averageFuelConsumptionLitersPer100Km: 10,
      telemetryRanges: [
        { signalId: "speed", min: 0, max: 94, average: 42, unit: "km/h" },
      ],
    };

    expect(event.driverIdentifier).toBe(summary.driverIdentifiers[0]);
    expect(summary.telemetryRanges[0].signalId).toBe("speed");
  });

  it("models dispatcher assistance as a request and ranked candidates", () => {
    const request: DispatcherAssistanceRequest = {
      id: "dispatch-flag-1",
      label: "Blocked van",
      createdAtIso: "2026-03-29T12:30:00Z",
      location: { latitude: 52.3702, longitude: 4.8952 },
      requiredVehicleClasses: ["van"],
      candidates: [
        {
          vehicleId: "veh-delta-08",
          rank: 1,
          distanceKm: 3.4,
          etaMinutes: 9,
          availability: "available",
          activeAlertCount: 0,
          routeSummary: "Via S100",
          logbookSnippet: "Finished delivery 6 minutes ago.",
        },
      ],
    };

    expect(request.candidates[0]).toMatchObject({
      rank: 1,
      availability: "available",
      activeAlertCount: 0,
    });
  });
});
