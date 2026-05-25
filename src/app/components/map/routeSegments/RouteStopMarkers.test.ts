/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { DEFAULT_APP_PREFERENCES } from "../../../../domain/models/preferences";
import { getRouteStopMarkerColor, ROUTE_STOP_MARKER_SIZE } from "./RouteStopMarkers";

describe("route stop markers", () => {
  it("uses a compact marker so event points do not block route inspection", () => {
    expect(ROUTE_STOP_MARKER_SIZE).toBeLessThanOrEqual(24);
  });

  it("uses the orange idling color for stop markers", () => {
    expect(
      getRouteStopMarkerColor(
        {
          id: "stop-1",
          type: "stop",
          timestampIso: "2026-05-15T08:00:00.000Z",
          latitude: 51.45,
          longitude: 5.49,
        },
        DEFAULT_APP_PREFERENCES.mapColors,
      ),
    ).toBe(DEFAULT_APP_PREFERENCES.mapColors.vehicleIdling);
  });
});
