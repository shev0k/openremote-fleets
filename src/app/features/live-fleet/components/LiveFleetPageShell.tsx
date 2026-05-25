/* ======== IMPORTS ======== */

import { PlaybackTimelineDock } from "../../../components/playback/PlaybackTimelineDock";
import { getCurrentRouteSpeedKph } from "../../../components/playback/playbackUtils";
import { LIVE_FLEET_TIMELINE_LEFT_OFFSET } from "../liveFleetLayout";
import { LiveFleetSidebarWorkspace } from "./sidebar/LiveFleetSidebarWorkspace";
import { LiveMapCanvas } from "./LiveMapCanvas";
import { LiveFleetOverlayLayer } from "./overlays/LiveFleetOverlayLayer";
import { useLiveFleetLayoutState } from "../providers/LiveFleetLayoutContext";
import { useLiveFleetPlaybackState } from "../providers/LiveFleetPlaybackContext";
import { useLiveFleetMapPreferences } from "../providers/LiveFleetPreferencesContext";
import { useLiveFleetVehicleSelection } from "../providers/LiveFleetSelectionContext";

/* ======== COMPONENT ======== */

export function LiveFleetPageShell() {
  const layout = useLiveFleetLayoutState();
  const playback = useLiveFleetPlaybackState();
  const mapPreferences = useLiveFleetMapPreferences();
  const selection = useLiveFleetVehicleSelection();
  const timelineVehicle = selection.selectedVehicle;
  const timelineRoute = playback.route;
  const timelineSpeedKph = getCurrentRouteSpeedKph(timelineRoute, playback.playbackProgress);

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <LiveMapCanvas />
      <LiveFleetSidebarWorkspace />
      <LiveFleetOverlayLayer />

      {timelineVehicle && timelineRoute && layout.isTimelineVisible ? (
        <div
          className={`absolute bottom-5 right-5 left-5 z-[1260] ${mapPreferences.isWorkspaceOpen ? "xl:left-[var(--live-fleet-timeline-left)]" : "xl:left-5"}`}
          style={{ ["--live-fleet-timeline-left" as string]: `${LIVE_FLEET_TIMELINE_LEFT_OFFSET}px` }}
        >
          <PlaybackTimelineDock
            route={timelineRoute}
            progress={playback.playbackProgress}
            isPlaying={playback.isPlaybackRunning}
            playbackSpeed={playback.playbackSpeed}
            currentSpeedKph={playback.playbackProgress >= 100 ? timelineVehicle.speedKph : timelineSpeedKph}
            onProgressChange={playback.setPlaybackProgress}
            onPlayPause={playback.togglePlayback}
            onRewind={playback.rewindPlayback}
            onFastForward={playback.fastForwardPlayback}
            onPlaybackSpeedChange={playback.setPlaybackSpeed}
            onScrubStart={playback.beginTimelineScrub}
            onScrubEnd={playback.endTimelineScrub}
            onClose={() => layout.setTimelineVisible(false)}
            defaultSignalsVisible={false}
            onSignalsVisibleChange={layout.setTimelineSignalsVisible}
            onHeightChange={layout.setTimelineHeightPx}
          />
        </div>
      ) : null}
    </div>
  );
}
