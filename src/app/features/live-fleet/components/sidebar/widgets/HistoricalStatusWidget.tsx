import { AlertTriangle, CalendarClock, MapPinned, Route, Timer } from "lucide-react";
import { PlaybackRoute, TripSegment } from "../../../../../../domain/models/playback";
import { Vehicle } from "../../../../../../domain/models/vehicle";
import { PanelCard } from "../../../../../components/shared/cards/PanelCard";

interface HistoricalStatusWidgetProps {
  vehicle: Vehicle;
  route: PlaybackRoute | null;
  onTripSelect?: (segmentId: string) => void;
  isEmbedded?: boolean;
}

function formatDistance(value: number) {
  return `${value.toFixed(1)} km`;
}

function formatMinutes(value: number) {
  if (value < 60) {
    return `${Math.round(value)} min`;
  }

  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function countSegmentAlarms(segment: TripSegment) {
  return segment.eventMarkers?.filter((marker) => marker.eventType === "alarm").length ?? 0;
}

function getRouteSummary(route: PlaybackRoute | null) {
  const segments = route?.tripSegments ?? [];

  return {
    tripCount: segments.length,
    distanceKm: segments.reduce((total, segment) => total + segment.distanceKm, 0),
    activeMinutes: segments.reduce((total, segment) => total + segment.durationMinutes, 0),
    stopCount: segments.reduce((total, segment) => total + segment.stopCount, 0),
    alarmCount: segments.reduce((total, segment) => total + countSegmentAlarms(segment), 0),
    segments,
  };
}

export function HistoricalStatusWidget({ vehicle, route, onTripSelect, isEmbedded = false }: HistoricalStatusWidgetProps) {
  const summary = getRouteSummary(route);
  const tripLabel = `${summary.tripCount} trip${summary.tripCount === 1 ? "" : "s"}`;
  const alarmLabel = `${summary.alarmCount} alarm${summary.alarmCount === 1 ? "" : "s"}`;
  const summaryGridClassName = isEmbedded ? "grid grid-cols-4 gap-1.5" : "grid grid-cols-2 gap-1.5";
  const summaryCardClassName = isEmbedded ? "app-panel-muted min-h-[52px] min-w-0 rounded-[18px] px-2.5 py-2" : "app-panel-muted min-h-[56px] rounded-[18px] px-2.5 py-2";
  const summaryLabelClassName = isEmbedded
    ? "flex items-center gap-1 overflow-hidden text-[8.5px] font-semibold uppercase tracking-[0.03em] text-content-muted"
    : "flex items-center gap-1 overflow-hidden text-[8.5px] font-semibold uppercase tracking-[0.03em] text-content-muted";
  const summaryValueClassName = isEmbedded
    ? "mt-1 truncate whitespace-nowrap text-[12px] font-semibold leading-[1.2] text-content-primary"
    : "mt-1 truncate whitespace-nowrap text-[12px] font-semibold leading-[1.2] text-content-primary";
  const summaryItems = [
    { label: "Trips", value: tripLabel, icon: Route, valueClassName: summaryValueClassName },
    { label: "Distance", value: formatDistance(summary.distanceKm), icon: MapPinned, valueClassName: summaryValueClassName },
    { label: "Active", value: formatMinutes(summary.activeMinutes), icon: Timer, valueClassName: summaryValueClassName },
    {
      label: "Signals",
      value: alarmLabel,
      icon: AlertTriangle,
      valueClassName: `${isEmbedded ? "mt-1 truncate whitespace-nowrap text-[12px]" : "mt-1 truncate whitespace-nowrap text-[12px]"} font-semibold leading-[1.2] ${summary.alarmCount ? "text-danger" : "text-brand"}`,
    },
  ];
  const content = (
    <>
      <div className={isEmbedded ? "mb-2 flex items-center justify-between gap-3" : "mb-2.5 flex items-center justify-between gap-3"}>
        <div className="min-w-0">
          <h3 className={isEmbedded ? "text-[13px] font-semibold text-content-primary" : "text-[15px] font-semibold text-content-primary"}>Historical status</h3>
          <p className="mt-0.5 truncate text-[11px] text-content-muted">
            <span>Yesterday</span> • {vehicle.name}
          </p>
        </div>
        <CalendarClock className="h-4 w-4 text-content-muted" />
      </div>

      <div className={summaryGridClassName} data-testid="historical-status-summary">
        {summaryItems.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className={summaryCardClassName} data-testid="historical-status-summary-card">
              <div className={summaryLabelClassName} data-testid="historical-status-summary-label-row">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate whitespace-nowrap">{item.label}</span>
              </div>
              <p className={item.valueClassName}>{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="my-2 h-px bg-border-subtle" data-testid="historical-status-separator" />

      <div className="scrollbar-none min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {summary.segments.slice(0, 4).map((segment, index) => {
          const content = (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-content-primary">
                  Trip {index + 1} • {segment.startLabel} to {segment.endLabel}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-content-muted">
                  {segment.distanceLabel} • {segment.averageSpeedLabel}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-content-muted">
                {segment.stopCount ? <MapPinned className="h-3.5 w-3.5" /> : <Route className="h-3.5 w-3.5" />}
                {countSegmentAlarms(segment) ? <AlertTriangle className="h-3.5 w-3.5 text-danger" /> : <Timer className="h-3.5 w-3.5" />}
              </div>
            </div>
          );

          if (!onTripSelect) {
            return (
              <article key={segment.id} className="w-full rounded-[16px] border border-border-subtle bg-panel px-3 py-2 text-left">
                {content}
              </article>
            );
          }

          return (
            <button
              key={segment.id}
              type="button"
              onClick={() => onTripSelect(segment.id)}
              className="w-full rounded-[16px] border border-border-subtle bg-panel px-3 py-2 text-left transition-colors hover:bg-surface-elevated"
              aria-label={`Trip ${index + 1} ${segment.startLabel} to ${segment.endLabel}`}
            >
              {content}
            </button>
          );
        })}
        {!summary.segments.length ? <div className="text-[12px] text-content-muted">No previous-day route history available.</div> : null}
      </div>
    </>
  );

  if (isEmbedded) {
    return <div className="flex h-full flex-col overflow-hidden p-3.5">{content}</div>;
  }

  return (
    <PanelCard className="flex h-full flex-col overflow-hidden p-3.5">
      {content}
    </PanelCard>
  );
}
