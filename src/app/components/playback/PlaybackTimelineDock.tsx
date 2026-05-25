import { BarChart3, FastForward, Pause, Play, Rewind, X } from "lucide-react";
import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlaybackRoute } from "../../../domain/models/playback";
import { SelectionDropdown } from "../shared/controls/SelectionDropdown";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";
import { formatPlaybackBoundaryLabel, getCurrentTimeLabel } from "./playbackUtils";
import { buildTimelineSignalRows, getTimelineSignalOptions, getTimelineSignalValuesAtProgress, TimelineSignalDisplayMode } from "./timelineSignalViewModel";
import { TimelineSignalRows } from "./TimelineSignalRows";
import { TimelineSignalSelector } from "./TimelineSignalSelector";

interface PlaybackTimelineDockProps {
  route: PlaybackRoute | null;
  progress: number;
  isPlaying: boolean;
  playbackSpeed: number;
  currentSpeedKph: number;
  onProgressChange: (nextProgress: number) => void;
  onPlayPause: () => void;
  onRewind: () => void;
  onFastForward: () => void;
  onPlaybackSpeedChange: (nextSpeed: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  onClose?: () => void;
  defaultSignalsVisible?: boolean;
  onSignalsVisibleChange?: (isVisible: boolean) => void;
  onHeightChange?: (heightPx: number) => void;
}

export function PlaybackTimelineDock({
  route,
  progress,
  isPlaying,
  playbackSpeed,
  currentSpeedKph,
  onProgressChange,
  onPlayPause,
  onRewind,
  onFastForward,
  onPlaybackSpeedChange,
  onScrubStart,
  onScrubEnd,
  onClose,
  defaultSignalsVisible = true,
  onSignalsVisibleChange,
  onHeightChange,
}: PlaybackTimelineDockProps) {
  const { preferences } = useAppPreferences();
  const timeFormat = preferences.behavior.timeFormat;
  const startLabel = formatPlaybackBoundaryLabel(route, "start", timeFormat);
  const endLabel = formatPlaybackBoundaryLabel(route, "end", timeFormat);
  const currentTimeLabel = getCurrentTimeLabel(route, progress, timeFormat);
  const speedLabel = `${playbackSpeed}x`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const timelineTrackRef = useRef<HTMLDivElement | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [selectedSignalIds, setSelectedSignalIds] = useState<string[]>(["speed"]);
  const [signalDisplayMode, setSignalDisplayMode] = useState<TimelineSignalDisplayMode>("single");
  const [areSignalsVisible, setSignalsVisible] = useState(defaultSignalsVisible);
  const signalOptions = useMemo(() => getTimelineSignalOptions(route), [route]);
  const signalRows = useMemo(
    () => buildTimelineSignalRows(route, selectedSignalIds, signalDisplayMode),
    [route, selectedSignalIds, signalDisplayMode],
  );
  const allSignalRows = useMemo(
    () => buildTimelineSignalRows(route, signalOptions.map((option) => option.id), "multi"),
    [route, signalOptions],
  );
  const currentSignalValueLabels = useMemo(
    () => getTimelineSignalValuesAtProgress(allSignalRows, progress),
    [allSignalRows, progress],
  );

  const getProgressFromClientX = useCallback((clientX: number) => {
    const rect = timelineTrackRef.current?.getBoundingClientRect();
    if (!rect?.width) {
      return progress;
    }

    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  }, [progress]);

  const updateProgressFromClientX = useCallback(
    (clientX: number) => {
      onProgressChange(getProgressFromClientX(clientX));
    },
    [getProgressFromClientX, onProgressChange],
  );

  useEffect(() => {
    if (!isScrubbing) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      updateProgressFromClientX(event.clientX);
    };

    const handlePointerUp = (event: PointerEvent) => {
      event.preventDefault();
      updateProgressFromClientX(event.clientX);
      setIsScrubbing(false);
      onScrubEnd?.();
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerUp);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isScrubbing, onScrubEnd, updateProgressFromClientX]);

  useEffect(() => {
    if (!signalOptions.length) {
      return;
    }

    const optionIds = new Set(signalOptions.map((option) => option.id));
    const validSelectedIds = selectedSignalIds.filter((signalId) => optionIds.has(signalId));

    if (!validSelectedIds.length) {
      setSelectedSignalIds([signalOptions[0].id]);
      return;
    }

    if (validSelectedIds.length !== selectedSignalIds.length) {
      setSelectedSignalIds(validSelectedIds);
    }
  }, [selectedSignalIds, signalOptions]);

