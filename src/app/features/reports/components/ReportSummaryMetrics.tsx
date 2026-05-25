import { Activity, AlertTriangle, Clock, Flag, TrendingUp } from "lucide-react";
import { FleetReportMetrics } from "../../../../domain/models/reports";
import { MetricTileCard } from "../../../components/shared/cards/MetricTileCard";

interface ReportSummaryMetricsProps {
  metrics: FleetReportMetrics;
}

export function ReportSummaryMetrics({ metrics }: ReportSummaryMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricTileCard
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Activity className="w-5 h-5" />
          </div>
        }
        badge={
          <div className="text-[12px] font-medium text-red-500 bg-red-500/10 px-2 py-1 rounded-md flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {metrics.maxSpeedDeltaPercent}%
          </div>
        }
        title="Max Speed Recorded"
        value={
          <>
            {metrics.maxSpeedKph}
            <span className="text-[14px] font-medium text-content-muted">km/h</span>
          </>
        }
      />

      <MetricTileCard
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-sunken text-content-secondary">
            <Clock className="w-5 h-5" />
          </div>
        }
        title="Avg Trip Duration"
        value={metrics.averageTripDurationLabel}
      />

      <MetricTileCard
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle className="w-5 h-5" />
          </div>
        }
        badge={
          <div className="flex items-center gap-1 rounded-md bg-brand/10 px-2 py-1 text-[12px] font-medium text-brand">
            <TrendingUp className="w-3 h-3 rotate-180" /> {metrics.overspeedDeltaPercent}%
          </div>
        }
        title="Overspeed Events"
        value={metrics.overspeedEvents}
      />

      <MetricTileCard
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info/10 text-info">
            <Flag className="w-5 h-5" />
          </div>
        }
        title="Total Distance"
        value={
          <>
            {metrics.totalDistanceKm.toLocaleString()}
            <span className="text-[14px] font-medium text-content-muted">km</span>
          </>
        }
      />
    </div>
  );
}
