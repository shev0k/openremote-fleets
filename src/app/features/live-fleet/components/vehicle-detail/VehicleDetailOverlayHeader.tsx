import { ChevronDown, ChevronUp, Pin, X } from "lucide-react";
import type { VehicleDisplayStatusMeta } from "../../../../components/map/vehicleDisplayStatus";

interface VehicleDetailOverlayHeaderProps {
  title: string;
  subtitle: string;
  statusMeta: VehicleDisplayStatusMeta;
  isCollapsed: boolean;
  isPinned: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  onTogglePin: () => void;
}

export function VehicleDetailOverlayHeader({
  title,
  subtitle,
  statusMeta,
  isCollapsed,
  isPinned,
  onClose,
  onToggleCollapse,
  onTogglePin,
}: VehicleDetailOverlayHeaderProps) {
  const StatusIcon = statusMeta.icon;

  return (
    <div className="flex items-start justify-between gap-3 border-b border-border-subtle bg-surface-elevated px-3 py-2.5">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <h3 className="text-[15px] font-semibold text-content-primary">{title}</h3>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ${statusMeta.badgeClassName}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusMeta.label}
          </span>
        </div>
        <p className="text-[11px] text-content-muted">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        {!isPinned ? (
          <>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="app-control flex h-8 w-8 items-center justify-center rounded-full"
              title={isCollapsed ? "Expand overlay" : "Collapse overlay"}
              aria-label={isCollapsed ? "Expand overlay" : "Collapse overlay"}
            >
              {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onTogglePin}
              className="app-control flex h-8 w-8 items-center justify-center rounded-full"
              title="Pin overlay"
              aria-label="Pin overlay"
            >
              <Pin className="h-4 w-4" />
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="app-control flex h-8 w-8 items-center justify-center rounded-full"
          title="Close overlay"
          aria-label="Close overlay"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