  const handleTimelinePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!route?.points.length) {
        return;
      }

      event.preventDefault();
      setIsScrubbing(true);
      onScrubStart?.();
      updateProgressFromClientX(event.clientX);
    },
    [onScrubStart, route?.points.length, updateProgressFromClientX],
  );

  useEffect(() => {
    onSignalsVisibleChange?.(areSignalsVisible);
  }, [areSignalsVisible, onSignalsVisibleChange]);

  useEffect(() => {
    if (!onHeightChange || !rootRef.current) {
      return;
    }

    const reportHeight = (height: number) => {
      onHeightChange(Math.ceil(height));
    };

    reportHeight(rootRef.current.getBoundingClientRect().height);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        reportHeight(entry.contentRect.height);
      }
    });

    observer.observe(rootRef.current);

    return () => observer.disconnect();
  }, [onHeightChange]);

  const timelineTrack = (
    <div
      ref={timelineTrackRef}
      role="slider"
      tabIndex={0}
      aria-label="Route timeline"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      className={`fleet-glass-track relative h-2 flex-1 cursor-pointer rounded-full ${isScrubbing ? "select-none" : ""}`}
      onPointerDown={handleTimelinePointerDown}
    >
      <div className="absolute inset-y-0 left-0 rounded-full bg-timeline-fill" style={{ width: `${progress}%` }} />
      <div
        className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-panel bg-brand shadow-[0_0_18px_rgba(159,202,22,0.45)]"
        style={{ left: `calc(${progress}% - 8px)` }}
      />
    </div>
  );

  const statBlocks = (
    <div className="flex items-center gap-3 md:gap-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-content-muted">Time</p>
        <p className="mt-0.5 text-[13px] font-mono text-content-primary md:text-[15px]">{currentTimeLabel}</p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-content-muted">Speed</p>
        <p className="mt-0.5 text-[13px] font-mono text-brand md:text-[15px]">{currentSpeedKph} km/h</p>
      </div>
    </div>
  );

  const playbackControls = (
    <div className="flex items-center gap-2 md:gap-3">
      <button type="button" onClick={onRewind} className="app-control flex h-9 w-9 items-center justify-center rounded-full md:h-10 md:w-10">
        <Rewind className="h-[18px] w-[18px] md:h-5 md:w-5" />
      </button>
      <button
        type="button"
        onClick={onPlayPause}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-brand/30 bg-brand shadow-[0_20px_40px_-22px_rgba(159,202,22,0.85)] transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 md:h-14 md:w-14"
        disabled={!route?.points.length}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5 fill-current text-content-secondary dark:text-overlay md:h-6 md:w-6" />
        ) : (
          <Play className="ml-1 h-5 w-5 fill-current text-content-secondary dark:text-overlay md:h-6 md:w-6" />
        )}
      </button>
      <button type="button" onClick={onFastForward} className="app-control flex h-9 w-9 items-center justify-center rounded-full md:h-10 md:w-10">
        <FastForward className="h-[18px] w-[18px] md:h-5 md:w-5" />
      </button>
      <SelectionDropdown
        align="right"
        value={speedLabel}
        onChange={(next) => onPlaybackSpeedChange(Number(next))}
        options={[
          { id: "1", label: "1x" },
          { id: "2", label: "2x" },
          { id: "4", label: "4x" },
          { id: "8", label: "8x" },
        ]}
        activeOptionId={String(playbackSpeed)}
        menuSide="top"
        triggerClassName="app-control min-w-[70px] justify-between rounded-full border-border-subtle pr-3 text-content-secondary hover:text-content-primary md:min-w-[78px] md:pr-4"
        menuClassName="w-24 app-overlay overflow-hidden rounded-[18px]"
        optionClassName="justify-between rounded-xl px-3 py-2 text-[13px]"
        activeOptionClassName="bg-brand/12 text-brand"
      />
    </div>
  );

  return (
    <div ref={rootRef} className="app-overlay rounded-[24px]">
      <div className="flex flex-col gap-4 overflow-visible rounded-[inherit] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-content-muted">Timeline</p>
            <p className="mt-1 text-[12px] text-content-secondary">Route playback and segment focus stay synchronized with the map.</p>
          </div>
          <div className="flex items-center gap-2">
            {signalOptions.length ? (
              <button
                type="button"
                onClick={() => setSignalsVisible((visible) => !visible)}
                className={`app-control flex h-8 items-center gap-2 rounded-full px-3 text-[12px] font-medium ${areSignalsVisible ? "border-brand/30 text-brand" : "text-content-muted"}`}
                aria-label={areSignalsVisible ? "Hide signals" : "Show signals"}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Signals
              </button>
            ) : null}
            {onClose ? (
              <button type="button" onClick={onClose} className="app-control flex h-8 w-8 items-center justify-center rounded-full">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        {signalOptions.length && areSignalsVisible ? (
          <div data-testid="timeline-compact-row" className="grid items-center gap-y-3 gap-x-5 xl:grid-cols-[minmax(220px,1fr)_auto_auto]">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 text-[12px] font-mono font-medium text-content-muted">{startLabel}</span>
              {timelineTrack}
              <span className="shrink-0 text-[12px] font-mono font-medium text-content-muted">{endLabel}</span>
            </div>
            <div className="flex justify-start xl:justify-end">{playbackControls}</div>
            {statBlocks}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <span className="text-[12px] font-mono font-medium text-content-muted">{startLabel}</span>
              {timelineTrack}
              <span className="text-[12px] font-mono font-medium text-content-muted">{endLabel}</span>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {statBlocks}
              {playbackControls}
            </div>
          </>
        )}

        {signalOptions.length && areSignalsVisible ? (
          <>
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
              progress={progress}
              className="mt-4"
              testId="timeline-signal-rows"
              onProgressChange={onProgressChange}
              onScrubStart={onScrubStart}
              onScrubEnd={onScrubEnd}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
