import { Battery, Fuel, Gauge, MapPinned, Radio, Route, Satellite, Zap } from "lucide-react";
import { Vehicle, VehicleDetail } from "../../../../domain/models/vehicle";
import { CompactMetricTile } from "./CompactMetricTile";
import { buildLiveTelemetryCardModel, LiveTelemetryMetric } from "../telemetryCardViewModel";

interface LiveTelemetryCardProps {
  vehicle: Vehicle;
  detail: VehicleDetail | null;
}

const METRIC_ICONS: Record<string, typeof Gauge> = {
  speed: Gauge,
  ignition: Zap,
  movement: Route,
  fuelLevel: Fuel,
  batteryLevel: Battery,
  engineRpm: Gauge,
  externalVoltage: Zap,
  gsmSignal: Radio,
  gnssHdop: Satellite,
  todayMileage: Route,
  odometer: MapPinned,
};

const TONE_CLASS_NAMES: Record<LiveTelemetryMetric["tone"], string> = {
  neutral: "text-content-primary",
  good: "text-brand",
  warning: "text-warning",
  danger: "text-danger",
  muted: "text-content-muted",
};

function MetricCell({ metric }: { metric: LiveTelemetryMetric }) {
  const Icon = METRIC_ICONS[metric.id] ?? Gauge;

  return (
    <CompactMetricTile
      icon={<Icon className="h-3.5 w-3.5" />}
      label={metric.label}
      value={metric.value}
      valueClassName={TONE_CLASS_NAMES[metric.tone]}
    />
  );
}

export function LiveTelemetryCard({ vehicle, detail }: LiveTelemetryCardProps) {
  const model = buildLiveTelemetryCardModel(vehicle, detail);

  return (
    <section className="app-panel-muted p-2.5" data-testid="live-telemetry-card">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-content-muted">Live telemetry</h4>
          <p className="mt-0.5 truncate text-[11px] text-content-secondary">
            <span>IMEI {model.identity.trackerId}</span>
            {model.identity.driverIdentifier ? ` • Driver ID ${model.identity.driverIdentifier}` : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-[10px] font-semibold text-brand">
          Teltonika
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {model.primaryMetrics.map((metric) => (
          <CompactMetricTile
            key={metric.id}
            label={metric.label}
            value={metric.value}
            valueClassName={TONE_CLASS_NAMES[metric.tone]}
            valueSize="md"
            className="rounded-[16px] px-2.5 py-2"
            labelClassName="text-[9px] tracking-[0.12em]"
          />
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-4 gap-1.5" data-testid="live-telemetry-secondary-grid">
        {model.secondaryMetrics.map((metric) => (
          <MetricCell key={metric.id} metric={metric} />
        ))}
      </div>
    </section>
  );
}
