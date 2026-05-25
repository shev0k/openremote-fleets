import { Truck } from "lucide-react";
import type { Vehicle } from "../../../../domain/models/vehicle";
import { PanelCard } from "../../../components/shared/cards/PanelCard";
import { SegmentedControl } from "../../../components/shared/controls/SegmentedControl";
import { classNames } from "../../../components/shared/utils/classNames";
import type { VehicleReportGroup } from "../reportCapabilities";
import type { ReportBuilderDraft } from "../reportBuilderViewModel";
import { toggleValue } from "../reportPageModel";

interface ReportVehicleScopePanelProps {
  draft: ReportBuilderDraft;
  selectedVehicleCount: number;
  vehicleGroups: VehicleReportGroup[];
  vehicles: Vehicle[];
  onDraftChange: (draft: ReportBuilderDraft) => void;
}

const statusOptions = ["moving", "idling", "parked", "stationary", "alerting", "offline"];

export function ReportVehicleScopePanel({
  draft,
  selectedVehicleCount,
  vehicleGroups,
  vehicles,
  onDraftChange,
}: ReportVehicleScopePanelProps) {
  return (
    <PanelCard className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-brand" />
          <h3 className="text-[15px] font-semibold">Vehicle Scope</h3>
        </div>
        <span className="text-[12px] text-content-muted">{selectedVehicleCount} vehicles selected</span>
      </div>
      <SegmentedControl
        options={[
          { id: "all", label: "All" },
          { id: "selected", label: "Vehicles" },
          { id: "groups", label: "Groups" },
          { id: "status", label: "Status" },
        ]}
        value={draft.vehicleSelectionMode}
        onChange={(vehicleSelectionMode) =>
          onDraftChange({ ...draft, vehicleSelectionMode: vehicleSelectionMode as ReportBuilderDraft["vehicleSelectionMode"] })
        }
      />
      {draft.vehicleSelectionMode === "selected" ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((vehicle) => {
            const isSelected = draft.selectedVehicleIds.includes(vehicle.id);
            return (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => onDraftChange({ ...draft, selectedVehicleIds: toggleValue(draft.selectedVehicleIds, vehicle.id) })}
                className={classNames(
                  "rounded-[12px] border px-3 py-2 text-left text-[12px]",
                  isSelected ? "border-brand/35 bg-brand/10" : "border-border-subtle bg-panel-muted",
                )}
              >
                <span className="block font-semibold text-content-primary">{vehicle.name}</span>
                <span className="text-content-muted">{vehicle.plate} • {vehicle.trackerId}</span>
              </button>
            );
          })}
        </div>
      ) : draft.vehicleSelectionMode === "groups" ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {vehicleGroups.map((group) => {
            const isSelected = draft.selectedGroupIds.includes(group.id);
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => onDraftChange({ ...draft, selectedGroupIds: toggleValue(draft.selectedGroupIds, group.id) })}
                className={classNames(
                  "rounded-[12px] border px-3 py-2 text-left text-[12px]",
                  isSelected ? "border-brand/35 bg-brand/10" : "border-border-subtle bg-panel-muted",
                )}
              >
                <span className="block font-semibold text-content-primary">{group.name}</span>
                <span className="text-content-muted">{group.vehicleIds.length} vehicles</span>
              </button>
            );
          })}
        </div>
      ) : draft.vehicleSelectionMode === "status" ? (
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((status) => {
            const isSelected = draft.selectedStatusIds.includes(status);
            return (
              <button
                key={status}
                type="button"
                onClick={() => onDraftChange({ ...draft, selectedStatusIds: toggleValue(draft.selectedStatusIds, status) })}
                className={classNames(
                  "rounded-full border px-3 py-1.5 text-[12px] capitalize",
                  isSelected ? "border-brand/35 bg-brand/10 text-brand" : "border-border-subtle bg-panel-muted text-content-muted",
                )}
              >
                {status}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[14px] border border-border-subtle bg-panel-muted p-3 text-[12px] text-content-muted">
          All available fleet vehicles are included. Compatibility rules may still exclude vehicles that do not expose required attributes.
        </div>
      )}
    </PanelCard>
  );
}
