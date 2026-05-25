import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { formatTimeByPreference, type AppTimeFormat } from "../../../domain/models/preferences";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";
import {
  TimelineSignalRow,
  getTimelineSignalValuesAtProgress,
  getTimelineTooltipTimestampIsoAtProgress,
  shouldUseFullTooltipTimestamp,
} from "./timelineSignalViewModel";

interface TimelineSignalRowsProps {
  rows: TimelineSignalRow[];
  progress: number;
  className?: string;
  testId?: string;
  onHoverProgressChange?: (nextProgress: number) => void;
  onProgressChange?: (nextProgress: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
}

interface TrackBounds {
  left: number;
  width: number;
}

export function getTimelineHoverProgress(clientX: number, bounds: TrackBounds): number {
  if (!bounds.width) {
    return 0;
  }

  return Math.min(100, Math.max(0, ((clientX - bounds.left) / bounds.width) * 100));
}

export function getTimelineTooltipPlacement(progress: number): { left: string; transform: string } {
  if (progress <= 12) {
    return { left: "0%", transform: "translateX(0)" };
  }

  if (progress >= 88) {
    return { left: "100%", transform: "translateX(-100%)" };
  }

  return { left: `${progress}%`, transform: "translateX(-50%)" };
}

export function formatTimelineTooltipTimestamp(
  timestampIso: string,
  includeDate: boolean,
  timeZone?: string,
  timeFormat: AppTimeFormat = "24h",
): string {
  const timestamp = new Date(timestampIso);
  if (Number.isNaN(timestamp.valueOf())) {
    return "--:--";
  }

  const timeLabel = formatTimeByPreference(timestamp, timeFormat, timeZone);

  if (!includeDate) {
    return timeLabel;
  }

  const dateLabel = timestamp.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
    ...(timeZone ? { timeZone } : {}),
  });

  return `${dateLabel}, ${timeLabel}`;
}

function getPointPath(row: TimelineSignalRow): string {
  if (!row.points.length) {
    return "";
  }

  return row.points
    .map((point) => {
      const valueRatio = (point.numericValue - row.minValue) / Math.max(1, row.maxValue - row.minValue);
      const x = Math.min(100, Math.max(0, point.progressPercent));
      const y = 22 - Math.min(1, Math.max(0, valueRatio)) * 18;
      return `${x},${y}`;
    })
    .join(" ");
}

function getTimelinePointKey(row: TimelineSignalRow, point: TimelineSignalRow["points"][number], index: number): string {
  return `${row.signalId}-${point.timestampIso}-${point.progressPercent}-${index}`;
}

