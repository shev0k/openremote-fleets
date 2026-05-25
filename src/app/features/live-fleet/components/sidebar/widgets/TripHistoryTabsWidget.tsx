import { History, Route } from "lucide-react";
import { useState } from "react";
import { PlaybackRoute } from "../../../../../../domain/models/playback";
import { Vehicle } from "../../../../../../domain/models/vehicle";
import { TripSegmentsPanel } from "../../../../../components/playback/TripSegmentsPanel";
import { HistoricalStatusWidget } from "./HistoricalStatusWidget";

interface TripHistoryTabsWidgetProps {
  vehicle: Vehicle;
  route: PlaybackRoute | null;
  historicalRoute: PlaybackRoute | null;
  activeTripId: string | null;
  isLoadingRoute: boolean;
  onTripSelect: (tripId: string) => void;
  onOpenGraph: (tripId: string) => void;
}

type TripHistoryTab = "trips" | "historical";

const TABS: { id: TripHistoryTab; label: string; icon: typeof Route }[] = [
  { id: "trips", label: "Trips", icon: Route },
  { id: "historical", label: "Historical", icon: History },
];

export function TripHistoryTabsWidget({
  vehicle,
  route,
  historicalRoute,
  activeTripId,
  isLoadingRoute,
  onTripSelect,
  onOpenGraph,
}: TripHistoryTabsWidgetProps) {
  const [activeTab, setActiveTab] = useState<TripHistoryTab>("trips");

  return (
    <div className="app-panel flex h-full flex-col overflow-hidden">
      <div className="border-b border-border-subtle px-3.5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-content-primary">Trip history</h2>
            <p className="mt-0.5 truncate text-[11px] text-content-muted">{vehicle.name} · last 24 hours and previous-day context</p>
          </div>
          <div className="app-panel-muted !rounded-full flex shrink-0 gap-1 p-1" role="tablist" aria-label="Trip history views">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold transition-colors ${
                    isActive ? "bg-brand text-brand-foreground" : "text-content-muted hover:bg-surface-elevated hover:text-content-primary"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === "trips" ? (
          <TripSegmentsPanel
            trips={route?.tripSegments ?? []}
            activeTripId={activeTripId}
            onTripSelect={onTripSelect}
            onOpenGraph={onOpenGraph}
            emptyState={isLoadingRoute ? "Loading trip segments..." : "No 24-hour route history available."}
            showHeader={false}
          />
        ) : (
          <HistoricalStatusWidget vehicle={vehicle} route={historicalRoute} isEmbedded />
        )}
      </div>
    </div>
  );
}
