import { describe, expect, it } from "vitest";
import {
  createGoogleStreetViewEmbedUrl,
  resolveGoogleMapsEmbedConfig,
} from "./googleMapsEmbedConfig";

describe("googleMapsEmbedConfig", () => {
  it("treats a blank Maps Embed API key as missing configuration", () => {
    expect(resolveGoogleMapsEmbedConfig({ VITE_GOOGLE_MAPS_EMBED_API_KEY: "  " })).toEqual({
      status: "missing",
    });
  });

  it("builds an encoded Street View URL only for valid coordinates", () => {
    expect(
      createGoogleStreetViewEmbedUrl({
        apiKey: "maps-test-key",
        latitude: 51.4416,
        longitude: 5.4697,
        heading: 452,
        pitch: 0,
        fov: 75,
      }),
    ).toBe(
      "https://www.google.com/maps/embed/v1/streetview?key=maps-test-key&location=51.4416%2C5.4697&heading=92&pitch=0&fov=75",
    );

    expect(
      createGoogleStreetViewEmbedUrl({
        apiKey: "maps-test-key",
        latitude: 95,
        longitude: 5.4697,
        heading: 92,
      }),
    ).toBeNull();
  });
});
