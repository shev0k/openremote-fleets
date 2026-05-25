import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDot, ShieldAlert } from "lucide-react";
import { AlertState, FleetAlert } from "../../domain/models/alerts";
import { PanelCard } from "../components/shared/cards/PanelCard";
import { SegmentedControl } from "../components/shared/controls/SegmentedControl";
import { PageHeaderPanel } from "../components/shared/layout/PageHeaderPanel";
import { AlertFilterBar } from "../features/alerts/AlertFilterBar";
import { formatAlertSourceValue } from "../features/alerts/alertSourceValueFormat";
import { buildAlertFilterOptions, DEFAULT_ALERT_FILTERS, filterAlerts } from "../features/alerts/alertFilters";
import { useAlerts } from "../contexts/AlertsContext";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

type AlertsView = "open" | "all" | "history";

const severityClassNames: Record<FleetAlert["severity"], string> = {
  high: "border-danger/20 bg-danger/10 text-danger",
  medium: "border-warning/20 bg-warning/10 text-warning",
  low: "border-brand/20 bg-brand/10 text-brand",
};

function formatAlertTime(timeIso: string, formatTime: (value: Date | string | number, timeZone?: string) => string): string {
  const timestamp = new Date(timeIso);

  return `${timestamp.toLocaleDateString()} ${formatTime(timestamp)}`;
}

function getStateClassName(state: AlertState): string {
  if (state === "Active") {
    return "text-danger";
  }

  if (state === "Acknowledged") {
    return "text-warning";
  }

  return "text-brand";
}

function getStateIndicator(state: AlertState) {
  if (state === "Active") {
    return <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />;
  }

  if (state === "Acknowledged") {
    return <span className="h-2 w-2 rounded-full bg-warning" />;
  }

  return <CheckCircle2 className="h-4 w-4" />;
}

export function Alerts() {
  const { alerts, isLoading: isLoadingAlerts, updateAlertState } = useAlerts();
  const { formatTime } = useAppPreferences();
  const [activeView, setActiveView] = useState<AlertsView>("open");
  const [filters, setFilters] = useState(DEFAULT_ALERT_FILTERS);

  const openAlerts = useMemo(
    () => alerts.filter((alert) => alert.state === "Active" || alert.state === "Acknowledged"),
    [alerts],
  );
  const historyAlerts = useMemo(
    () => alerts.filter((alert) => alert.state === "Resolved"),
    [alerts],
  );
  const scopedAlerts = useMemo(() => {
    if (activeView === "open") {
      return openAlerts;
    }

    if (activeView === "history") {
      return historyAlerts;
    }

    return alerts;
  }, [activeView, alerts, historyAlerts, openAlerts]);
  const filterOptions = useMemo(() => buildAlertFilterOptions(alerts), [alerts]);
  const tableAlerts = useMemo(() => filterAlerts(scopedAlerts, filters), [filters, scopedAlerts]);

  const handleAlertStateChange = async (alertId: string, newState: AlertState) => {
    await updateAlertState(alertId, newState);
  };

  return (
    <div className="flex h-full flex-col gap-6 font-sans tracking-tight text-content-primary">
      <PageHeaderPanel
        title="Alerts Center"
        description="Monitor fleet anomalies, inspect tracker context, and handle acknowledge or resolve workflows."
        icon={<ShieldAlert className="h-6 w-6 text-danger" />}
      />

      <PanelCard className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-border-subtle p-4 sm:p-5">
          <SegmentedControl
            options={[
              { id: "open", label: "Open Alerts", count: openAlerts.length },
              { id: "all", label: "All Alerts", count: alerts.length },
              { id: "history", label: "Alert History", count: historyAlerts.length },
            ]}
            value={activeView}
            onChange={(id) => setActiveView(id as AlertsView)}
          />
        </div>

        <AlertFilterBar filters={filters} options={filterOptions} onFiltersChange={setFilters} />

        <div className="flex-1 overflow-auto p-4 custom-scrollbar sm:p-6">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-transparent">
              <tr>
                <th className="pb-4 pl-2 text-[13px] font-medium text-content-muted">Severity</th>
                <th className="pb-4 text-[13px] font-medium text-content-muted">Vehicle</th>
                <th className="pb-4 text-[13px] font-medium text-content-muted">Alert</th>
                <th className="pb-4 text-[13px] font-medium text-content-muted">Source</th>
                <th className="pb-4 text-[13px] font-medium text-content-muted">Time</th>
                <th className="pb-4 text-[13px] font-medium text-content-muted">Status</th>
                <th className="pb-4 pr-2 text-right text-[13px] font-medium text-content-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[14px] font-medium text-content-secondary">
              {tableAlerts.map((alert) => {
                const sourceValue = formatAlertSourceValue(alert.sourceValue);

                return (
                  <tr
                    key={alert.id}
                    className="group border-b border-border-subtle transition-colors hover:bg-surface-elevated/80"
                  >
                    <td className="py-4 pl-2">
                      <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${severityClassNames[alert.severity]}`}>
                        {alert.severity === "high" ? <AlertTriangle className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                        {alert.severity}
                      </div>
                    </td>
                    <td className="py-4">
                      <p className="font-semibold text-content-primary">{alert.vehicleName}</p>
                      {alert.vehicleId ? <p className="mt-1 font-mono text-[11px] text-content-muted">{alert.vehicleId}</p> : null}
                    </td>
                    <td className="py-4">
                      <p className="font-semibold text-content-primary">{alert.type}</p>
                      <p className="mt-1 max-w-[260px] truncate text-[12px] text-content-muted">{alert.rule}</p>
                    </td>
                    <td className="py-4">
                      <div className="flex max-w-[240px] flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-content-muted">
                        {alert.sourceAttribute ? (
                          <span className="max-w-full truncate rounded-full bg-surface-sunken px-2 py-1">{alert.sourceAttribute}</span>
                        ) : (
                          <span className="text-content-muted">--</span>
                        )}
                        {sourceValue ? <span className="max-w-full truncate rounded-full bg-surface-sunken px-2 py-1">{sourceValue}</span> : null}
                      </div>
                    </td>
                    <td className="py-4 text-content-muted">{formatAlertTime(alert.timeIso, formatTime)}</td>
                    <td className="py-4">
                      <span className={`inline-flex items-center gap-2 text-[13px] ${getStateClassName(alert.state)}`}>
                        {getStateIndicator(alert.state)}
                        {alert.state}
                      </span>
                    </td>
                    <td className="relative h-14 py-4 pr-2 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        {alert.state === "Active" ? (
                          <button
                            type="button"
                            onClick={() => void handleAlertStateChange(alert.id, "Acknowledged")}
                            className="rounded-md border border-warning/20 bg-warning/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-warning transition-colors hover:bg-warning/20"
                          >
                            Acknowledge
                          </button>
                        ) : null}
                        {alert.state === "Active" || alert.state === "Acknowledged" ? (
                          <button
                            type="button"
                            onClick={() => void handleAlertStateChange(alert.id, "Resolved")}
                            className="rounded-md border border-brand/20 bg-brand/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-brand transition-colors hover:bg-brand/20"
                          >
                            Resolve
                          </button>
                        ) : (
                          <span className="text-[12px] text-content-muted">Closed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!tableAlerts.length ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[14px] text-content-muted">
                    {isLoadingAlerts ? "Loading alerts..." : "No alerts found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border-subtle px-4 py-3 text-[12px] text-content-muted sm:px-6">
          Alert rule configuration stays in OpenRemote Manager. Fleets only handles monitoring, acknowledgement, and resolution.
        </div>
      </PanelCard>
    </div>
  );
}
