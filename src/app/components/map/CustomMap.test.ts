/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import L from "leaflet";
// @ts-expect-error This test reads a local CSS file without adding Node globals to the app tsconfig.
import { readFileSync } from "node:fs";
import { DEFAULT_APP_PREFERENCES } from "../../../domain/models/preferences";
import type { Vehicle } from "../../../domain/models/vehicle";
import { buildRoutePlaybackVehicleViewModel } from "../playback/routePlaybackVehicleViewModel";
import {
  createVehicleMarkerHtml,
  createVehicleTooltipHtml,
  getAnchoredFocusPanStart,
  getMapFocusDecision,
  getOffsetFocusLatLng,
  getRouteFitKey,
  getRouteFitBoundsOptions,
  getMapFocusTravelAnimation,
  getSelectedVehicleFocusOptions,
  getSelectedVehicleFocusTarget,
  getVehicleFocusTravelAnimation,
  shouldRenderRouteSegmentLayer,
  getStableLeafletMapOptions,
  getReliableVehicleHeading,
  getTileConfig,
  getTileLayerClassName,
} from "./CustomMap";

const themeCss = readFileSync("src/styles/theme.css", "utf8");

function createVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "vehicle-1",
    name: "Atlas 12",
    plate: "BR-482-K",
    status: "moving",
    speedKph: 42,
    ignitionOn: true,
    latitude: 51.45,
    longitude: 5.49,
    heading: 90,
    lastUpdatedIso: "2026-03-29T09:12:00.000Z",
    driverName: "Driver & Co",
    trackerId: "352093086403655",
    assetName: "Atlas",
    assetClass: "truck",
    deviceType: "Teltonika FMC003",
    activeAlertCount: 0,
    teltonika: {
      imei: "352093086403655",
      model: "FMC003",
      protocol: "teltonika:tcp:avl",
      codec: "CODEC_8",
      timestampIso: "2026-03-29T09:12:00.000Z",
      attributes: {
        direction: {
          avlId: "ang",
          attributeName: "direction",
          displayName: "Direction",
          value: 90,
          unit: "deg",
          parameterGroup: "Frame",
          timestampIso: "2026-03-29T09:12:00.000Z",
        },
        satellites: {
          avlId: "sat",
          attributeName: "satellites",
          displayName: "Satellites",
          value: 12,
          parameterGroup: "Frame",
          timestampIso: "2026-03-29T09:12:00.000Z",
        },
        gnssStatus: {
          avlId: "69",
          attributeName: "gnssStatus",
          displayName: "GNSS Status",
          value: 1,
          parameterGroup: "Permanent I/O elements",
          timestampIso: "2026-03-29T09:12:00.000Z",
        },
        gnssHdop: {
          avlId: "182",
          attributeName: "gnssHdop",
          displayName: "GNSS HDOP",
          value: 0.8,
          parameterGroup: "Permanent I/O elements",
          timestampIso: "2026-03-29T09:12:00.000Z",
        },
      },
    },
    ...overrides,
  };
}

describe("CustomMap tooltip rendering", () => {
  it("escapes vehicle fields before interpolating them into Leaflet tooltip HTML", () => {
    const vehicle: Vehicle = createVehicle({
      name: "<img src=x onerror=alert(1)>",
      plate: "BR-482-K",
      driverName: "Driver & Co",
    });

    const html = createVehicleTooltipHtml(vehicle, "light");

    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("Driver &amp; Co");
  });

  it("falls back to Driver ID when the driver name is missing", () => {
    const html = createVehicleTooltipHtml(
      createVehicle({
        driverName: "Unassigned",
        driverIdentifier: "0007104552",
      }),
      "light",
    );

    expect(html).toContain("Driver ID 0007104552");
    expect(html).not.toContain("Unassigned");
  });

  it("uses Driver ID for placeholder driver names and escapes the identifier", () => {
    const html = createVehicleTooltipHtml(
      createVehicle({
        driverName: "--",
        driverIdentifier: "id-<710>&4552",
      }),
      "light",
    );

    expect(html).toContain("Driver ID id-&lt;710&gt;&amp;4552");
    expect(html).not.toContain("id-<710>&4552");
  });

  it("keeps Unassigned when neither driver name nor Driver ID is useful", () => {
    const html = createVehicleTooltipHtml(
      createVehicle({
        driverName: "",
        driverIdentifier: "--",
      }),
      "light",
    );

    expect(html).toContain("Unassigned");
    expect(html).not.toContain("Driver ID");
  });
});

