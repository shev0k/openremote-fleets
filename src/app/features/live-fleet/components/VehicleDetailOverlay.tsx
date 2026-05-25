import { AlertTriangle, Route } from "lucide-react";
import { useEffect, useState } from "react";
import type { AlertState, FleetAlert } from "../../../../domain/models/alerts";
import type { PlaybackRoute, TripSegment } from "../../../../domain/models/playback";
import type { Vehicle, VehicleDetail } from "../../../../domain/models/vehicle";
import { resolveGoogleMapsEmbedConfig } from "../../../config/googleMapsEmbedConfig";
import { useAppPreferences } from "../../../providers/AppPreferencesProvider";
import { OpenAlertsPanel } from "./vehicle-detail/OpenAlertsPanel";
import { StreetViewPanel, type StreetViewSnapshot } from "./vehicle-detail/StreetViewPanel";
import { TrackerAttributesPanel } from "./vehicle-detail/TrackerAttributesPanel";
import { VehicleDetailMetricGrid } from "./vehicle-detail/VehicleDetailMetricGrid";
import { VehicleDetailOverlayHeader } from "./vehicle-detail/VehicleDetailOverlayHeader";
import { buildVehicleDetailOverlayViewModel } from "./vehicle-detail/VehicleDetailOverlayViewModel";
import { VehicleOperationalContextPanel } from "./vehicle-detail/VehicleOperationalContextPanel";

interface VehicleDetailOverlayProps {
  vehicle: Vehicle;
  detail: VehicleDetail | null;
  route: PlaybackRoute | null;
  selectedSegment: TripSegment | null;
  isLoading: boolean;
  isPinned: boolean;
  activeAlerts?: FleetAlert[];
  streetViewSnapshotKey?: string | number;
  streetViewPosition?: StreetViewPosition | null;
  onClose: () => void;
  onTogglePin: () => void;
  onOpenGraph: (segmentId: string) => void;
  onAlertStateChange?: (alertId: string, state: AlertState) => void;
  bodyMaxHeightPx?: number;
}

type StreetViewPosition = Pick<StreetViewSnapshot, "latitude" | "longitude" | "heading">;

function createStreetViewSnapshot(vehicle: StreetViewPosition, detail: VehicleDetail | null): StreetViewSnapshot {
  return {
    latitude: vehicle.latitude,
    longitude: vehicle.longitude,
    heading: vehicle.heading,
    gpsAccuracyMeters: detail?.gpsAccuracyMeters,
  };
}

export function VehicleDetailOverlay({
  vehicle,
  detail,
  route,
  selectedSegment,
  isLoading,
  isPinned,
  activeAlerts = [],
  streetViewSnapshotKey,
  streetViewPosition = null,
  onClose,
  onTogglePin,
  onOpenGraph,
  onAlertStateChange,
  bodyMaxHeightPx,
}: VehicleDetailOverlayProps) {
  const { formatTime } = useAppPreferences();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [streetViewSnapshot, setStreetViewSnapshot] = useState<StreetViewSnapshot>(() =>
    createStreetViewSnapshot(streetViewPosition ?? vehicle, detail),
  );
  const googleMapsEmbedConfig = resolveGoogleMapsEmbedConfig();
  const googleMapsApiKey = googleMapsEmbedConfig.status === "configured" ? googleMapsEmbedConfig.apiKey : undefined;
  const viewModel = buildVehicleDetailOverlayViewModel({
    vehicle,
    detail,
    activeAlerts,
    googleMapsApiKey,
    formatTime,
  });
  const segmentForGraph = selectedSegment ?? route?.tripSegments[0] ?? null;
  const shouldShowBody = isPinned || !isCollapsed;
  const bodyStyle = bodyMaxHeightPx ? { maxHeight: `${bodyMaxHeightPx}px` } : undefined;

  useEffect(() => {
    setStreetViewSnapshot(createStreetViewSnapshot(streetViewPosition ?? vehicle, detail));
  }, [streetViewSnapshotKey, vehicle.id]);

  return (
    <div className="app-overlay flex w-full max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[24px]">
      <VehicleDetailOverlayHeader
        title={viewModel.title}
        subtitle={viewModel.subtitle}
        statusMeta={viewModel.statusMeta}
        isCollapsed={isCollapsed}
        isPinned={isPinned}
        onClose={onClose}
        onToggleCollapse={() => setIsCollapsed((current) => !current)}
        onTogglePin={onTogglePin}
      />

      {shouldShowBody ? (
        <div
          className="scrollbar-none flex min-h-0 flex-col gap-2 overflow-y-auto px-3 py-2.5"
          style={bodyStyle}
        >
          {isLoading ? (
            <div className="rounded-[16px] border border-border-subtle bg-panel-muted p-2.5 text-[11px] text-content-muted">
              Loading telemetry and playback context...
            </div>
          ) : null}

          <VehicleDetailMetricGrid metrics={viewModel.detailMetrics} />
          <VehicleOperationalContextPanel
            identityItems={viewModel.trackerIdentityItems}
            items={viewModel.operationalContextItems}
          />
          <TrackerAttributesPanel attributes={viewModel.trackerAttributes} />
          <OpenAlertsPanel
            alerts={viewModel.alerts}
            formatTime={formatTime}
            onAlertStateChange={onAlertStateChange}
          />
          <StreetViewPanel
            vehicleName={vehicle.name}
            apiKey={googleMapsApiKey}
            snapshot={streetViewSnapshot}
            onRefresh={() => setStreetViewSnapshot(createStreetViewSnapshot(streetViewPosition ?? vehicle, detail))}
          />

          <section className="app-panel-muted p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-content-muted">Segment entry point</h4>
                <p className="mt-0.5 text-[11px] text-content-secondary">
                  {segmentForGraph
                    ? `${segmentForGraph.startLabel} to ${segmentForGraph.endLabel}`
                    : "Select a trip segment to open the graph overlay."}
                </p>
              </div>
              <Route className="h-4 w-4 text-content-muted" />
            </div>

            {segmentForGraph ? (
              <button
                type="button"
                onClick={() => onOpenGraph(segmentForGraph.id)}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-4 py-2 text-[11px] font-semibold text-brand transition-colors hover:bg-brand/20"
              >
                <AlertTriangle className="h-4 w-4" />
                View segment graph
              </button>
            ) : (
              <div className="text-[11px] text-content-muted">Segment graph becomes available after playback history loads.</div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
