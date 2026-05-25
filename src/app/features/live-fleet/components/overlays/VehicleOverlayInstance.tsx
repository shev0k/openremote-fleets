/* ======== IMPORTS ======== */

import type { AlertState, FleetAlert } from "../../../../../domain/models/alerts";
import type { PlaybackRoute, TripSegment } from "../../../../../domain/models/playback";
import type { Vehicle, VehicleDetail } from "../../../../../domain/models/vehicle";
import type { StreetViewSnapshot } from "../vehicle-detail/StreetViewPanel";
import { VehicleDetailOverlay } from "../VehicleDetailOverlay";

/* ======== TYPES ======== */

type StreetViewPosition = Pick<StreetViewSnapshot, "latitude" | "longitude" | "heading">;

interface VehicleOverlayInstanceProps {
  vehicle: Vehicle | null;
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

/* ======== COMPONENT ======== */

export function VehicleOverlayInstance({
  vehicle,
  detail,
  route,
  selectedSegment,
  isLoading,
  isPinned,
  activeAlerts,
  streetViewSnapshotKey,
  streetViewPosition,
  onClose,
  onTogglePin,
  onOpenGraph,
  onAlertStateChange,
  bodyMaxHeightPx,
}: VehicleOverlayInstanceProps) {
  if (!vehicle) {
    return null;
  }

  return (
    <VehicleDetailOverlay
      vehicle={vehicle}
      detail={detail}
      route={route}
      selectedSegment={selectedSegment}
      isLoading={isLoading}
      isPinned={isPinned}
      activeAlerts={activeAlerts}
      streetViewSnapshotKey={streetViewSnapshotKey}
      streetViewPosition={streetViewPosition}
      onClose={onClose}
      onTogglePin={onTogglePin}
      onOpenGraph={onOpenGraph}
      onAlertStateChange={onAlertStateChange}
      bodyMaxHeightPx={bodyMaxHeightPx}
    />
  );
}
