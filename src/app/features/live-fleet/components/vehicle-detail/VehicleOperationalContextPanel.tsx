import { MapPinned } from "lucide-react";
import type { TrackerIdentityItem, VehicleOperationalContextItem } from "./VehicleDetailOverlayViewModel";

interface VehicleOperationalContextPanelProps {
  identityItems: TrackerIdentityItem[];
  items: VehicleOperationalContextItem[];
}

export function VehicleOperationalContextPanel({ identityItems, items }: VehicleOperationalContextPanelProps) {
  return (
    <section className="app-panel-muted p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-content-muted">Operational context</h4>
          <p className="mt-0.5 text-[11px] text-content-secondary">Fast telemetry checks and trip context.</p>
        </div>
        <MapPinned className="h-4 w-4 text-content-muted" />
      </div>

      {identityItems.length ? (
        <div className="mb-2 grid grid-cols-2 gap-1.5 text-[11px]">
          {identityItems.map((item) => (
            <div key={item.label} className="fleet-glass-chip flex min-w-0 items-center justify-between rounded-xl px-2.5 py-1.5">
              <span className="text-content-muted">{item.label}</span>
              <span className="min-w-0 truncate font-mono text-[10px] font-semibold text-content-primary">{item.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.id} className="fleet-glass-chip flex items-center justify-between rounded-xl px-2.5 py-1.5">
              <span className="flex items-center gap-2 text-content-muted">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              <span className="font-semibold text-content-primary">{item.value}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
