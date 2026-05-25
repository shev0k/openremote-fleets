import { Battery, Database, Gauge, Hexagon, MapPin, RadioTower, Signal, X, Zap } from "lucide-react";
import { AssetDevice } from "../../../../domain/models/assets";
import { TeltonikaAttributeSample } from "../../../../domain/models/teltonika";
import { formatAssetAttributeValue, formatAssetPercent } from "../assetValueFormat";

interface AssetDetailsPanelProps {
  asset: AssetDevice;
  onClose: () => void;
  formatSyncTime: (syncIso: string) => string;
}

const TELEMETRY_ATTRIBUTE_ORDER = [
  "gnssHdop",
  "engineRpm",
  "externalVoltage",
  "batteryVoltage",
  "batteryLevel",
  "gsmSignal",
  "fuelLevel",
  "fuelRateGps",
  "totalOdometer",
  "tripOdometer",
  "satellites",
  "direction",
  "iButton",
];

function getAttribute(asset: AssetDevice, attributeName: string): TeltonikaAttributeSample | null {
  return asset.teltonika?.attributes[attributeName] ?? null;
}

function getTechnicalRows(asset: AssetDevice) {
  return [
    { label: "IMEI", value: asset.teltonika?.imei ?? asset.trackerId },
    { label: "Model", value: asset.teltonika?.model ?? asset.metadata.model ?? asset.deviceType },
    { label: "Protocol", value: asset.teltonika?.protocol ?? asset.metadata.protocol ?? "--" },
    { label: "Codec", value: asset.teltonika?.codec ?? asset.metadata.codec ?? "--" },
    { label: "Firmware", value: asset.firmwareVersion ?? "--" },
  ];
}

function getTelemetryAttributes(asset: AssetDevice): TeltonikaAttributeSample[] {
  const attributes = asset.teltonika?.attributes ?? {};
  const ordered = TELEMETRY_ATTRIBUTE_ORDER.map((attributeName) => attributes[attributeName]).filter(Boolean);
  const orderedNames = new Set(ordered.map((attribute) => attribute.attributeName));
  const remaining = Object.values(attributes)
    .filter((attribute) => !orderedNames.has(attribute.attributeName) && attribute.attributeName !== "gpsLocation")
    .sort((first, second) => first.displayName.localeCompare(second.displayName));

  return [...ordered, ...remaining];
}

