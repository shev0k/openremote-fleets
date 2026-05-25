/* @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePlaybackController } from "./usePlaybackController";

describe("usePlaybackController", () => {
  it("clamps progress and records manual inspection revisions", () => {
    const { result } = renderHook(() => usePlaybackController(null));

    act(() => {
      result.current.setPlaybackProgress(120);
    });

    expect(result.current.playbackProgress).toBe(100);
    expect(result.current.timelineInspectionRevision).toBe(1);

    act(() => {
      result.current.rewindPlayback();
    });

    expect(result.current.playbackProgress).toBe(90);
    expect(result.current.timelineInspectionRevision).toBe(2);
  });

  it("restores playback after timeline scrub when it was previously running", () => {
    const { result } = renderHook(() => usePlaybackController(null));

    act(() => {
      result.current.setPlaybackRunning(true);
    });

    act(() => {
      result.current.beginTimelineScrub();
    });

    expect(result.current.isTimelineScrubbing).toBe(true);
    expect(result.current.isPlaybackRunning).toBe(false);

    act(() => {
      result.current.endTimelineScrub();
    });

    expect(result.current.isTimelineScrubbing).toBe(false);
    expect(result.current.isPlaybackRunning).toBe(true);
  });

  it("resets progress, speed, running state, and timeline inspection state", () => {
    const { result } = renderHook(() => usePlaybackController(null));

    act(() => {
      result.current.setPlaybackProgress(45);
      result.current.setPlaybackSpeed(4);
      result.current.setPlaybackRunning(true);
      result.current.resetPlayback({ progress: 12, speed: 2 });
    });

    expect(result.current.playbackProgress).toBe(12);
    expect(result.current.playbackSpeed).toBe(2);
    expect(result.current.isPlaybackRunning).toBe(false);
    expect(result.current.timelineInspectionRevision).toBe(0);
  });
});