describe("CustomMap vehicle marker rendering", () => {
  it("keeps a neutral dark basemap in dark mode", () => {
    expect(getTileConfig("default", "dark").url).toContain("/dark_all/");
    expect(getTileConfig("default", "dark").url).not.toContain("/voyager/");
    expect(getTileLayerClassName("default", "dark")).toBe("map-tile-dark-neutral-readable");
  });

  it("uses a context-rich light basemap so roads and terrain do not look flat", () => {
    expect(getTileConfig("default", "light").url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(getTileLayerClassName("default", "light")).toBe("map-tile-light-detailed");
  });

  it("keeps the light basemap color-restrained while increasing linework contrast", () => {
    const match = themeCss.match(/\.map-tile-light-detailed[\s\S]*?filter:\s*([^;]+);/);

    expect(match).not.toBeNull();
    expect(match?.[1]).toContain("brightness(1.01)");
    expect(match?.[1]).toContain("saturate(0.75)");
    expect(match?.[1]).toContain("contrast(1.05)");
    expect(match?.[1]).not.toContain("hue-rotate");
    expect(match?.[1]).not.toContain("sepia");
  });

  it("keeps Leaflet zoom animations enabled for smooth map controls", () => {
    expect(getStableLeafletMapOptions()).toMatchObject({
      zoomAnimation: true,
      markerZoomAnimation: true,
      fadeAnimation: true,
    });
  });

  it("offsets selected-vehicle focus for bottom timeline overlays", () => {
    const projectedPoints: Array<{ x: number; y: number; zoom: number }> = [];
    const fakeMap = {
      project: (_latLng: [number, number], zoom: number) => {
        projectedPoints.push({ x: 100, y: 200, zoom });
        return { add: ([x, y]: [number, number]) => ({ x: 100 + x, y: 200 + y }) };
      },
      unproject: (point: { x: number; y: number }, zoom: number) => ({ lat: point.y, lng: point.x, zoom }),
    };

    const target = getOffsetFocusLatLng(fakeMap, [51.4416, 5.4697], 14, 260);

    expect(projectedPoints).toEqual([{ x: 100, y: 200, zoom: 14 }]);
    expect(target).toMatchObject({ lat: 330, lng: 100, zoom: 14 });
  });

  it("keeps route fit padding asymmetric when a bottom overlay occupies map space", () => {
    expect(getRouteFitBoundsOptions(260)).toMatchObject({
      paddingTopLeft: [72, 72],
      paddingBottomRight: [72, 332],
      maxZoom: 14,
      animate: true,
    });
  });

  it("can disable animation for the first road-aligned route fit", () => {
    expect(getRouteFitBoundsOptions(260, false)).toMatchObject({
      paddingTopLeft: [72, 72],
      paddingBottomRight: [72, 332],
      maxZoom: 14,
      animate: false,
    });
  });

  it("uses a shorter focus motion while route history is loading", () => {
    expect(getSelectedVehicleFocusOptions(true)).toEqual({ animate: true, duration: 0.55 });
    expect(getSelectedVehicleFocusOptions(false)).toEqual({ animate: true, duration: 0.75 });
  });

  it("builds a Leaflet-like custom travel animation for selected vehicles while route history is loading", () => {
    const animation = getVehicleFocusTravelAnimation({
      isRouteLoading: true,
      previousCenter: L.latLng(51, 5),
      previousZoom: 13,
      finalCenter: L.latLng(51.2, 5.3),
      finalZoom: 14,
      containerSize: { x: 1000, y: 800 },
      project: (latLng, zoom) => ({
        x: latLng.lng * 100 * zoom,
        y: latLng.lat * 100 * zoom,
      }),
    });

    expect(animation).toEqual({
      className: "custom-map-focus-travel",
      resetDelayMs: 620,
      translateX: 320,
      translateY: 192,
      scale: 0.94,
    });
    expect(getVehicleFocusTravelAnimation({ isRouteLoading: false })).toBeNull();
  });

  it("builds the same custom travel animation for stable route fits", () => {
    const animation = getMapFocusTravelAnimation({
      isEnabled: true,
      previousCenter: L.latLng(51, 5),
      previousZoom: 13,
      finalCenter: L.latLng(51.2, 5.3),
      finalZoom: 14,
      containerSize: { x: 1000, y: 800 },
      project: (latLng, zoom) => ({
        x: latLng.lng * 100 * zoom,
        y: latLng.lat * 100 * zoom,
      }),
    });

    expect(animation).toMatchObject({
      className: "custom-map-focus-travel",
      translateX: 320,
      translateY: 192,
      scale: 0.94,
    });
  });

  it("keeps road-aligned segments rendered during programmatic map focus animation", () => {
    expect(shouldRenderRouteSegmentLayer(true, false)).toBe(true);
    expect(shouldRenderRouteSegmentLayer(true, true)).toBe(true);
    expect(shouldRenderRouteSegmentLayer(false, true)).toBe(false);
  });

  it("starts anchored focus pans from an offset at the final zoom", () => {
    const projectedPoints: Array<{ x: number; y: number; zoom: number }> = [];
    const fakeMap = {
      project: (_latLng: [number, number], zoom: number) => {
        projectedPoints.push({ x: 100, y: 200, zoom });
        return { add: ([x, y]: [number, number]) => ({ x: 100 + x, y: 200 + y }) };
      },
      unproject: (point: { x: number; y: number }, zoom: number) => ({ lat: point.y, lng: point.x, zoom }),
    };

    const start = getAnchoredFocusPanStart(fakeMap, L.latLng(51.4416, 5.4697), 14, [0, -84]);

    expect(projectedPoints).toEqual([{ x: 100, y: 200, zoom: 14 }]);
    expect(start).toMatchObject({ lat: 116, lng: 100, zoom: 14 });
  });

  it("keeps route fit targets distinct when bottom overlay padding changes", () => {
    const routeLine: [number, number][] = [
      [51.4416, 5.4697],
      [51.4492, 5.4814],
    ];

    expect(getRouteFitKey(routeLine, 260, "veh-atlas-12")).not.toBe(getRouteFitKey(routeLine, 320, "veh-atlas-12"));
  });

  it("uses a heading-aware droplet marker that preserves the vehicle icon and has no outline", () => {
    const vehicle = createVehicle({ heading: 92, speedKph: 36 });
    const html = createVehicleMarkerHtml(vehicle, "dark", false);

    expect(getReliableVehicleHeading(vehicle)).toBe(92);
    expect(html).toContain("vehicle-marker-droplet");
    expect(html).toContain("vehicle-marker-droplet-shape");
    expect(html).toContain("width: 40px");
    expect(html).toContain("rotate(2deg)");
    expect(html).toContain("<rect x=\"2\" y=\"7\" width=\"14\" height=\"10\" rx=\"2\"");
    expect(html).toContain("top: 50%");
    expect(html).toContain("transform: translate(-50%, -50%)");
    expect(html).not.toContain("stroke-width=\"3\"");
  });

  it("uses configured map colors for markers and tooltips", () => {
    const mapColors = {
      ...DEFAULT_APP_PREFERENCES.mapColors,
      vehicleMoving: "#123456",
      vehicleIdling: "#654321",
    };
    const movingHtml = createVehicleMarkerHtml(createVehicle({ speedKph: 36 }), "dark", false, mapColors);
    const idleTooltip = createVehicleTooltipHtml(createVehicle({ status: "idling", speedKph: 0 }), "light", mapColors);

    expect(movingHtml).toContain("fill=\"#123456\"");
    expect(idleTooltip).toContain("color:#654321");
  });

  it("uses a parking-specific marker icon for parked vehicles", () => {
    const parkedHtml = createVehicleMarkerHtml(
      createVehicle({ status: "parked", speedKph: 0, ignitionOn: false, heading: Number.NaN }),
      "dark",
      false,
    );
    const offlineHtml = createVehicleMarkerHtml(
      createVehicle({ status: "offline", speedKph: 0, ignitionOn: false, heading: Number.NaN }),
      "dark",
      false,
    );

    expect(parkedHtml).toContain("<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"");
    expect(parkedHtml).toContain("M9 17V7h4a3 3 0 0 1 0 6H9");
    expect(offlineHtml).not.toContain("M9 17V7h4a3 3 0 0 1 0 6H9");
  });

  it("uses a stop-specific marker icon for playback stop states", () => {
    const stoppedHtml = createVehicleMarkerHtml(
      createVehicle({ mapMarkerStatusOverride: "stopped", speedKph: 0, heading: Number.NaN }),
      "dark",
      false,
    );

    expect(stoppedHtml).toContain("M9 11h6v2H9v-2");
  });

  it("keeps droplet geometry and icon placement stable while only the droplet rotates", () => {
    const northHtml = createVehicleMarkerHtml(createVehicle({ heading: 0, speedKph: 36 }), "dark", false);
    const eastHtml = createVehicleMarkerHtml(createVehicle({ heading: 90, speedKph: 36 }), "dark", false);
    const shapePath = /<path d="([^"]+)"/;
    const shellStyle = /<div class="vehicle-marker-droplet-shell" style="([^"]+)"/;
    const iconStyle = /<div class="vehicle-marker-droplet-icon" style="([^"]+)"/;
    const svgStyle = /<svg class="vehicle-marker-droplet-shape"[^>]*style="([^"]+)"/;

    expect(northHtml.match(shapePath)?.[1]).toBe(eastHtml.match(shapePath)?.[1]);
    expect(northHtml.match(iconStyle)?.[0]).toBe(eastHtml.match(iconStyle)?.[0]);
    expect(northHtml.match(shellStyle)?.[1]).toContain("rotate(-90deg)");
    expect(eastHtml.match(shellStyle)?.[1]).toContain("rotate(0deg)");
    expect(northHtml.match(svgStyle)?.[1]).not.toContain("rotate(");
    expect(eastHtml.match(svgStyle)?.[1]).not.toContain("rotate(");
  });

  it("falls back to the circular marker when heading data is not reliable", () => {
    const vehicle = createVehicle({
      status: "offline",
      speedKph: 0,
      heading: Number.NaN,
      teltonika: undefined,
    });

    expect(getReliableVehicleHeading(vehicle)).toBeNull();
    expect(createVehicleMarkerHtml(vehicle, "dark", false)).not.toContain("vehicle-marker-pin");
    expect(createVehicleMarkerHtml(vehicle, "dark", false)).toContain("border-radius: 999px");
  });

  it("keeps route playback heading reliable when the live vehicle has stale offline GNSS quality", () => {
    const baseTeltonika = createVehicle().teltonika!;
    const liveOfflineVehicle = createVehicle({
      status: "offline",
      speedKph: 0,
      ignitionOn: false,
      heading: 0,
      teltonika: {
        ...baseTeltonika,
        attributes: {
          ...baseTeltonika.attributes,
          speed: {
            avlId: "24",
            attributeName: "speed",
            displayName: "Speed",
            value: 0,
            unit: "km/h",
            parameterGroup: "Permanent I/O elements",
            timestampIso: "2026-05-06T09:12:00.000Z",
          },
          direction: {
            ...baseTeltonika.attributes.direction,
            value: 0,
          },
          ignition: {
            avlId: "239",
            attributeName: "ignition",
            displayName: "Ignition",
            value: false,
            parameterGroup: "Permanent I/O elements",
            timestampIso: "2026-05-06T09:12:00.000Z",
          },
          movement: {
            avlId: "240",
            attributeName: "movement",
            displayName: "Movement",
            value: false,
            parameterGroup: "Permanent I/O elements",
            timestampIso: "2026-05-06T09:12:00.000Z",
          },
          satellites: {
            ...baseTeltonika.attributes.satellites,
            value: 0,
          },
          gnssStatus: {
            ...baseTeltonika.attributes.gnssStatus,
            value: 0,
          },
          gnssHdop: {
            ...baseTeltonika.attributes.gnssHdop,
            value: 99,
          },
        },
      },
    });
    const playbackVehicle = buildRoutePlaybackVehicleViewModel({
      vehicle: liveOfflineVehicle,
      playbackPosition: [51.45, 5.48],
      speedKph: 36,
      headingDegrees: 184,
      timestampIso: "2026-05-06T08:06:00.000Z",
      activeAlertCount: 0,
      hasRouteTelemetry: true,
      routeIgnitionOn: true,
      routeMovement: true,
    });

    expect(getReliableVehicleHeading(playbackVehicle)).toBe(184);
    expect(createVehicleMarkerHtml(playbackVehicle, "dark", false)).toContain("rotate(94deg)");
  });

  it("focuses selected vehicles only when selection changes", () => {
    const atlas = createVehicle({ id: "veh-atlas-12", latitude: 51.4416, longitude: 5.4697 });
    const boreal = createVehicle({ id: "veh-boreal-07", latitude: 51.45, longitude: 5.48 });

    expect(getSelectedVehicleFocusTarget([atlas, boreal], "veh-atlas-12", null)).toEqual({
      latitude: 51.4416,
      longitude: 5.4697,
    });
    expect(getSelectedVehicleFocusTarget([atlas, boreal], "veh-atlas-12", "veh-atlas-12")).toBeNull();
    expect(getSelectedVehicleFocusTarget([atlas, boreal], "veh-boreal-07", "veh-atlas-12")).toEqual({
      latitude: 51.45,
      longitude: 5.48,
    });
  });

  it("prioritizes explicit selected vehicle focus over the initial map fit", () => {
    const atlas = createVehicle({ id: "veh-atlas-12", latitude: 51.4416, longitude: 5.4697 });

    expect(
      getMapFocusDecision({
        vehicles: [atlas],
        selectedVehicleId: "veh-atlas-12",
        previousSelectedVehicleId: null,
        hasFittedInitialBounds: false,
      }),
    ).toEqual({
      type: "selectedVehicle",
      latitude: 51.4416,
      longitude: 5.4697,
    });
  });

  it("prioritizes a changed route fit target over selected vehicle focus", () => {
    const atlas = createVehicle({ id: "veh-atlas-12", latitude: 51.4416, longitude: 5.4697 });

    expect(
      getMapFocusDecision({
        vehicles: [atlas],
        selectedVehicleId: "veh-atlas-12",
        previousSelectedVehicleId: null,
        hasFittedInitialBounds: true,
        defaultFitScope: "route",
        routeFitKey: "veh-atlas-12:2:51.441600:5.469700:51.449200:5.481400:260",
        lastFittedRouteFitKey: "",
      } as Parameters<typeof getMapFocusDecision>[0] & {
        defaultFitScope: "route";
        routeFitKey: string;
        lastFittedRouteFitKey: string;
      }),
    ).toEqual({ type: "initialFit" });
  });
});
