/* ======== IMPORTS ======== */

import { AlertTriangle, LocateFixed, MapPinned, PauseCircle, Pin, Radio, SquareParking, WifiOff } from "lucide-react";
import { Vehicle } from "../../../../../domain/models/vehicle";
import { getVehicleDisplayStatusMeta } from "../../../../components/map/vehicleDisplayStatus";

/* ======== TYPES ======== */

interface FleetManagementQuickPanelContentProps {
  vehicles: Vehicle[];
  pinnedVehicleIds: string[];
  focusedVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
  onPinVehicle: (vehicleId: string) => void;
  onUnpinVehicle: (vehicleId: string) => void;
}

/* ======== HELPERS ======== */

function getLastUpdatedLabel(lastUpdatedIso: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(lastUpdatedIso));
}

function getVehicleAlertLabel(vehicle: Vehicle) {
  if (!vehicle.activeAlertCount) {
    return "No alerts";
  }

  return `${vehicle.activeAlertCount} ${vehicle.activeAlertCount === 1 ? "alert" : "alerts"}`;
}

/* ======== COMPONENT ======== */

export function FleetManagementQuickPanelContent({
  vehicles,
  pinnedVehicleIds,
  focusedVehicleId,
  onSelectVehicle,
  onPinVehicle,
  onUnpinVehicle,
}: FleetManagementQuickPanelContentProps) {
  const statusCounts = vehicles.reduce(
    (counts, vehicle) => {
      const status = getVehicleDisplayStatusMeta(vehicle).id;
      return {
        ...counts,
        [status]: counts[status] + 1,
      };
    },
    { alerting: 0, idling: 0, moving: 0, offline: 0, parked: 0, stationary: 0 },
  );

  const attentionVehicles = vehicles
    .filter((vehicle) => {
      const status = getVehicleDisplayStatusMeta(vehicle).id;
      return status === "alerting" || status === "offline";
    })
    .sort((first, second) => {
      const firstStatus = getVehicleDisplayStatusMeta(first);
      const secondStatus = getVehicleDisplayStatusMeta(second);

      return secondStatus.priority - firstStatus.priority || second.activeAlertCount - first.activeAlertCount;
    })
    .slice(0, 5);

  const pinnedVehicles = pinnedVehicleIds
    .map((vehicleId) => vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null)
    .filter((vehicle): vehicle is Vehicle => Boolean(vehicle));

  const focusedVehicle = focusedVehicleId ? vehicles.find((vehicle) => vehicle.id === focusedVehicleId) ?? null : null;

  const summaryItems = [
    { id: "tracked", label: "Tracked", value: vehicles.length, icon: Radio },
    { id: "moving", label: "Moving", value: statusCounts.moving, icon: LocateFixed },
    { id: "idling", label: "Idling", value: statusCounts.idling, icon: PauseCircle },
    { id: "parked", label: "Parked", value: statusCounts.parked, icon: SquareParking },
    { id: "alerting", label: "Alerting", value: statusCounts.alerting, icon: AlertTriangle },
    { id: "offline", label: "Offline", value: statusCounts.offline, icon: WifiOff },
  ];

  return (
    <div className="space-y-3">
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-content-muted">Operational snapshot</p>
          <span className="rounded-full border border-border-subtle bg-panel-muted px-2 py-1 text-[10px] font-semibold text-content-secondary">
            {pinnedVehicleIds.length} pinned
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {summaryItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                data-testid={`fleet-management-summary-${item.id}`}
                className="min-w-0 rounded-[14px] border border-border-subtle bg-panel-muted px-2.5 py-2"
              >
                <div className="flex min-w-0 items-center gap-1.5 text-content-muted">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span
                    data-testid={`fleet-management-summary-${item.id}-label`}
                    className="truncate text-[9px] font-semibold uppercase tracking-[0.1em]"
                  >
                    {item.label}
                  </span>
                </div>
                <p className="mt-1 text-[17px] font-semibold text-content-primary">{item.value}</p>
              </div>
            );
          })}
        </div>
        <div className="min-w-0 rounded-[14px] border border-border-subtle bg-panel-muted px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-content-muted">Focused</p>
          <p className="mt-1 truncate text-[13px] font-semibold text-content-primary">
            {focusedVehicle ? focusedVehicle.name : "No vehicle selected"}
          </p>
          <p className="mt-0.5 text-[11px] text-content-muted">
            {focusedVehicle ? `${focusedVehicle.plate} - ${getVehicleAlertLabel(focusedVehicle)}` : "Select a vehicle to synchronize map and trip context."}
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-content-muted">Attention queue</p>
          <span className="text-[11px] text-content-muted">{attentionVehicles.length} open</span>
        </div>
        {attentionVehicles.length ? (
          <div className="space-y-2">
            {attentionVehicles.map((vehicle) => {
              const statusMeta = getVehicleDisplayStatusMeta(vehicle);
              const isPinned = pinnedVehicleIds.includes(vehicle.id);

              return (
                <div key={vehicle.id} className="rounded-[14px] border border-border-subtle bg-panel-muted px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-semibold text-content-primary">{vehicle.name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${statusMeta.badgeClassName}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-content-muted">
                        {vehicle.plate} - {getVehicleAlertLabel(vehicle)} - updated {getLastUpdatedLabel(vehicle.lastUpdatedIso)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        className="rounded-full border border-border-subtle px-2 py-1 text-[10px] font-semibold text-content-secondary transition hover:border-brand/40 hover:text-brand"
                        aria-label={`Focus ${vehicle.name}`}
                        onClick={() => onSelectVehicle(vehicle.id)}
                      >
                        Focus
                      </button>
                      {isPinned ? null : (
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-border-subtle text-content-muted transition hover:border-brand/40 hover:text-brand"
                          aria-label={`Pin ${vehicle.name}`}
                          onClick={() => onPinVehicle(vehicle.id)}
                        >
                          <Pin className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[14px] border border-border-subtle bg-panel-muted px-3 py-3">
            <p className="text-[13px] font-semibold text-content-primary">No vehicles need operator attention.</p>
            <p className="mt-1 text-[11px] text-content-muted">Alerting and offline vehicles appear here first.</p>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-content-muted">Pinned overlays</p>
          <MapPinned className="h-3.5 w-3.5 text-content-muted" />
        </div>
        {pinnedVehicles.length ? (
          <div className="space-y-2">
            {pinnedVehicles.map((vehicle) => {
              const statusMeta = getVehicleDisplayStatusMeta(vehicle);

              return (
                <div key={vehicle.id} className="flex items-center justify-between gap-3 rounded-[14px] border border-border-subtle bg-panel-muted px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-semibold text-content-primary">{vehicle.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${statusMeta.badgeClassName}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-content-muted">{vehicle.plate}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-border-subtle px-2.5 py-1 text-[10px] font-semibold text-content-secondary transition hover:border-danger/40 hover:text-danger"
                    aria-label={`Unpin ${vehicle.name}`}
                    onClick={() => onUnpinVehicle(vehicle.id)}
                  >
                    Unpin
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[14px] border border-border-subtle bg-panel-muted px-3 py-3">
            <p className="text-[13px] font-semibold text-content-primary">No pinned overlays.</p>
            <p className="mt-1 text-[11px] text-content-muted">Pin a vehicle overlay to keep its live context available while working the map.</p>
          </div>
        )}
      </section>
    </div>
  );
}
