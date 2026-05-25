/* ======== IMPORTS ======== */

import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { AlertState, FleetAlert } from "../../../../../../domain/models/alerts";
import { Vehicle } from "../../../../../../domain/models/vehicle";
import { PanelCard } from "../../../../../components/shared/cards/PanelCard";
import { useAppPreferences } from "../../../../../providers/AppPreferencesProvider";
import { AlertStateActionButton } from "../../AlertStateActionButton";
import { formatVehicleIdentitySummary } from "../../vehicleIdentityDisplay";

/* ======== TYPES ======== */

interface CriticalAlertsWidgetProps {
  activeAlertsCount: number;
  alerts: FleetAlert[];
  vehicles: Vehicle[];
  onSelectVehicle: (vehicleId: string) => void;
  onAlertStateChange: (alertId: string, state: AlertState) => void;
}

/* ======== COMPONENT ======== */

function formatAlertTime(value: string, formatTime: (value: Date | string | number, timeZone?: string) => string) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "--";
  }

  const dateLabel = date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
  });

  return `${dateLabel}, ${formatTime(date)}`;
}

function getAlertTimeValue(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getAlertSpeedKph(alert: FleetAlert): number | null {
  if (typeof alert.speedKph === "number") {
    return alert.speedKph;
  }

  if (alert.sourceAttribute === "speed" && typeof alert.sourceValue === "number") {
    return alert.sourceValue;
  }

  return null;
}

function getAlertCountLabel(count: number) {
  return `${count} alert${count === 1 ? "" : "s"}`;
}

export function CriticalAlertsWidget({
  activeAlertsCount,
  alerts,
  vehicles,
  onSelectVehicle,
  onAlertStateChange,
}: CriticalAlertsWidgetProps) {
  const { formatTime } = useAppPreferences();
  const vehiclesById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const unresolvedAlertCountByVehicleId = alerts.reduce((counts, alert) => {
    if (!alert.vehicleId || alert.state === "Resolved") {
      return counts;
    }

    counts.set(alert.vehicleId, (counts.get(alert.vehicleId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

  return (
    <PanelCard className="flex h-full flex-col overflow-hidden p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-content-primary">Critical alerts</h3>
          <p className="mt-0.5 text-[11px] text-content-muted">{activeAlertsCount} active fleet alerts.</p>
        </div>
        <ShieldAlert className="h-4 w-4 text-danger" />
      </div>
      <div
        data-testid="critical-alerts-list"
        className="scrollbar-none flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5"
      >
        {[...alerts].sort((left, right) => getAlertTimeValue(right.timeIso) - getAlertTimeValue(left.timeIso)).map((alert) => {
          const vehicle = alert.vehicleId ? vehiclesById.get(alert.vehicleId) : undefined;
          const vehicleName = vehicle?.name ?? alert.vehicleName ?? "Unknown vehicle";
          const vehicleMeta = vehicle
            ? formatVehicleIdentitySummary(vehicle, { fallback: "No assigned identity" })
            : alert.vehicleId
              ? `Vehicle ${alert.vehicleId}`
              : "No vehicle assigned";
          const alertSpeedKph = getAlertSpeedKph(alert);
          const alertCount = alert.vehicleId ? unresolvedAlertCountByVehicleId.get(alert.vehicleId) ?? 1 : 1;

          return (
            <article
              key={alert.id}
              role={vehicle ? "button" : undefined}
              tabIndex={vehicle ? 0 : undefined}
              aria-label={vehicle ? `Focus ${vehicleName} on map` : undefined}
              data-testid={`critical-alert-card-${alert.id}`}
              onClick={vehicle ? () => onSelectVehicle(vehicle.id) : undefined}
              onKeyDown={(event) => {
                if (!vehicle || (event.key !== "Enter" && event.key !== " ")) {
                  return;
                }

                event.preventDefault();
                onSelectVehicle(vehicle.id);
              }}
              className={`w-full rounded-[16px] border border-danger/20 bg-danger/10 px-3 py-2.5 text-left transition-colors hover:bg-danger/12 ${
                vehicle ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-danger/35" : ""
              }`}
            >
              <div
                data-testid={`critical-alert-summary-${alert.id}`}
                className="grid min-h-[58px] grid-cols-[minmax(0,1fr)_auto] items-stretch gap-3"
              >
                <div
                  data-testid={`critical-alert-identity-${alert.id}`}
                  className="grid min-w-0 grid-rows-[auto_auto_auto] content-between"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
                    <p className="min-w-0 truncate text-[12px] font-semibold text-content-primary">{vehicleName}</p>
                    {alertCount > 0 ? (
                      <span className="rounded-full bg-danger/14 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-danger">
                        {alertCount}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-[10.5px] text-content-muted">{vehicleMeta}</p>
                  {vehicle ? <p className="truncate text-[10px] text-content-muted">IMEI {vehicle.trackerId}</p> : null}
                </div>
                <div
                  data-testid={`critical-alert-metrics-${alert.id}`}
                  className="grid shrink-0 grid-rows-[auto_auto_auto] content-between justify-items-end text-right"
                >
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-danger/80">Speed</p>
                    <p className="text-[11px] font-semibold text-danger">
                      {alertSpeedKph === null ? "--" : Math.round(alertSpeedKph)} km/h
                    </p>
                  </div>
                  <p className="text-[9px] text-content-muted">{formatAlertTime(alert.timeIso, formatTime)}</p>
                  <p className="text-[9px] font-medium text-danger">{getAlertCountLabel(alertCount)}</p>
                </div>
              </div>
              <div className="mt-2 flex items-start justify-between gap-3 border-t border-danger/15 pt-2">
                <div className="min-w-0">
                  <p className="truncate text-[10.5px] font-semibold text-content-primary">{alert.type}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-[1.35] text-content-secondary">{alert.rule}</p>
                </div>
                <div className="shrink-0 pt-0.5">
                  <AlertStateActionButton alert={alert} onAlertStateChange={onAlertStateChange} />
                </div>
              </div>
            </article>
          );
        })}
        {!alerts.length ? (
          <div
            data-testid="critical-alerts-empty-state"
            className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-[14px] border border-border-subtle bg-panel-muted px-4 py-5 text-center"
          >
            <span
              data-testid="critical-alerts-empty-state-icon"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle bg-surface-elevated text-success"
            >
              <ShieldCheck className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[12px] font-medium text-content-secondary">No critical alerts.</p>
          </div>
        ) : null}
      </div>
    </PanelCard>
  );
}
