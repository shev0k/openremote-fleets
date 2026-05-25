import { Activity, BarChart3, Clock3, Flag, Navigation } from "lucide-react";
import { TripSegment } from "../../../domain/models/playback";

interface TripSegmentsPanelProps {
  title?: string;
  subtitle?: string;
  trips: TripSegment[];
  activeTripId: string | null;
  onTripSelect: (tripId: string) => void;
  onOpenGraph: (tripId: string) => void;
  emptyState: string;
  showTripDates?: boolean;
  showHeader?: boolean;
}

function formatTripDate(timestampIso: string): string {
  return new Date(timestampIso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function TripSegmentsPanel({
  title = "Trip Segments",
  subtitle,
  trips,
  activeTripId,
  onTripSelect,
  onOpenGraph,
  emptyState,
  showTripDates = false,
  showHeader = true,
}: TripSegmentsPanelProps) {
  const loadedTripsLabel = `${trips.length} ${trips.length === 1 ? "trip" : "trips"} loaded`;

  return (
    <div
      className={`${showHeader ? "app-panel " : ""}flex h-full flex-col overflow-hidden`}
      data-testid="trip-segments-panel"
    >
      {showHeader ? (
        <div className="border-b border-border-subtle px-3.5 py-3">
          <h2 className="text-[15px] font-semibold text-content-primary">{title}</h2>
          <p data-testid="trip-segments-subtitle-row" className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-content-muted">
            {subtitle ? <span>{subtitle}</span> : null}
            {subtitle ? <span>•</span> : null}
            <span>{loadedTripsLabel}</span>
          </p>
        </div>
      ) : null}

      <div className="scrollbar-none flex-1 space-y-2 overflow-y-auto p-2.5">
        {trips.map((trip, index) => {
          const isActive = activeTripId === trip.id;
          const stopLabel = `${trip.stopCount} stop${trip.stopCount === 1 ? "" : "s"}`;

          return (
            <div
              role="button"
              tabIndex={0}
              key={trip.id}
              onClick={() => onTripSelect(trip.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onTripSelect(trip.id);
                }
              }}
              className={`w-full cursor-pointer rounded-[16px] border px-3 py-2.5 text-left transition-all ${
                isActive
                  ? "border-brand/30 bg-brand/8"
                  : "border-border-subtle bg-panel-muted hover:border-border-strong hover:bg-surface-elevated"
              }`}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <div className={`h-2 w-2 shrink-0 rounded-full ${isActive ? "bg-brand shadow-[0_0_12px_rgba(159,202,22,0.55)]" : "bg-content-muted/40"}`} />
                  <div className="min-w-0 flex items-baseline gap-1.5" data-testid={`trip-header-${trip.id}`}>
                    <span className="shrink-0 text-[12px] font-semibold leading-[1.2] text-content-primary">Trip {index + 1}</span>
                    <span
                      className="self-baseline shrink-0 text-[12px] font-semibold leading-[1.2] text-content-muted"
                      data-testid={`trip-title-separator-${trip.id}`}
                    >
                      •
                    </span>
                    <span className="truncate text-[10.5px] leading-[1.2] text-content-muted">{trip.startLabel} to {trip.endLabel}</span>
                    {showTripDates ? (
                      <>
                        <span
                          className="self-baseline shrink-0 text-[12px] font-semibold leading-[1.2] text-content-muted"
                          data-testid={`trip-date-separator-${trip.id}`}
                        >
                          •
                        </span>
                        <span className="shrink-0 text-[10.5px] font-medium leading-[1.2] text-content-muted">{formatTripDate(trip.startTimeIso)}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <span className="fleet-glass-chip whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-semibold text-content-secondary">
                  {trip.durationLabel}
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenGraph(trip.id);
                  }}
                  className="app-control flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  title="Open segment graph"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-2.5 grid grid-cols-4 gap-2 border-t border-border-subtle pt-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-content-muted">
                    <Flag className="h-3 w-3 shrink-0" />
                    Distance
                  </div>
                  <p className="mt-1 truncate text-[10.5px] font-semibold text-content-primary">{trip.distanceLabel}</p>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-content-muted">
                    <Clock3 className="h-3 w-3 shrink-0" />
                    Stops
                  </div>
                  <p className="mt-1 truncate text-[10.5px] font-semibold text-content-primary">{stopLabel}</p>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-content-muted">
                    <Activity className="h-3 w-3 shrink-0" />
                    Max
                  </div>
                  <p className="mt-1 truncate text-[10.5px] font-semibold text-content-primary">{trip.maxSpeedLabel}</p>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-content-muted">
                    <Navigation className="h-3 w-3 shrink-0" />
                    Avg
                  </div>
                  <p className="mt-1 truncate text-[10.5px] font-semibold text-content-primary">{trip.averageSpeedLabel}</p>
                </div>
              </div>
            </div>
          );
        })}

        {!trips.length ? <div className="py-10 text-center text-[12px] text-content-muted">{emptyState}</div> : null}
      </div>
    </div>
  );
}
