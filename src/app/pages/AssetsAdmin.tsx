import { useEffect, useMemo, useState } from "react";
import { Activity, Battery, Cpu, RadioTower, Server, Wifi } from "lucide-react";
import { AssetConnectivityStatus, AssetDevice } from "../../domain/models/assets";
import { PanelCard } from "../components/shared/cards/PanelCard";
import { PageHeaderPanel } from "../components/shared/layout/PageHeaderPanel";
import { AssetFilterBar } from "../features/assets/AssetFilterBar";
import {
  buildAssetFilterOptions,
  DEFAULT_ASSET_FILTERS,
  filterAssets,
} from "../features/assets/assetFilters";
import { formatAssetPercent } from "../features/assets/assetValueFormat";
import { AssetDetailsPanel } from "../features/assets/components/AssetDetailsPanel";
import { useAssetsQuery } from "../features/assets/useAssetsQuery";

function formatSyncTime(syncIso: string) {
  if (!syncIso) return "--";
  const date = new Date(syncIso);
  if (Number.isNaN(date.valueOf())) return "--";
  return date.toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function getStatusClassName(status: AssetConnectivityStatus): string {
  if (status === "Connected") {
    return "bg-brand/12 text-brand";
  }
  if (status === "Degraded") {
    return "bg-warning/12 text-warning";
  }
  return "bg-offline/12 text-offline";
}

function getSignalClassName(percent: number): string {
  if (percent < 30) {
    return "text-danger";
  }
  if (percent < 70) {
    return "text-warning";
  }
  return "text-brand";
}

function getSignalBarClassName(percent: number): string {
  if (percent < 30) {
    return "bg-danger";
  }
  if (percent < 70) {
    return "bg-warning";
  }
  return "bg-brand";
}

function getAssetModel(asset: AssetDevice): string {
  return asset.teltonika?.model ?? asset.metadata.model ?? asset.deviceType;
}

export function AssetsAdmin() {
  const [filters, setFilters] = useState(DEFAULT_ASSET_FILTERS);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const { data: assets, error: assetsError, isLoading: isLoadingAssets } = useAssetsQuery();

  useEffect(() => {
    setSelectedAssetId((currentId) =>
      currentId && assets.some((asset) => asset.id === currentId) ? currentId : assets[0]?.id ?? null,
    );
  }, [assets]);

  const filterOptions = useMemo(() => buildAssetFilterOptions(assets), [assets]);
  const filteredAssets = useMemo(() => filterAssets(assets, filters), [assets, filters]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? null,
    [assets, selectedAssetId],
  );

  const connectedCount = useMemo(
    () => assets.filter((asset) => asset.status === "Connected").length,
    [assets],
  );
  const degradedCount = useMemo(
    () => assets.filter((asset) => asset.status === "Degraded").length,
    [assets],
  );
  const disconnectedCount = useMemo(
    () => assets.filter((asset) => asset.status === "Disconnected").length,
    [assets],
  );

  return (
    <div className="flex h-full gap-6 overflow-hidden font-sans tracking-tight text-content-primary">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <PageHeaderPanel
          title="Assets & Telemetry"
          description="Inspect tracker health, linked vehicles, and Teltonika telemetry attributes."
          icon={<Server className="h-6 w-6 text-brand" />}
        />

        <PanelCard className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <AssetFilterBar filters={filters} options={filterOptions} onFiltersChange={setFilters} />

          <div className="flex flex-wrap items-center gap-2 border-y border-border-subtle bg-panel-muted/40 px-6 py-3 text-[12px] font-medium text-content-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand" />
              {connectedCount} connected
            </span>
            <span className="text-border-strong">/</span>
            <span className="inline-flex items-center gap-1.5 text-warning">
              <span className="h-2 w-2 rounded-full bg-warning" />
              {degradedCount} degraded
            </span>
            <span className="text-border-strong">/</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-offline" />
              {disconnectedCount} offline
            </span>
            <span className="ml-auto">{filteredAssets.length} of {assets.length} assets shown</span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-6 custom-scrollbar">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-panel">
                <tr>
                  <th className="pb-4 pl-2 text-[13px] font-medium text-content-muted">Asset</th>
                  <th className="pb-4 text-[13px] font-medium text-content-muted">Vehicle</th>
                  <th className="pb-4 text-[13px] font-medium text-content-muted">IMEI</th>
                  <th className="pb-4 text-[13px] font-medium text-content-muted">Model</th>
                  <th className="pb-4 text-[13px] font-medium text-content-muted">GSM</th>
                  <th className="pb-4 text-[13px] font-medium text-content-muted">Battery</th>
                  <th className="pb-4 text-[13px] font-medium text-content-muted">Last Sync</th>
                  <th className="pb-4 pr-2 text-right text-[13px] font-medium text-content-muted">Status</th>
                </tr>
              </thead>
              <tbody className="text-[14px] font-medium text-content-secondary">
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`app-table-row group cursor-pointer ${selectedAssetId === asset.id ? "bg-surface-elevated" : ""}`}
                  >
                    <td className="py-4 pl-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle transition-colors ${
                            selectedAssetId === asset.id
                              ? "bg-brand/20 text-brand"
                              : "bg-panel-muted text-content-muted group-hover:text-content-primary"
                          }`}
                        >
                          <Cpu className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className={`block truncate font-semibold ${selectedAssetId === asset.id ? "text-brand" : "text-content-primary"}`}>
                            {asset.assetName}
                          </span>
                          <span className="font-mono text-[11px] text-content-muted">{asset.openRemoteId ?? "No OpenRemote ID"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-content-secondary">{asset.linkedVehicleName || "--"}</span>
                        <span className="text-[12px] text-content-muted">{asset.linkedVehiclePlate || "--"}</span>
                      </div>
                    </td>
                    <td className="py-4 font-mono text-[13px] text-content-muted">{asset.teltonika?.imei ?? asset.trackerId}</td>
                    <td className="py-4 text-content-secondary">{getAssetModel(asset)}</td>
                    <td className="py-4">
                      <div className="flex w-24 flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono">
                          <RadioTower className="h-3.5 w-3.5 text-content-muted" />
                          <span className={getSignalClassName(asset.signalStrengthPercent)}>
                            {formatAssetPercent(asset.signalStrengthPercent)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full border border-border-subtle bg-panel-muted">
                          <div
                            className={`h-full rounded-full transition-all ${getSignalBarClassName(asset.signalStrengthPercent)}`}
                            style={{ width: `${asset.signalStrengthPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-1.5 text-[13px] text-content-secondary">
                        <Battery className="h-3.5 w-3.5 text-content-muted" />
                        {formatAssetPercent(asset.batteryPercent)}
                      </div>
                    </td>
                    <td className="py-4 text-content-muted">
                      <div className="flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-content-muted" />
                        {formatSyncTime(asset.lastSyncIso)}
                      </div>
                    </td>
                    <td className="py-4 pr-2 text-right">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${getStatusClassName(asset.status)}`}>
                        <Wifi className="mr-1.5 h-3.5 w-3.5" />
                        {asset.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!filteredAssets.length && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[14px] text-content-muted">
                      {assetsError
                        ? "Could not load assets."
                        : isLoadingAssets
                          ? "Loading assets..."
                          : "No assets match the selected filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </PanelCard>
      </div>

      {selectedAsset && (
        <AssetDetailsPanel
          asset={selectedAsset}
          onClose={() => setSelectedAssetId(null)}
          formatSyncTime={formatSyncTime}
        />
      )}
    </div>
  );
}
