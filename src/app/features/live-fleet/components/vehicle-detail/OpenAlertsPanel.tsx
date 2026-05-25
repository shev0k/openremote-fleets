import { AlertTriangle } from "lucide-react";
import type { AlertState, FleetAlert } from "../../../../../domain/models/alerts";
import { AlertStateActionButton } from "../AlertStateActionButton";
import { formatVehicleOverlayDateTime } from "./VehicleDetailOverlayViewModel";

interface OpenAlertsPanelProps {
  alerts: FleetAlert[];
  formatTime: (value: Date | string | number, timeZone?: string) => string;
  onAlertStateChange?: (alertId: string, state: AlertState) => void;
}

export function OpenAlertsPanel({ alerts, formatTime, onAlertStateChange }: OpenAlertsPanelProps) {
  if (!alerts.length) {
    return null;
  }

  return (
    <section className="app-panel-muted flex flex-col p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-content-muted">Open alerts</h4>
          <p className="mt-0.5 text-[11px] text-content-secondary">Ordered by latest trigger.</p>
        </div>
        <AlertTriangle className="h-4 w-4 text-danger" />
      </div>
      <div className="scrollbar-none max-h-[156px] space-y-1.5 overflow-y-auto">
        {alerts.map((alert) => (
          <article
            key={alert.id}
            data-testid={`vehicle-overlay-alert-card-${alert.id}`}
            className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-[14px] border border-danger/18 bg-danger/8 px-2.5 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-danger" />
              <p className="min-w-0 truncate text-[11px] font-semibold text-content-primary">{alert.type}</p>
            </div>
            <span
              data-testid={`vehicle-overlay-alert-badge-${alert.id}`}
              className="justify-self-end rounded-full bg-danger/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-danger"
            >
              {alert.state}
            </span>
            <p
              data-testid={`vehicle-overlay-alert-reason-${alert.id}`}
              className="min-w-0 self-center truncate text-[10.5px] leading-[1.35] text-content-secondary"
            >
              {alert.rule}
            </p>
            <div
              data-testid={`vehicle-overlay-alert-footer-${alert.id}`}
              className="flex shrink-0 items-center justify-end justify-self-end self-center gap-1.5"
            >
              <p className="text-[9.5px] text-content-muted">{formatVehicleOverlayDateTime(alert.timeIso, formatTime)}</p>
              {onAlertStateChange ? (
                <AlertStateActionButton alert={alert} onAlertStateChange={onAlertStateChange} />
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
