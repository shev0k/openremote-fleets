import { MostActiveVehicle } from "../../../../domain/models/reports";

interface MostActiveVehiclesCardProps {
  vehicles: MostActiveVehicle[];
  isLoading: boolean;
}

export function MostActiveVehiclesCard({
  vehicles,
  isLoading,
}: MostActiveVehiclesCardProps) {
  return (
    <div className="app-panel flex h-[300px] min-h-[400px] flex-col rounded-[24px] p-6 lg:h-full lg:min-h-0">
      <h3 className="mb-4 text-[15px] font-medium text-content-primary">Most Active Vehicles</h3>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
        {vehicles.map((vehicle, index) => (
          <div key={vehicle.vehicleId} className="flex items-center justify-between rounded-xl border border-border-subtle bg-panel-muted p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-sunken text-[12px] font-bold text-content-secondary">
                #{index + 1}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-content-primary">{vehicle.vehicleId}</div>
                <div className="text-[11px] text-content-muted">{vehicle.tripCount} trips</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[13px] font-medium text-brand">{vehicle.distanceLabel}</div>
              <div className="text-[10px] text-content-muted">Score: {vehicle.score}</div>
            </div>
          </div>
        ))}
        {!vehicles.length && (
          <div className="py-10 text-center text-[13px] text-content-muted">
            {isLoading ? "Loading activity leaderboard..." : "No activity data returned for this period."}
          </div>
        )}
      </div>
    </div>
  );
}
