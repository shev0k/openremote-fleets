import { describe, expect, it } from "vitest";
import { SquareParking } from "lucide-react";
import { getVehicleDisplayStatusMeta, resolveVehicleDisplayStatus } from "./vehicleDisplayStatus";

describe("vehicleDisplayStatus", () => {
  it("prioritizes alerting above raw motion state", () => {
    expect(
      resolveVehicleDisplayStatus({
        status: "moving",
        speedKph: 42,
        activeAlertCount: 2,
      }),
    ).toBe("alerting");
  });

  it("keeps dispatcher-friendly stationary states distinct", () => {
    expect(
      resolveVehicleDisplayStatus({
        status: "idling",
        speedKph: 0,
        activeAlertCount: 0,
      }),
    ).toBe("idling");

    expect(
      resolveVehicleDisplayStatus({
        status: "parked",
        speedKph: 0,
        activeAlertCount: 0,
      }),
    ).toBe("parked");

    expect(
      resolveVehicleDisplayStatus({
        status: "stationary",
        speedKph: 0,
        activeAlertCount: 0,
      }),
    ).toBe("stationary");
  });

  it("returns the shared presentation metadata for resolved statuses", () => {
    const movingMeta = getVehicleDisplayStatusMeta({
      status: "moving",
      speedKph: 18,
      activeAlertCount: 0,
    });

    expect(movingMeta.id).toBe("moving");
    expect(movingMeta.label).toBe("Moving");
    expect(movingMeta.priority).toBeGreaterThan(0);
    expect(movingMeta.badgeClassName).toContain("vehicle-status-moving");
  });

  it("uses the shared parked marker color class and a parking-specific icon", () => {
    const parkedMeta = getVehicleDisplayStatusMeta({
      status: "parked",
      speedKph: 0,
      activeAlertCount: 0,
    });

    expect(parkedMeta.badgeClassName).toContain("vehicle-status-parked");
    expect(parkedMeta.colorClassName).toContain("vehicle-status-parked");
    expect(parkedMeta.icon).toBe(SquareParking);
  });

  it("keeps explicit offline state offline", () => {
    expect(
      resolveVehicleDisplayStatus({
        status: "offline",
        speedKph: 12,
        activeAlertCount: 0,
      }),
    ).toBe("offline");
  });

  it("keeps explicit alerting with zero count visible as alerting", () => {
    expect(
      resolveVehicleDisplayStatus({
        status: "alerting",
        speedKph: 0,
        activeAlertCount: 0,
      }),
    ).toBe("alerting");
  });

  it("keeps explicit moving visible as moving", () => {
    expect(
      resolveVehicleDisplayStatus({
        status: "moving",
        speedKph: 12,
        activeAlertCount: 0,
      }),
    ).toBe("moving");
  });

  it("ignores negative alert counts", () => {
    expect(
      resolveVehicleDisplayStatus({
        status: "moving",
        speedKph: 12,
        activeAlertCount: -3,
      }),
    ).toBe("moving");
  });
});
