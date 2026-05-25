/* ======== IMPORTS ======== */

import { AlertTriangle, Route, Settings2 } from "lucide-react";
import { PanelCard } from "../../../../components/shared/cards/PanelCard";
import type { LiveFleetQuickPanelId, LiveFleetQuickPanelState } from "../../providers/liveFleetWorkspace.types";
import { SidebarQuickActionCard } from "./SidebarQuickActionCard";
import type { LiveFleetSidebarModel } from "./useLiveFleetSidebarModel";

/* ======== TYPES ======== */

interface QuickPanelsTabProps {
  model: LiveFleetSidebarModel;
  quickPanels: LiveFleetQuickPanelState;
  onToggleQuickPanel: (panelId: LiveFleetQuickPanelId) => void;
}

/* ======== COMPONENT ======== */

export function QuickPanelsTab({ model, quickPanels, onToggleQuickPanel }: QuickPanelsTabProps) {
  return (
    <>
      <SidebarQuickActionCard
        title="Alerts stream"
        description="Show or hide the floating alerts overlay."
        icon={<AlertTriangle className={`h-4 w-4 ${quickPanels.alerts ? "text-brand" : "text-content-muted"}`} />}
        isActive={quickPanels.alerts}
        onClick={() => onToggleQuickPanel("alerts")}
      />

      <SidebarQuickActionCard
        title="Fleet management"
        description="Operational context, pinned overlays, and current focus."
        icon={<Settings2 className={`h-4 w-4 ${quickPanels.fleetManagement ? "text-brand" : "text-content-muted"}`} />}
        isActive={quickPanels.fleetManagement}
        onClick={() => onToggleQuickPanel("fleetManagement")}
      />

      {model.selectedVehicle ? (
        <PanelCard className="pointer-events-auto p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold text-content-primary">Current focus</h3>
              <p className="mt-1 text-[12px] text-content-muted">Selection drives map, route, and timeline state.</p>
            </div>
            <Route className="h-4 w-4 text-content-muted" />
          </div>
          <div className="mt-3 rounded-[18px] border border-border-subtle bg-panel-muted p-3">
            <p className="text-[13px] font-semibold text-content-primary">{model.selectedVehicle.name}</p>
            <p className="mt-1 text-[11px] text-content-muted">
              {model.selectedVehicle.plate} • {model.selectedVehicleStatus?.label ?? "--"}
            </p>
          </div>
        </PanelCard>
      ) : null}
    </>
  );
}
