import { describe, expect, it } from "vitest";
import { deriveVehicleOperationalStatus } from "./vehicleOperationalStatus";

describe("deriveVehicleOperationalStatus", () => {
  it.each([
    [{ activeAlertCount: 2, hasLocation: true, ignitionOn: true, movement: true, speedKph: 24 }, "alerting"],
    [{ activeAlertCount: 0, explicitStatus: "offline", hasLocation: true, ignitionOn: true, movement: true, speedKph: 24 }, "offline"],
    [{ activeAlertCount: 0, hasLocation: false, ignitionOn: true, movement: true, speedKph: 24 }, "moving"],
    [{ activeAlertCount: 0, hasLocation: true, ignitionOn: false, movement: false, speedKph: 0 }, "parked"],
    [{ activeAlertCount: 0, hasLocation: true, ignitionOn: null, movement: null, speedKph: null }, "stationary"],
    [{ activeAlertCount: 0, hasLocation: true, ignitionOn: null, movement: true, speedKph: null }, "moving"],
    [{ activeAlertCount: 0, hasLocation: true, ignitionOn: true, movement: false, speedKph: 0 }, "idling"],
    [{ activeAlertCount: 0, hasLocation: true, ignitionOn: true, movement: true, speedKph: 1 }, "moving"],
    [{ activeAlertCount: -1, hasLocation: true, ignitionOn: true, movement: true, speedKph: 1 }, "moving"],
  ] as const)("derives %s as %s", (input, expected) => {
    expect(deriveVehicleOperationalStatus(input)).toBe(expected);
  });

  it("treats missing GPS as a signal quality issue instead of device offline", () => {
    expect(
      deriveVehicleOperationalStatus({
        activeAlertCount: 0,
        hasLocation: false,
        ignitionOn: false,
        movement: false,
        speedKph: 0,
      }),
    ).toBe("parked");
  });
});
