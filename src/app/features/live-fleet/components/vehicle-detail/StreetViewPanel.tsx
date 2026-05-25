import { RefreshCw } from "lucide-react";
import { GoogleStreetViewEmbed } from "../GoogleStreetViewEmbed";

export interface StreetViewSnapshot {
  latitude: number;
  longitude: number;
  heading?: number;
  gpsAccuracyMeters?: number;
}

interface StreetViewPanelProps {
  apiKey?: string;
  snapshot: StreetViewSnapshot;
  vehicleName: string;
  onRefresh: () => void;
}

export function StreetViewPanel({ apiKey, snapshot, vehicleName, onRefresh }: StreetViewPanelProps) {
  return (
    <section className="app-panel-muted flex min-h-[208px] flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-2.5 py-2.5">
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-content-muted">Street View</h4>
        <button
          type="button"
          onClick={onRefresh}
          className="app-control flex h-7 w-7 items-center justify-center rounded-full"
          title="Update Street View"
          aria-label="Update Street View"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      <GoogleStreetViewEmbed
        vehicleName={vehicleName}
        apiKey={apiKey}
        latitude={snapshot.latitude}
        longitude={snapshot.longitude}
        heading={snapshot.heading}
        gpsAccuracyMeters={snapshot.gpsAccuracyMeters}
      />
    </section>
  );
}
