import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Activity, Clock3, Flag, Gauge, Navigation, Timer } from "lucide-react";
import { TripSegment } from "../../../domain/models/playback";
import { DialogFrame } from "../shared/dialogs/DialogFrame";
import { formatPlaybackTimeLabel } from "./playbackUtils";
import { getSegmentGraphEvents } from "./segmentGraphEvents";
import { buildSegmentSignalRows, getSegmentSignalOptions, getTimelineSignalValuesAtProgress, TimelineSignalDisplayMode } from "./timelineSignalViewModel";
import { TimelineSignalRows } from "./TimelineSignalRows";
import { TimelineSignalSelector } from "./TimelineSignalSelector";

interface SegmentGraphOverlayProps {
  isOpen: boolean;
  segment: TripSegment | null;
  onClose: () => void;
}

const DEFAULT_SEGMENT_SIGNAL_IDS = ["speed", "fuelLevel", "batteryLevel", "engineRpm", "gnssHdop"];

function SegmentMetricCard({
  id,
  label,
  value,
  icon,
}: {
  id: string;
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="app-panel-muted min-w-0 p-3.5">
      <div className="flex min-w-0 items-center gap-2 text-content-muted">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-sunken [&_svg]:h-3.5 [&_svg]:w-3.5"
          data-testid={`segment-graph-metric-${id}-icon`}
        >
          {icon}
        </span>
        <p className="min-w-0 text-[10.5px] font-semibold uppercase leading-4 tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-1.5 text-[15px] font-semibold leading-5 text-content-primary">{value}</p>
    </div>
  );
}

export function SegmentGraphOverlay({ isOpen, segment, onClose }: SegmentGraphOverlayProps) {
  const [selectedSignalIds, setSelectedSignalIds] = useState<string[]>(["speed"]);
  const [signalDisplayMode, setSignalDisplayMode] = useState<TimelineSignalDisplayMode>("multi");
  const [activeSignalProgress, setActiveSignalProgress] = useState(0);
  const signalOptions = useMemo(() => getSegmentSignalOptions(segment), [segment]);
  const signalRows = useMemo(
    () => buildSegmentSignalRows(segment, selectedSignalIds, signalDisplayMode),
    [segment, selectedSignalIds, signalDisplayMode],
  );
  const currentSignalValueLabels = useMemo(
    () => getTimelineSignalValuesAtProgress(signalRows, activeSignalProgress),
    [activeSignalProgress, signalRows],
  );

  useEffect(() => {
    if (!signalOptions.length) {
      return;
    }

    const optionIds = new Set(signalOptions.map((option) => option.id));
    const validSelectedIds = selectedSignalIds.filter((signalId) => optionIds.has(signalId));

    if (!validSelectedIds.length) {
      setSelectedSignalIds(signalOptions.slice(0, 3).map((option) => option.id));
      return;
    }

    if (validSelectedIds.length !== selectedSignalIds.length) {
      setSelectedSignalIds(validSelectedIds);
    }
  }, [selectedSignalIds, signalOptions]);

  useEffect(() => {
    if (!isOpen || !segment) {
      return;
    }

    const initialSignalOptions = getSegmentSignalOptions(segment);
    if (!initialSignalOptions.length) {
      return;
    }

    const defaultIds = DEFAULT_SEGMENT_SIGNAL_IDS.filter((signalId) => initialSignalOptions.some((option) => option.id === signalId));
    setSelectedSignalIds(defaultIds.length ? defaultIds : [initialSignalOptions[0].id]);
    setSignalDisplayMode("multi");
    setActiveSignalProgress(0);
  }, [isOpen, segment?.id]);

  if (!isOpen || !segment) {
    return null;
  }

  const eventMarkers = getSegmentGraphEvents(segment);

  return (
    <DialogFrame
      title="Segment Graph"
      subtitle={`${formatPlaybackTimeLabel(segment.startTimeIso)} to ${formatPlaybackTimeLabel(segment.endTimeIso)}`}
      onClose={onClose}
      widthClassName="max-w-6xl"
      bodyClassName="space-y-6"
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        <SegmentMetricCard id="start" label="Start" value={formatPlaybackTimeLabel(segment.startTimeIso)} icon={<Clock3 />} />
        <SegmentMetricCard id="end" label="End" value={formatPlaybackTimeLabel(segment.endTimeIso)} icon={<Timer />} />
        <SegmentMetricCard id="distance" label="Distance" value={segment.distanceLabel} icon={<Flag />} />
        <SegmentMetricCard id="duration" label="Duration" value={segment.durationLabel} icon={<Activity />} />
        <SegmentMetricCard id="averageSpeed" label="Average speed" value={segment.averageSpeedLabel} icon={<Navigation />} />
        <SegmentMetricCard id="maxSpeed" label="Max speed" value={segment.maxSpeedLabel} icon={<Gauge />} />
      </div>

      <div className="app-panel-muted space-y-4 p-4">
        <TimelineSignalSelector
          options={signalOptions}
          selectedSignalIds={selectedSignalIds}
          displayMode={signalDisplayMode}
          currentValueLabels={currentSignalValueLabels}
          onSelectedSignalIdsChange={setSelectedSignalIds}
          onDisplayModeChange={setSignalDisplayMode}
        />

        <TimelineSignalRows
          rows={signalRows}
          progress={activeSignalProgress}
          testId="segment-graph-signal-rows"
          onHoverProgressChange={setActiveSignalProgress}
        />
      </div>

      <div className="app-panel-muted p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-content-muted">Events</p>
          </div>
          <span className="fleet-glass-chip rounded-full px-2.5 py-1 text-[11px] font-medium text-content-secondary">
            {eventMarkers.length} marker{eventMarkers.length === 1 ? "" : "s"}
          </span>
        </div>

        {eventMarkers.length ? (
          <div className="mt-4 space-y-2">
            {eventMarkers.map((eventMarker) => (
              <div key={eventMarker.id} className="grid grid-cols-[86px_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] border border-border-subtle bg-surface-elevated px-3 py-2">
                <span className="font-mono text-[11px] text-content-muted">{formatPlaybackTimeLabel(eventMarker.timestampIso)}</span>
                <span className="truncate text-[12px] font-medium text-content-primary">{eventMarker.label}</span>
                <span className="rounded-full bg-panel px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-content-muted">
                  {eventMarker.severity ?? "info"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-[14px] border border-border-subtle bg-surface-elevated px-3 py-3 text-[12px] text-content-muted">
            No event markers for this segment.
          </p>
        )}
      </div>
    </DialogFrame>
  );
}
