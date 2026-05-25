import type { VehicleDetailMetric } from "./VehicleDetailOverlayViewModel";
import { CompactMetricTile } from "../CompactMetricTile";

export function VehicleDetailMetricGrid({ metrics }: { metrics: VehicleDetailMetric[] }) {
  return (
    <section className="grid grid-cols-2 gap-1.5 xl:grid-cols-3">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <CompactMetricTile
            key={metric.id}
            icon={<Icon className="h-3.5 w-3.5" />}
            label={metric.label}
            value={metric.value}
            className="app-panel-muted min-h-[56px] rounded-[18px] px-2.5 py-2"
            labelClassName="overflow-hidden tracking-[0.03em]"
            valueClassName="mt-1 font-sans text-[12px] leading-[1.2] text-content-primary"
          />
        );
      })}
    </section>
  );
}
