import { describe, expect, it } from "vitest";
import type L from "leaflet";
import {
  getVisibleLongitudeWorldOffsets,
  getWrappedMarkerKey,
  getWrappedMarkerPositions,
  normalizeLongitude,
} from "./wrappedWorldMarkers";

describe("wrapped world marker helpers", () => {
  it("normalizes longitudes into the base world range", () => {
    expect(normalizeLongitude(365)).toBe(5);
    expect(normalizeLongitude(-185)).toBe(175);
    expect(normalizeLongitude(180)).toBe(180);
  });

  it("returns only the base world when the viewport is inside one world copy", () => {
    expect(
      getVisibleLongitudeWorldOffsets({
        projectedX: 1400,
        pixelMinX: 1000,
        pixelMaxX: 1800,
        worldWidthPx: 4096,
        viewportMarginPx: 0,
      }),
    ).toEqual([0]);
  });

  it("keeps the base marker and adds only visible wrapped world offsets", () => {
    expect(
      getVisibleLongitudeWorldOffsets({
        projectedX: 128,
        pixelMinX: 300,
        pixelMaxX: 600,
        worldWidthPx: 256,
        viewportMarginPx: 0,
      }),
    ).toEqual([0, 1]);
  });

  it("builds stable marker keys for wrapped world copies", () => {
    expect(getWrappedMarkerKey("veh-1", 0)).toBe("veh-1");
    expect(getWrappedMarkerKey("veh-1", -1)).toBe("veh-1::wrap:-1");
  });

  it("projects normalized marker coordinates into each visible wrapped world", () => {
    const map = {
      getZoom: () => 0,
      project: () => ({ x: 128, y: 128 }),
      getPixelBounds: () => ({
        min: { x: -260, y: -120 },
        max: { x: 520, y: 360 },
      }),
      getPixelWorldBounds: () => ({
        getSize: () => ({ x: 256, y: 256 }),
      }),
    };

    expect(
      getWrappedMarkerPositions({
        map: map as unknown as L.Map,
        vehicleId: "veh-1",
        latitude: 51.45,
        longitude: 365.49,
        viewportMarginPx: 0,
      }),
    ).toEqual([
      { key: "veh-1::wrap:-1", latLng: [51.45, -354.51], worldOffset: -1 },
      { key: "veh-1", latLng: [51.45, 5.49], worldOffset: 0 },
      { key: "veh-1::wrap:1", latLng: [51.45, 365.49], worldOffset: 1 },
    ]);
  });
});
