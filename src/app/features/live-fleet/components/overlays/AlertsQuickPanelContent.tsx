/* ======== IMPORTS ======== */

import { AlertTriangle, CheckCircle2, CircleDot, LocateFixed, Siren } from "lucide-react";
import { FleetAlert } from "../../../../../domain/models/alerts";
import { formatAlertSourceValue } from "../../../alerts/alertSourceValueFormat";
import { useAppPreferences } from "../../../../providers/AppPreferencesProvider";

/* ======== TYPES ======== */

interface AlertsQuickPanelContentProps {
  alerts: FleetAlert[];
  onSelectVehicle?: (vehicleId: string) => void;
}

/* ======== HELPERS ======== */

const severityRank: Record<FleetAlert["severity"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function getSeverityClassName(severity: FleetAlert["severity"]) {
  if (severity === "high") {
    return "bg-danger/12 text-danger border border-danger/20";
  }

  if (severity === "medium") {
    return "bg-warning/12 text-warning border border-warning/20";
  }

  return "bg-brand/12 text-brand border border-brand/20";
}

/* ======== COMPONENT ======== */

export function AlertsQuickPanelContent({ alerts, onSelectVehicle }: AlertsQuickPanelContentProps) {
  const { formatTime } = useAppPreferences();
  const unresolvedAlerts = alerts
    .filter((alert) => alert.state !== "Resolved")
    .sort((first, second) => {
      return severityRank[second.severity] - severityRank[first.severity] || new Date(second.timeIso).getTime() - new Date(first.timeIso).getTime();
    });

  const criticalCount = unresolvedAlerts.filter((alert) => alert.severity === "high").length;
  const acknowledgedCount = unresolvedAlerts.filter((alert) => alert.state === "Acknowledged").length;
  const summaryItems = [
    { id: "open", label: "Open alerts", value: unresolvedAlerts.length, className: "text-content-primary", icon: CircleDot },
    { id: "critical", label: "Critical", value: criticalCount, className: "text-danger", icon: Siren },
    { id: "acknowledged", label: "Acknowledged", value: acknowledgedCount, className: "text-warning", icon: AlertTriangle },
  ];

  if (!unresolvedAlerts.length) {
    return (
      <div className="rounded-[16px] border border-border-subtle bg-panel-muted px-3 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <p className="mt-3 text-[13px] font-semibold text-content-primary">No unresolved alerts.</p>
        <p className="mt-1 text-[11px] leading-5 text-content-muted">Fleet alert overlays will appear here when live rules need attention.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {summaryItems.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              data-testid={`alerts-summary-${item.id}`}
              className="min-w-0 rounded-[14px] border border-border-subtle bg-panel-muted px-2.5 py-2"
            >
              <div className="flex min-w-0 items-center gap-1.5 text-content-muted">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <p
                  data-testid={`alerts-summary-${item.id}-label`}
                  className="truncate text-[8.5px] font-bold uppercase tracking-[0.08em]"
                >
                  {item.label}
                </p>
              </div>
              <p className={`mt-1 text-[17px] font-semibold ${item.className}`}>{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        {unresolvedAlerts.slice(0, 8).map((alert) => {
          const sourceValue = formatAlertSourceValue(alert.sourceValue);

          return (
            <article key={alert.id} className="rounded-[16px] border border-border-subtle bg-panel-muted px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-semibold text-content-primary">{alert.vehicleName}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${getSeverityClassName(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-[13px] font-semibold text-content-secondary">{alert.type}</p>
                  <p className="mt-1 text-[11px] leading-5 text-content-muted">{alert.rule}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-content-muted">
                  <CircleDot className="h-3.5 w-3.5" />
                  {formatTime(alert.timeIso)}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-2.5">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
                  <span className="max-w-full truncate rounded-full bg-surface-sunken px-2 py-1">{alert.state}</span>
                  {alert.sourceAttribute ? <span className="max-w-full truncate rounded-full bg-surface-sunken px-2 py-1">{alert.sourceAttribute}</span> : null}
                  {sourceValue ? <span className="max-w-full truncate rounded-full bg-surface-sunken px-2 py-1">{sourceValue}</span> : null}
                </div>
                {alert.vehicleId && onSelectVehicle ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle px-2.5 py-1 text-[10px] font-semibold text-content-secondary transition hover:border-brand/40 hover:text-brand"
                    aria-label={`Focus ${alert.vehicleName}`}
                    onClick={() => onSelectVehicle(alert.vehicleId as string)}
                  >
                    <LocateFixed className="h-3.5 w-3.5" />
                    Focus
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
