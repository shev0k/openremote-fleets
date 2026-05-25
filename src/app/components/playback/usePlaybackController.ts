import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaybackRoute } from "../../../domain/models/playback";
import { getPlaybackProgressStep } from "./playbackUtils";

interface ResetPlaybackOptions {
  progress?: number;
  running?: boolean;
  speed?: number;
  timelineInspectionRevision?: number;
}

interface SetPlaybackProgressOptions {
  markInspection?: boolean;
}

interface UsePlaybackControllerOptions {
  enabled?: boolean;
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function usePlaybackController(
  route: PlaybackRoute | null,
  { enabled = true }: UsePlaybackControllerOptions = {},
) {
  const [playbackProgress, setPlaybackProgressState] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaybackRunning, setPlaybackRunning] = useState(false);
  const [timelineInspectionRevision, setTimelineInspectionRevision] = useState(0);
  const [isTimelineScrubbing, setTimelineScrubbing] = useState(false);
  const resumePlaybackAfterScrubRef = useRef(false);
  const isTimelineScrubbingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !isPlaybackRunning || !route?.points.length) {
      return undefined;
    }

    let animationFrame = 0;
    let lastFrameAt = performance.now();

    const tick = (now: number) => {
      const deltaMs = now - lastFrameAt;
      lastFrameAt = now;

      setPlaybackProgressState((value) => {
        const next = value + getPlaybackProgressStep(route, deltaMs, playbackSpeed, value);
        if (next >= 100) {
          setPlaybackRunning(false);
          return 100;
        }

        return next;
      });

      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [enabled, isPlaybackRunning, playbackSpeed, route]);

  const setPlaybackProgress = useCallback((nextProgress: number, options: SetPlaybackProgressOptions = {}) => {
    setPlaybackProgressState(clampProgress(nextProgress));

    if (options.markInspection ?? !isTimelineScrubbingRef.current) {
      setTimelineInspectionRevision((current) => current + 1);
    }
  }, []);

  const resetPlayback = useCallback((options: ResetPlaybackOptions = {}) => {
    setPlaybackRunning(options.running ?? false);
    setPlaybackProgressState(clampProgress(options.progress ?? 0));
    if (options.speed !== undefined) {
      setPlaybackSpeed(options.speed);
    }
    setTimelineInspectionRevision(options.timelineInspectionRevision ?? 0);
    setTimelineScrubbing(false);
    isTimelineScrubbingRef.current = false;
    resumePlaybackAfterScrubRef.current = false;
  }, []);

  const beginTimelineScrub = useCallback(() => {
    resumePlaybackAfterScrubRef.current = isPlaybackRunning;
    isTimelineScrubbingRef.current = true;
    setTimelineScrubbing(true);
    setPlaybackRunning(false);
  }, [isPlaybackRunning]);

  const endTimelineScrub = useCallback(() => {
    if (isTimelineScrubbingRef.current) {
      setTimelineInspectionRevision((current) => current + 1);
    }

    isTimelineScrubbingRef.current = false;
    setTimelineScrubbing(false);

    if (resumePlaybackAfterScrubRef.current) {
      setPlaybackRunning(true);
    }

    resumePlaybackAfterScrubRef.current = false;
  }, []);

  const rewindPlayback = useCallback(() => {
    setPlaybackProgressState((current) => clampProgress(current - 10));
    setTimelineInspectionRevision((current) => current + 1);
  }, []);

  const fastForwardPlayback = useCallback(() => {
    setPlaybackProgressState((current) => clampProgress(current + 10));
    setTimelineInspectionRevision((current) => current + 1);
  }, []);

  const togglePlayback = useCallback(() => {
    setPlaybackRunning((current) => !current);
  }, []);

  return {
    beginTimelineScrub,
    endTimelineScrub,
    fastForwardPlayback,
    isPlaybackRunning,
    isTimelineScrubbing,
    playbackProgress,
    playbackSpeed,
    resetPlayback,
    rewindPlayback,
    setPlaybackProgress,
    setPlaybackRunning,
    setPlaybackSpeed,
    timelineInspectionRevision,
    togglePlayback,
  };
}
