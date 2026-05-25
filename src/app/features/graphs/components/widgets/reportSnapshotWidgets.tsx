import {
  Activity,
  AlertTriangle,
  BarChart2,
  Gauge,
  Route,
  TrendingUp,
  Truck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { classNames } from "../../../../components/shared/utils/classNames";
import {
  CompactSpeedSparkline,
  EmptyWidgetState,
  formatNumber,
  MiniBar,
  SummaryChip,
} from "../graphWidgetPrimitives";
import { type GraphWidgetRenderProps } from "../graphWidgetTypes";

export function FleetKpisWidget({ snapshot, size }: GraphWidgetRenderProps) {
  const metricCards = [
    {
      id: "max-speed",
      label: "Max Speed Recorded",
      compactLabel: "Max Speed",
      value: `${formatNumber(snapshot.metrics.maxSpeedKph)} km/h`,
      detail: `${snapshot.metrics.maxSpeedDeltaPercent >= 0 ? "+" : ""}${snapshot.metrics.maxSpeedDeltaPercent}% vs previous`,
      icon: <Gauge className="h-4 w-4" />,
      tone: "brand" as const,
    },
    {
      id: "trip-duration",
      label: "Avg Trip Duration",
      compactLabel: "Trip Time",
      value: snapshot.metrics.averageTripDurationLabel,
      detail: "Mean completed trip time",
      icon: <Activity className="h-4 w-4" />,
      tone: "info" as const,
    },
    {
      id: "overspeed",
      label: "Overspeed Events",
      compactLabel: "Overspeed",
      value: formatNumber(snapshot.metrics.overspeedEvents),
      detail: `${snapshot.metrics.overspeedDeltaPercent >= 0 ? "+" : ""}${snapshot.metrics.overspeedDeltaPercent}% vs previous`,
      icon: <AlertTriangle className="h-4 w-4" />,
      tone: "danger" as const,
    },
    {
      id: "distance",
      label: "Total Distance",
      compactLabel: "Distance",
      value: `${formatNumber(snapshot.metrics.totalDistanceKm)} km`,
      detail: "Reported trip distance",
      icon: <Route className="h-4 w-4" />,
      tone: "brand" as const,
    },
  ];

  if (size === "compact") {
    return (
      <div data-testid="graph-kpi-compact-metrics" className="grid h-full min-h-0 grid-cols-2 gap-2">
        {metricCards.map((metric) => (
          <div key={metric.id} className="min-w-0 rounded-[12px] border border-border-subtle bg-panel-muted p-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-content-muted">
              <span className="truncate text-[10px] font-semibold uppercase tracking-[0.08em]">{metric.compactLabel}</span>
              <span className={classNames("shrink-0", metric.tone === "danger" ? "text-danger" : metric.tone === "info" ? "text-info" : "text-brand")}>
                {metric.icon}
              </span>
            </div>
            <div className="truncate text-[17px] font-semibold text-content-primary">{metric.value}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      data-testid="graph-kpi-standard-metrics"
      className={classNames(
        "grid h-full min-h-0 gap-2",
        size === "wide" ? "grid-cols-[repeat(auto-fit,minmax(135px,1fr))]" : "grid-cols-2 grid-rows-2",
      )}
    >
      {metricCards.map((metric) => (
        <div
          key={metric.id}
          className={classNames(
            "flex min-h-0 min-w-0 flex-col justify-between overflow-hidden rounded-[14px] border border-border-subtle bg-panel-muted",
            size === "medium" ? "p-3" : "p-3.5",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-content-muted">{metric.label}</span>
            <span className={classNames("shrink-0", metric.tone === "danger" ? "text-danger" : metric.tone === "info" ? "text-info" : "text-brand")}>
              {metric.icon}
            </span>
          </div>
          <div className="min-w-0">
            <div className={classNames("truncate font-semibold text-content-primary", size === "medium" ? "mt-2 text-[21px]" : "mt-3 text-[24px]")}>
              {metric.value}
            </div>
            <div className="mt-1 truncate text-[11px] leading-4 text-content-muted">{metric.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DailyActivityWidget({ snapshot, dateRangeLabel, size }: GraphWidgetRenderProps) {
  const data = snapshot.dailyTrips.map((point) => ({
    name: point.dayLabel,
    trips: point.trips,
    distance: point.distanceKm,
  }));
  const totalTrips = data.reduce((sum, point) => sum + point.trips, 0);
  const totalDistance = data.reduce((sum, point) => sum + point.distance, 0);

  if (!data.length) return <EmptyWidgetState label="No activity data for this period." />;

  if (size === "compact") {
    const maxTrips = Math.max(1, ...data.map((point) => point.trips));

    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <SummaryChip compact icon={<Truck className="h-3.5 w-3.5" />} label="Trips" value={formatNumber(totalTrips)} />
          <SummaryChip compact icon={<Route className="h-3.5 w-3.5" />} label="Km" value={formatNumber(Math.round(totalDistance))} />
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-hidden">
          {data.slice(-5).map((point) => (
            <div key={point.name} className="grid grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-2 text-[11px]">
              <span className="truncate text-content-muted">{point.name}</span>
              <MiniBar value={point.trips} max={maxTrips} />
              <span className="text-right font-semibold text-content-primary">{point.trips}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3 text-[12px] text-content-muted">
        <span>{dateRangeLabel}</span>
        <span>{formatNumber(totalTrips)} trips / {formatNumber(Math.round(totalDistance))} km</span>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart data={data} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--content-muted)" fontSize={11} tickLine={false} axisLine={false} dy={8} />
            <YAxis yAxisId="left" stroke="var(--content-muted)" fontSize={11} tickLine={false} axisLine={false} dx={-8} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--content-muted)" fontSize={11} tickLine={false} axisLine={false} dx={8} />
            <RechartsTooltip
              cursor={{ fill: "var(--surface-sunken)", opacity: 0.6 }}
              contentStyle={{
                backgroundColor: "var(--panel)",
                borderColor: "var(--border-strong)",
                borderRadius: "12px",
                color: "var(--content-primary)",
                fontSize: "12px",
              }}
            />
            <Bar yAxisId="left" dataKey="trips" fill="var(--brand)" radius={[4, 4, 0, 0]} name="Trips" maxBarSize={36} />
            <Bar yAxisId="right" dataKey="distance" fill="var(--info)" radius={[4, 4, 0, 0]} name="Distance (km)" maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SpeedTrendWidget({ snapshot, size }: GraphWidgetRenderProps) {
  const data = snapshot.dailySpeed.map((point) => ({
    label: point.dayLabel,
    average: point.averageSpeedKph,
    max: point.maxSpeedKph,
  }));
  const latestPoint = data[data.length - 1];
  const highestPoint = data.reduce((highest, point) => (point.max > highest.max ? point : highest), data[0] ?? { label: "--", average: 0, max: 0 });

  if (!data.length) return <EmptyWidgetState label="No speed trend data for this period." />;

  if (size === "compact") {
    return (
      <div data-testid="graph-speed-trend-compact" className="flex h-full min-h-0 flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <SummaryChip compact icon={<TrendingUp className="h-3.5 w-3.5" />} label="Avg" value={`${latestPoint?.average ?? 0}`} />
          <SummaryChip compact icon={<Gauge className="h-3.5 w-3.5" />} label="Max" value={`${highestPoint.max}`} />
        </div>
        <div className="min-h-0 flex-1">
          <CompactSpeedSparkline data={data} />
        </div>
        <div className="flex items-center justify-between text-[10px] font-medium text-content-muted">
          <span>{data[0]?.label}</span>
          <span>{latestPoint?.label}</span>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="graph-speed-trend-chart" className="h-full min-h-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="label" stroke="var(--content-muted)" fontSize={12} tickLine={false} axisLine={false} dy={8} />
          <YAxis stroke="var(--content-muted)" fontSize={12} tickLine={false} axisLine={false} dx={-8} />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: "var(--panel)",
              borderColor: "var(--border-strong)",
              borderRadius: "12px",
              color: "var(--content-primary)",
              fontSize: "12px",
            }}
          />
          <Line type="monotone" dataKey="average" stroke="var(--brand)" strokeWidth={2.5} dot={false} name="Average km/h" />
          <Line type="monotone" dataKey="max" stroke="var(--danger)" strokeWidth={2} dot={false} name="Max km/h" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpeedDistributionWidget({ snapshot, size }: GraphWidgetRenderProps) {
  const rows = size === "compact" ? snapshot.speedDistribution.slice(0, 4) : snapshot.speedDistribution;

  return (
    <div className="h-full min-h-0 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
      {rows.map((point) => (
        <div key={point.bucketLabel} className="space-y-1.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium text-content-secondary">{point.bucketLabel} km/h</span>
            <span className="font-semibold text-content-primary">{point.percentage}%</span>
          </div>
          <MiniBar value={point.percentage} tone={point.bucketLabel === "81+" ? "danger" : "brand"} />
        </div>
      ))}
      {!snapshot.speedDistribution.length ? <EmptyWidgetState label="No speed distribution data for this period." /> : null}
    </div>
  );
}

export function VehicleActivityWidget({ snapshot, size }: GraphWidgetRenderProps) {
  const rows = snapshot.mostActiveVehicles.slice(0, size === "compact" ? 3 : 5);

  return (
    <div className="h-full min-h-0 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
      {rows.map((vehicle, index) => (
        <div key={vehicle.vehicleId} className={classNames("rounded-[14px] border border-border-subtle bg-panel-muted", size === "compact" ? "p-2.5" : "p-3")}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-content-primary">#{index + 1} {vehicle.vehicleId}</div>
              <div className="text-[11px] text-content-muted">{vehicle.tripCount} trips - {vehicle.distanceLabel}</div>
            </div>
            <div className="text-right text-[13px] font-semibold text-brand">{vehicle.score}</div>
          </div>
          <div className="mt-2">
            <MiniBar value={vehicle.score} />
          </div>
        </div>
      ))}
      {!snapshot.mostActiveVehicles.length ? <EmptyWidgetState label="No activity ranking data for this period." /> : null}
    </div>
  );
}