export function AssetDetailsPanel({ asset, onClose, formatSyncTime }: AssetDetailsPanelProps) {
  const location = getAttribute(asset, "gpsLocation");
  const telemetryAttributes = getTelemetryAttributes(asset);
  const visibleMetadata = Object.entries(asset.metadata).filter(
    ([key]) => !["imei", "protocol", "codec", "model"].includes(key),
  );

  return (
    <div className="relative flex w-[430px] shrink-0 flex-col overflow-hidden rounded-[24px] border border-border-subtle bg-panel animate-in slide-in-from-right-8 duration-300">
      <div className="flex items-start justify-between border-b border-border-subtle bg-surface-elevated p-6">
        <div className="min-w-0">
          <div className="mb-1 flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[20px] font-semibold text-content-primary">{asset.assetName}</h2>
            <span
              className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                asset.status === "Connected"
                  ? "bg-brand/12 text-brand"
                  : asset.status === "Degraded"
                  ? "bg-warning/12 text-warning"
                  : "bg-offline/12 text-offline"
              }`}
            >
              {asset.status}
            </span>
          </div>
          <p className="font-mono text-[13px] text-content-muted">IMEI: {asset.trackerId}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="app-control flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5 custom-scrollbar">
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-content-muted">
            <Signal className="h-4 w-4" /> Live Telemetry
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[14px] border border-border-subtle bg-panel-muted p-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
                <RadioTower className="h-3.5 w-3.5" />
                GSM
              </div>
              <p className="mt-1.5 text-[16px] font-semibold text-content-primary">
                {formatAssetPercent(asset.signalStrengthPercent)}
              </p>
            </div>
            <div className="rounded-[14px] border border-border-subtle bg-panel-muted p-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
                <Battery className="h-3.5 w-3.5" />
                Battery
              </div>
              <p className="mt-1.5 text-[16px] font-semibold text-content-primary">
                {formatAssetPercent(asset.batteryPercent)}
              </p>
            </div>
            <div className="rounded-[14px] border border-border-subtle bg-panel-muted p-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
                <Zap className="h-3.5 w-3.5" />
                Last Sync
              </div>
              <p className="mt-1.5 text-[13px] font-semibold text-content-primary">{formatSyncTime(asset.lastSyncIso)}</p>
            </div>
            <div className="rounded-[14px] border border-border-subtle bg-panel-muted p-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
                <Gauge className="h-3.5 w-3.5" />
                Signals
              </div>
              <p className="mt-1.5 text-[16px] font-semibold text-content-primary">{asset.availableTelemetrySignals?.length ?? 0}</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-content-muted">
            <Database className="h-4 w-4" /> Tracker Attributes
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {telemetryAttributes.map((attribute) => (
              <div key={attribute.attributeName} className="min-w-0 rounded-[14px] border border-border-subtle bg-panel-muted p-3">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
                    {attribute.displayName}
                  </span>
                  <span className="shrink-0 rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[9px] text-content-muted">
                    AVL {attribute.avlId}
                  </span>
                </div>
                <p className="mt-1.5 truncate text-[14px] font-semibold text-content-primary">
                  {formatAssetAttributeValue(attribute)}
                </p>
              </div>
            ))}
            {!telemetryAttributes.length ? (
              <p className="col-span-2 rounded-[14px] border border-border-subtle bg-panel-muted p-3 text-[12px] text-content-muted">
                No tracker attributes are available for this asset yet.
              </p>
            ) : null}
          </div>
        </section>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-content-muted">
            <Hexagon className="h-4 w-4" /> OpenRemote Identity
          </h3>
          <div className="space-y-2 rounded-[16px] border border-border-subtle bg-panel-muted p-3">
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="text-content-muted">Asset ID</span>
              <span className="truncate font-mono text-content-secondary">{asset.openRemoteId ?? "Pending backend assignment"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="text-content-muted">Linked Vehicle</span>
              <span className="truncate font-semibold text-content-primary">{asset.linkedVehicleName || "--"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="text-content-muted">Plate</span>
              <span className="rounded bg-panel px-2 py-1 text-[12px] text-content-secondary">{asset.linkedVehiclePlate || "--"}</span>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-content-muted">
            <Database className="h-4 w-4" /> Technical Specs
          </h3>
          <div className="divide-y divide-border-subtle rounded-[16px] border border-border-subtle bg-panel-muted">
            {getTechnicalRows(asset).map((row) => (
              <div key={row.label} className="flex justify-between gap-3 p-3 text-[13px]">
                <span className="text-content-muted">{row.label}</span>
                <span className="truncate font-medium text-content-secondary">{row.value}</span>
              </div>
            ))}
            {location ? (
              <div className="flex justify-between gap-3 p-3 text-[13px]">
                <span className="flex items-center gap-1.5 text-content-muted">
                  <MapPin className="h-3.5 w-3.5" /> Location
                </span>
                <span className="truncate font-mono text-content-secondary">{formatAssetAttributeValue(location)}</span>
              </div>
            ) : null}
          </div>
        </section>

        {visibleMetadata.length ? (
          <section>
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-content-muted">Metadata</h3>
            <div className="flex flex-wrap gap-2">
              {visibleMetadata.map(([key, value]) => (
                <span key={key} className="rounded border border-border-subtle bg-panel-muted px-2 py-1 font-mono text-[11px] text-content-muted">
                  {key}:{value}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
