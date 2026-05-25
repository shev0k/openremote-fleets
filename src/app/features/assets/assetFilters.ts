import { AssetConnectivityStatus, AssetDevice } from "../../../domain/models/assets";

export type AssetStatusFilter = AssetConnectivityStatus | "all";
export type AssetGsmQualityFilter = "all" | "good" | "weak" | "offline";
export type AssetBatteryFilter = "all" | "healthy" | "watch" | "low";
export type AssetLastSyncFilter = "all" | "last24Hours" | "last7Days" | "stale";

export interface AssetFilters {
  searchQuery: string;
  status: AssetStatusFilter;
  vehicleId: string;
  model: string;
  gsmQuality: AssetGsmQualityFilter;
  battery: AssetBatteryFilter;
  lastSync: AssetLastSyncFilter;
}

export interface AssetFilterOption {
  id: string;
  label: string;
}

export interface AssetFilterOptions {
  vehicles: AssetFilterOption[];
  models: AssetFilterOption[];
}

export const DEFAULT_ASSET_FILTERS: AssetFilters = {
  searchQuery: "",
  status: "all",
  vehicleId: "all",
  model: "all",
  gsmQuality: "all",
  battery: "all",
  lastSync: "all",
};

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function getAssetModel(asset: AssetDevice): string {
  return asset.teltonika?.model ?? asset.metadata.model ?? asset.deviceType;
}

function matchesSearch(asset: AssetDevice, searchQuery: string): boolean {
  const query = normalize(searchQuery);
  if (!query) {
    return true;
  }

  return [
    asset.assetName,
    asset.linkedVehicleName,
    asset.linkedVehiclePlate,
    asset.trackerId,
    asset.teltonika?.imei,
    asset.deviceType,
    asset.status,
    asset.openRemoteId,
    asset.firmwareVersion,
    getAssetModel(asset),
  ].some((value) => normalize(value).includes(query));
}

function matchesGsm(asset: AssetDevice, gsmQuality: AssetGsmQualityFilter): boolean {
  if (gsmQuality === "all") {
    return true;
  }

  if (gsmQuality === "good") {
    return asset.signalStrengthPercent >= 70;
  }

  if (gsmQuality === "weak") {
    return asset.signalStrengthPercent > 0 && asset.signalStrengthPercent < 70;
  }

  return asset.signalStrengthPercent <= 0;
}

function matchesBattery(asset: AssetDevice, battery: AssetBatteryFilter): boolean {
  if (battery === "all") {
    return true;
  }

  const batteryPercent = asset.batteryPercent ?? 0;
  if (battery === "healthy") {
    return batteryPercent >= 60;
  }

  if (battery === "watch") {
    return batteryPercent >= 30 && batteryPercent < 60;
  }

  return batteryPercent < 30;
}

function matchesLastSync(asset: AssetDevice, lastSync: AssetLastSyncFilter, now: Date): boolean {
  if (lastSync === "all") {
    return true;
  }

  const syncTime = new Date(asset.lastSyncIso).getTime();
  if (Number.isNaN(syncTime)) {
    return lastSync === "stale";
  }

  const ageMs = now.getTime() - syncTime;
  const dayMs = 24 * 60 * 60 * 1000;

  if (lastSync === "last24Hours") {
    return ageMs >= 0 && ageMs <= dayMs;
  }

  if (lastSync === "last7Days") {
    return ageMs >= 0 && ageMs <= 7 * dayMs;
  }

  return ageMs < 0 || ageMs > 7 * dayMs;
}

export function filterAssets(assets: AssetDevice[], filters: AssetFilters, now: Date = new Date()): AssetDevice[] {
  return assets.filter((asset) => {
    if (filters.status !== "all" && asset.status !== filters.status) {
      return false;
    }

    if (filters.vehicleId !== "all" && asset.linkedVehicleId !== filters.vehicleId) {
      return false;
    }

    if (filters.model !== "all" && getAssetModel(asset) !== filters.model) {
      return false;
    }

    return (
      matchesSearch(asset, filters.searchQuery) &&
      matchesGsm(asset, filters.gsmQuality) &&
      matchesBattery(asset, filters.battery) &&
      matchesLastSync(asset, filters.lastSync, now)
    );
  });
}

export function buildAssetFilterOptions(assets: AssetDevice[]): AssetFilterOptions {
  const vehicles = new Map<string, string>();
  const models = new Set<string>();

  for (const asset of assets) {
    if (asset.linkedVehicleId && asset.linkedVehicleName) {
      vehicles.set(asset.linkedVehicleId, asset.linkedVehicleName);
    }
    models.add(getAssetModel(asset));
  }

  return {
    vehicles: [
      { id: "all", label: "All vehicles" },
      ...Array.from(vehicles.entries())
        .sort((first, second) => first[1].localeCompare(second[1]))
        .map(([id, label]) => ({ id, label })),
    ],
    models: [
      { id: "all", label: "All models" },
      ...Array.from(models)
        .sort((first, second) => first.localeCompare(second))
        .map((model) => ({ id: model, label: model })),
    ],
  };
}
