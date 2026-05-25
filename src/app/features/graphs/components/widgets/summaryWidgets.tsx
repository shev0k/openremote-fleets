import {
  Battery,
  Fuel,
  HeartPulse,
  User,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { classNames } from "../../../../components/shared/utils/classNames";
import {
  EmptyWidgetState,
  formatNumber,
  formatPercent,
  MiniBar,
  SummaryChip,
  toneClass,
} from "../graphWidgetPrimitives";
import { type GraphWidgetRenderProps } from "../graphWidgetTypes";

export function FleetStatusWidget({ summary, size }: GraphWidgetRenderProps) {
  const isCompact = size === "compact";

  return (
    <div
      className={classNames(
        "flex h-full min-h-0 flex-col",
        size === "compact" ? "justify-between px-1.5 py-2" : "justify-center gap-3 px-2 py-3",
      )}
    >
      {summary.statusRows.map((row) => (
        <div key={row.id} className="min-w-0">
          <div className={classNames("flex items-center justify-between gap-3", isCompact ? "mb-1 text-[11px] leading-4" : "mb-2 text-[12px]")}>
            <span className="font-medium text-content-secondary">{row.label}</span>
            <span className="font-semibold text-content-primary">{row.count}</span>
          </div>
          <MiniBar
            value={row.percentage}
            tone={row.id === "alerting" ? "danger" : row.id === "offline" ? "warning" : "brand"}
            compact={size === "compact"}
          />
        </div>
      ))}
    </div>
  );
}

export function AlertsByVehicleWidget({ summary, size }: GraphWidgetRenderProps) {
  const isCompact = size === "compact";
  const rows = summary.alertRows.slice(0, isCompact ? 2 : 5);

  return (
    <div className={classNames("h-full min-h-0", isCompact ? "space-y-1.5 overflow-hidden" : "space-y-2 overflow-y-auto pr-1 custom-scrollbar")}>
      {rows.map((row) => (
        <div
          key={row.vehicleId}
          className={classNames(
            "flex min-w-0 items-center justify-between rounded-[14px] border border-border-subtle bg-panel-muted",
            isCompact ? "gap-2 px-2.5 py-2" : "gap-3 p-3",
          )}
        >
          <div className="min-w-0">
            <div className={classNames("truncate font-semibold text-content-primary", isCompact ? "text-[12px]" : "text-[13px]")}>{row.vehicleName}</div>
            <div className={classNames("truncate text-content-muted", isCompact ? "text-[10px]" : "text-[11px]")}>{row.speedKph} km/h current speed</div>
          </div>
          <span
            className={classNames(
              "inline-flex shrink-0 items-center justify-center rounded-full bg-danger/10 px-2 font-bold text-danger",
              isCompact ? "h-7 min-w-7 text-[11px]" : "h-8 min-w-8 text-[12px]",
            )}
          >
            {row.activeAlertCount}
          </span>
        </div>
      ))}
      {!summary.alertRows.length ? <EmptyWidgetState label="No vehicles have active alerts." /> : null}
    </div>
  );
}

export function FuelBatteryWidget({ summary, size }: GraphWidgetRenderProps) {
  const rows = summary.fuelBatteryRows.slice(0, size === "compact" ? 3 : 5);

  return (
    <div className="h-full min-h-0 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
      <div className="grid grid-cols-2 gap-2">
        <SummaryChip compact={size === "compact"} icon={<Fuel className="h-4 w-4" />} label="Avg Fuel" value={formatPercent(summary.averageFuelLevel)} />
        <SummaryChip compact={size === "compact"} icon={<Battery className="h-4 w-4" />} label="Avg Battery" value={formatPercent(summary.averageBatteryLevel)} />
      </div>
      {rows.map((row) => (
        <div key={row.vehicleId} className={classNames("rounded-[14px] border border-border-subtle bg-panel-muted", size === "compact" ? "p-2.5" : "p-3")}>
          <div className="mb-2 flex items-center justify-between text-[12px]">
            <span className="font-semibold text-content-primary">{row.vehicleName}</span>
            <span className={classNames("font-semibold", row.activeAlertCount ? "text-danger" : "text-content-muted")}>
              {row.activeAlertCount ? `${row.activeAlertCount} alerts` : "clear"}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-[11px] text-content-muted">
                <span>Fuel</span>
                <span>{formatPercent(row.fuelLevel)}</span>
              </div>
              <MiniBar value={row.fuelLevel} tone={row.fuelLevel !== null && row.fuelLevel < 30 ? "warning" : "brand"} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[11px] text-content-muted">
                <span>Battery</span>
                <span>{formatPercent(row.batteryLevel)}</span>
              </div>
              <MiniBar value={row.batteryLevel} tone={row.batteryLevel !== null && row.batteryLevel < 30 ? "warning" : "info"} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrackerHealthWidget({ summary, size }: GraphWidgetRenderProps) {
  const isCompact = size === "compact";
  const isWide = size === "wide";

  return (
    <div
      className={classNames(
        "grid h-full min-h-0",
        isCompact ? "grid-cols-2 gap-1.5" : "gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2 custom-scrollbar",
      )}
    >
      {summary.trackerHealthRows.map((row) => (
        <div
          key={row.id}
          className={classNames(
            "flex min-h-0 min-w-0 flex-col justify-center overflow-hidden rounded-[14px] border border-border-subtle bg-panel-muted",
            isCompact ? "p-2" : "p-3",
          )}
        >
          <div className={classNames("flex min-w-0 items-center", isCompact ? "gap-1.5" : "gap-2")}>
            <HeartPulse className={classNames("shrink-0", isCompact ? "h-3.5 w-3.5" : "h-4 w-4", row.tone === "normal" ? "text-brand" : "text-warning")} />
            <span className={classNames("truncate font-semibold text-content-secondary", isCompact ? "text-[11px]" : "text-[12px]")}>{row.label}</span>
          </div>
          <div className={classNames("font-semibold", isCompact ? "mt-1.5 text-[18px]" : "mt-2 text-[22px]", toneClass(row.tone))}>{row.averageLabel}</div>
          <div className={classNames("mt-1 text-[11px] leading-4 text-content-muted", isWide ? "" : "hidden")}>{row.detail}</div>
        </div>
      ))}
    </div>
  );
}

export function TelemetryCoverageWidget({ summary, size }: GraphWidgetRenderProps) {
  const rows = size === "compact" ? summary.telemetryCoverageRows.slice(0, 8) : summary.telemetryCoverageRows;

  return (
    <div className={classNames("grid h-full min-h-0 gap-2 overflow-y-auto pr-1 custom-scrollbar", size === "compact" ? "grid-cols-1" : "sm:grid-cols-2")}>
      {rows.map((row) => (
        <div key={row.signalId} className="rounded-[12px] border border-border-subtle bg-panel-muted p-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-content-primary">{row.label}</div>
              <div className="text-[10px] text-content-muted">{row.sourceLabel}</div>
            </div>
            <span className="text-[11px] font-semibold text-brand">{row.supportedVehicleCount}/{summary.vehicleCount}</span>
          </div>
          <div className="mt-2">
            <MiniBar value={row.percentage} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DriverCoverageWidget({ summary, size }: GraphWidgetRenderProps) {
  const isCompact = size === "compact";
  const rows = summary.driverCoverage.driverRows.slice(0, isCompact ? 3 : 4);

  return (
    <div className={classNames("flex h-full min-h-0 flex-col", isCompact ? "gap-1.5 overflow-hidden" : "gap-2 overflow-y-auto pr-1 custom-scrollbar")}>
      <div className={classNames("rounded-[12px] border border-border-subtle bg-panel-muted", isCompact ? "px-2.5 py-2" : "px-3 py-2.5")}>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <User className="h-3.5 w-3.5 shrink-0 text-brand" />
            <span className="truncate text-[11px] font-semibold text-content-secondary">iButton coverage</span>
            <span className="shrink-0 text-[10px] text-content-muted">
              {summary.driverCoverage.assignedCount}/{summary.vehicleCount} assigned
            </span>
          </div>
          <span className={classNames("shrink-0 font-semibold text-content-primary", isCompact ? "text-[16px]" : "text-[18px]")}>
            {summary.driverCoverage.percentage}%
          </span>
        </div>
        <div className="mt-1.5">
          <MiniBar value={summary.driverCoverage.percentage} compact={isCompact} />
        </div>
      </div>

      <div className={classNames("min-h-0", isCompact ? "space-y-1.5 overflow-hidden" : "space-y-1.5")}>
        {rows.map((row) => (
          <div
            key={row.vehicleId}
            className={classNames(
              "flex min-w-0 items-center justify-between gap-2 rounded-[10px] border border-border-subtle bg-panel-muted text-[11px]",
              isCompact ? "px-2.5 py-1.5" : "px-3 py-2",
            )}
          >
            <span className="truncate font-semibold text-content-primary">{row.vehicleName}</span>
            <span className="shrink-0 text-content-muted">{row.driverIdentifier}</span>
          </div>
        ))}
      </div>
      {summary.driverCoverage.unassignedCount ? (
        <div className="text-[11px] text-warning">{summary.driverCoverage.unassignedCount} vehicles missing driver ID.</div>
      ) : null}
    </div>
  );
}

export function EngineLoadWidget({ summary, size }: GraphWidgetRenderProps) {
  const maxRpm = Math.max(1, ...summary.engineRows.map((row) => row.rpm));
  const rows = summary.engineRows.slice(0, size === "compact" ? 4 : 5);

  if (!rows.length) return <EmptyWidgetState label="No engine RPM data for this fleet." />;

  return (
    <div className="h-full min-h-0 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
      {rows.map((row) => (
        <div key={row.vehicleId} className={classNames("rounded-[12px] border border-border-subtle bg-panel-muted", size === "compact" ? "p-2.5" : "p-3")}>
          <div className="mb-1.5 flex items-center justify-between text-[12px]">
            <span className="font-semibold text-content-primary">{row.vehicleName}</span>
            <span className="text-content-muted">{formatNumber(row.rpm)} rpm</span>
          </div>
          <MiniBar value={row.rpm} max={maxRpm} tone={row.rpm > 1800 ? "warning" : "brand"} />
        </div>
      ))}
    </div>
  );
}

export function OdometerDistanceWidget({ summary, size }: GraphWidgetRenderProps) {
  const rows = summary.odometerRows.slice(0, size === "compact" ? 4 : 6);

  if (!rows.length) return <EmptyWidgetState label="No odometer data for this fleet." />;

  return (
    <div className="h-full min-h-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <BarChart
          data={rows.map((row) => ({
            name: row.vehicleName,
            trip: row.tripOdometerKm ?? 0,
            total: row.totalOdometerKm,
          }))}
          margin={size === "compact" ? { top: 8, right: 4, left: 4, bottom: 0 } : { top: 8, right: 10, left: -18, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          {size === "compact" ? (
            <>
              <XAxis dataKey="name" hide />
              <YAxis hide />
            </>
          ) : (
            <>
              <XAxis dataKey="name" stroke="var(--content-muted)" fontSize={11} tickLine={false} axisLine={false} dy={8} />
              <YAxis stroke="var(--content-muted)" fontSize={11} tickLine={false} axisLine={false} dx={-8} />
            </>
          )}
          <RechartsTooltip
            contentStyle={{
              backgroundColor: "var(--panel)",
              borderColor: "var(--border-strong)",
              borderRadius: "12px",
              color: "var(--content-primary)",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="trip" fill="var(--brand)" radius={[4, 4, 0, 0]} name="Trip km" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
