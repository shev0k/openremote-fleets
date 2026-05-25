import { describe, expect, it } from "vitest";
import { AssetDevice } from "../../../domain/models/assets";
import { filterAssets, buildAssetFilterOptions } from "./assetFilters";

const assets: AssetDevice[] = [
  {
    id: "asset-atlas-prime",
    assetName: "Atlas Prime",
    linkedVehicleId: "veh-atlas-12",
    linkedVehicleName: "Atlas 12",
    linkedVehiclePlate: "PX-557-D",
    trackerId: "352094085231600",
    deviceType: "Teltonika FMC003",
    lastSyncIso: "2026-05-06T09:30:00.000Z",
    signalStrengthPercent: 80,
    batteryPercent: 91,
    status: "Connected",
    metadata: { model: "FMC003" },
    teltonika: {
      imei: "352094085231600",
      model: "FMC003",
      protocol: "teltonika:tcp:avl",
      codec: "CODEC_8",
      timestampIso: "2026-05-06T09:30:00.000Z",
      attributes: {},
    },
  },
  {
    id: "asset-nimbus-shadow",
    assetName: "Nimbus Shadow",
    linkedVehicleId: "veh-nimbus-03",
    linkedVehicleName: "Nimbus 03",
    linkedVehiclePlate: "PX-889-N",
    trackerId: "352094085231603",
    deviceType: "Teltonika FMC003",
    lastSyncIso: "2026-05-04T08:00:00.000Z",
    signalStrengthPercent: 10,
    batteryPercent: 21,
    status: "Disconnected",
    metadata: { model: "FMC003" },
    teltonika: {
      imei: "352094085231603",
      model: "FMC003",
      protocol: "teltonika:tcp:avl",
      codec: "CODEC_8",
      timestampIso: "2026-05-04T08:00:00.000Z",
      attributes: {},
    },
  },
];

describe("assetFilters", () => {
  it("filters by status, vehicle, IMEI, model, GSM quality, battery, and last sync", () => {
    const result = filterAssets(
      assets,
      {
        searchQuery: "352094085231600",
        status: "Connected",
        vehicleId: "veh-atlas-12",
        model: "FMC003",
        gsmQuality: "good",
        battery: "healthy",
        lastSync: "last24Hours",
      },
      new Date("2026-05-06T10:00:00.000Z"),
    );

    expect(result.map((asset) => asset.id)).toEqual(["asset-atlas-prime"]);
  });

  it("builds vehicle and model options from available assets", () => {
    const options = buildAssetFilterOptions(assets);

    expect(options.vehicles).toEqual([
      { id: "all", label: "All vehicles" },
      { id: "veh-atlas-12", label: "Atlas 12" },
      { id: "veh-nimbus-03", label: "Nimbus 03" },
    ]);
    expect(options.models).toEqual([
      { id: "all", label: "All models" },
      { id: "FMC003", label: "FMC003" },
    ]);
  });
});
