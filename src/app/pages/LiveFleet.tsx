import { LiveFleetPageShell } from "../features/live-fleet/components/LiveFleetPageShell";
import { LiveFleetWorkspaceProvider } from "../features/live-fleet/providers/LiveFleetWorkspaceProvider";

export function LiveFleet() {
  return (
    <LiveFleetWorkspaceProvider>
      <LiveFleetPageShell />
    </LiveFleetWorkspaceProvider>
  );
}