function renderRowGraph(row: TimelineSignalRow, formatTime: (value: Date | string | number, timeZone?: string) => string) {
  if (row.visualType === "event") {
    return (
      <div className="relative h-6 rounded-full bg-surface-raised/70">
        {row.points.map((point, index) => (
          <span
            key={getTimelinePointKey(row, point, index)}
            title={`${point.label} at ${formatTime(point.timestampIso)}`}
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border border-panel shadow-[0_0_12px_rgba(255,85,85,0.35)]"
            style={{
              left: `${point.progressPercent}%`,
              backgroundColor: point.severity === "critical" ? "var(--danger)" : point.severity === "warning" ? "var(--warning)" : row.color,
            }}
          />
        ))}
      </div>
    );
  }

  if (row.visualType === "state") {
    return (
      <div className="relative h-6 overflow-hidden rounded-full bg-surface-raised/70">
        {row.points.map((point, index) => {
          const nextPoint = row.points[index + 1];
          const width = Math.max(2, (nextPoint?.progressPercent ?? 100) - point.progressPercent);

          return (
            <span
              key={getTimelinePointKey(row, point, index)}
              title={`${row.label}: ${point.label}`}
              className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full"
              style={{
                left: `${point.progressPercent}%`,
                width: `${width}%`,
                backgroundColor: point.numericValue > 0 ? row.color : "var(--border-strong)",
                opacity: point.numericValue > 0 ? 0.86 : 0.48,
              }}
            />
          );
        })}
      </div>
    );
  }

  const path = getPointPath(row);

  return (
    <svg className="h-6 w-full overflow-visible rounded-full bg-surface-raised/70" viewBox="0 0 100 24" preserveAspectRatio="none" role="img" aria-label={`${row.label} timeline graph`}>
      {path ? (
        <polyline points={path} fill="none" stroke={row.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      ) : null}
    </svg>
  );
}

export function TimelineSignalRows({
  rows,
  progress,
  className,
  testId,
  onHoverProgressChange,
  onProgressChange,
  onScrubStart,
  onScrubEnd,
}: TimelineSignalRowsProps) {
  const { preferences, formatTime } = useAppPreferences();
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const [hoveredSignalId, setHoveredSignalId] = useState<string | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const scrubTrackBoundsRef = useRef<TrackBounds | null>(null);

  if (!rows.length) {
    return null;
  }

  const guideProgress = hoverProgress ?? progress;
  const guideLabels = getTimelineSignalValuesAtProgress(rows, guideProgress);
  const tooltipEntries = rows
    .map((row) => ({ id: row.signalId, label: row.label, value: guideLabels[row.signalId] }))
    .filter((entry) => entry.value);
  const tooltipTimestampIso = getTimelineTooltipTimestampIsoAtProgress(rows, guideProgress);
  const tooltipTimestampLabel = tooltipTimestampIso
    ? formatTimelineTooltipTimestamp(
        tooltipTimestampIso,
        shouldUseFullTooltipTimestamp(rows),
        undefined,
        preferences.behavior.timeFormat,
      )
    : null;
  const updateProgressFromClientX = useCallback(
    (clientX: number) => {
      const bounds = scrubTrackBoundsRef.current;
      if (!bounds) {
        return;
      }

      const nextProgress = getTimelineHoverProgress(clientX, bounds);
      setHoverProgress(nextProgress);
      onProgressChange?.(nextProgress);
    },
    [onProgressChange],
  );

  const updateHoverProgress = (signalId: string, event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) {
      return;
    }

    const nextProgress = getTimelineHoverProgress(event.clientX, rect);
    setHoverProgress(nextProgress);
    setHoveredSignalId(signalId);
    onHoverProgressChange?.(nextProgress);
  };

  const handleTrackPointerDown = (signalId: string, event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) {
      return;
    }

    const nextProgress = getTimelineHoverProgress(event.clientX, rect);
    setHoverProgress(nextProgress);
    setHoveredSignalId(signalId);

    if (!onProgressChange) {
      return;
    }

    event.preventDefault();
    scrubTrackBoundsRef.current = { left: rect.left, width: rect.width };
    setIsScrubbing(true);
    onScrubStart?.();
    onProgressChange(nextProgress);
  };

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
      scrubTrackBoundsRef.current = null;
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

  const tooltipPlacement = getTimelineTooltipPlacement(guideProgress);

  return (
    <div
      data-testid={testId}
      className={`relative ${className ?? ""}`.trim()}
      onPointerLeave={() => {
        if (isScrubbing) {
          return;
        }

        setHoverProgress(null);
        setHoveredSignalId(null);
      }}
    >
      <div className="space-y-2">
        {rows.map((row) => {
          const currentValue = guideLabels[row.signalId] ?? row.points.at(-1)?.label ?? "--";

          return (
            <div key={row.signalId} className="grid grid-cols-[92px_minmax(0,1fr)_74px] items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-content-secondary">{row.label}</p>
              </div>
              <div
                data-testid={`timeline-signal-track-${row.signalId}`}
                className={`relative ${onProgressChange ? "cursor-pointer" : ""} ${isScrubbing ? "select-none" : ""}`.trim()}
                onPointerMove={(event) => updateHoverProgress(row.signalId, event)}
                onPointerDown={(event) => handleTrackPointerDown(row.signalId, event)}
              >
                {renderRowGraph(row, formatTime)}
                <span
                  data-testid={`timeline-signal-guide-${row.signalId}`}
                  className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-content-primary/40 shadow-[0_0_10px_rgba(255,255,255,0.28)]"
                  style={{ left: `${guideProgress}%` }}
                />
                {hoverProgress !== null && hoveredSignalId === row.signalId && tooltipEntries.length ? (
                  <div
                    className="pointer-events-none absolute bottom-full z-10 mb-2 min-w-[172px] rounded-[14px] border border-border-subtle bg-panel px-3 py-2 shadow-xl"
                    style={tooltipPlacement}
                  >
                    {tooltipTimestampLabel ? (
                      <div className="mb-1.5 flex items-center justify-between gap-4 border-b border-border-subtle pb-1.5 text-[10.5px]">
                        <span className="text-content-muted">Recorded</span>
                        <span className="font-mono font-semibold text-content-primary">{tooltipTimestampLabel}</span>
                      </div>
                    ) : null}
                    {tooltipEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between gap-4 text-[11px]">
                        <span className="text-content-muted">{entry.label}</span>
                        <span className="font-mono font-semibold text-content-primary">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <p className="truncate text-right font-mono text-[11px] text-content-muted">{currentValue}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
