import { Gauge } from "lucide-react";
import type { TrackerAttributeViewModel } from "./VehicleDetailOverlayViewModel";

export function TrackerAttributesPanel({ attributes }: { attributes: TrackerAttributeViewModel[] }) {
  if (!attributes.length) {
    return null;
  }

  return (
    <section className="app-panel-muted p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-content-muted">Tracker attributes</h4>
          <p className="mt-0.5 text-[11px] text-content-secondary">
            Teltonika AVL values mapped through OpenRemote attribute names.
          </p>
        </div>
        <Gauge className="h-4 w-4 text-content-muted" />
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        {attributes.map((attribute) => (
          <div key={attribute.attributeName} className="rounded-xl border border-border-subtle bg-panel px-2.5 py-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate font-mono text-[10px] text-content-muted">{attribute.attributeName}</span>
              <span className="shrink-0 rounded bg-panel-muted px-1.5 py-0.5 font-mono text-[9px] text-content-muted">
                AVL {attribute.avlId}
              </span>
            </div>
            <p className="truncate text-[12px] font-semibold text-content-primary">{attribute.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
