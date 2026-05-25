import { Radio } from "lucide-react";
import { PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { getVehicleDisplayStatusCatalogue } from "../../components/map/vehicleDisplayStatus";
import { WallDisplayTimelineItem, WallDisplayViewModel } from "./wallDisplayViewModel";

interface WallDisplayTimelineProps {
  viewModel: WallDisplayViewModel;
}

const VEHICLE_TICKER_SCROLL_PIXELS_PER_SECOND = 76;
const statusMetaById = Object.fromEntries(
  getVehicleDisplayStatusCatalogue().map((statusMeta) => [statusMeta.id, statusMeta]),
);

function TimelineItem({ item }: { item: WallDisplayTimelineItem }) {
  const statusMeta = statusMetaById[item.statusId];
  const Icon = statusMeta?.icon ?? Radio;

  return (
    <div className={`min-h-[50px] w-max shrink-0 rounded-[14px] border border-border-subtle border-l-2 border-l-[var(--vehicle-status-color)] bg-panel-muted/90 px-3 py-2.5 backdrop-blur-xl ${item.statusColorClassName}`}>
      <div className="flex h-full items-center gap-2.5">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${item.statusBadgeClassName}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="shrink-0">
          <div className="flex items-center gap-1.5 whitespace-nowrap text-[12px] leading-none">
            <h3 className="text-[13px] font-semibold text-content-primary">{item.vehicleName}</h3>
            <span className="shrink-0 text-content-muted">•</span>
            <span className="shrink-0 font-medium text-content-muted">{item.plate}</span>
            <span className="shrink-0 text-content-muted">•</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${item.statusBadgeClassName}`}>
              {item.statusLabel}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap text-[11px] leading-none text-content-secondary">
            <span className="tabular-nums">{item.detail}</span>
            <span className="w-[76px] shrink-0 tabular-nums text-content-muted">• {item.timeLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WallDisplayTimeline({ viewModel }: WallDisplayTimelineProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const isPointerActiveRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const scrollPositionRef = useRef(0);
  const resumeTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastAnimationTimeRef = useRef<number | null>(null);
  const [isTickerPaused, setTickerPaused] = useState(false);
  const scrollingItemsLoop = useMemo(() => {
    const repeatCount = Math.max(8, Math.ceil(32 / Math.max(1, viewModel.timelineItems.length)));
    return Array.from({ length: repeatCount }).flatMap(() => viewModel.timelineItems);
  }, [viewModel.timelineItems]);

  useEffect(() => {
    if (!viewModel.timelineItems.length) {
      return undefined;
    }

    function step(timestamp: number) {
      const scroller = scrollerRef.current;
      const lastTimestamp = lastAnimationTimeRef.current ?? timestamp;
      const deltaSeconds = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
      lastAnimationTimeRef.current = timestamp;

      if (scroller && !isTickerPaused && !isPointerActiveRef.current) {
        const loopWidth = scroller.scrollWidth / 2;

        if (loopWidth > 0) {
          scrollPositionRef.current += VEHICLE_TICKER_SCROLL_PIXELS_PER_SECOND * deltaSeconds;

          if (scrollPositionRef.current >= loopWidth) {
            scrollPositionRef.current -= loopWidth;
          }

          scroller.scrollLeft = scrollPositionRef.current;
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(step);
    }

    animationFrameRef.current = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = null;
      lastAnimationTimeRef.current = null;
    };
  }, [isTickerPaused, viewModel.timelineItems.length]);

  function scheduleAutoResume() {
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
    }

    resumeTimerRef.current = window.setTimeout(() => {
      setTickerPaused(false);
    }, 1200);
  }

  function normalizeScrollPosition(scroller: HTMLDivElement) {
    const loopWidth = scroller.scrollWidth / 2;
    if (!loopWidth) {
      return;
    }

    if (scroller.scrollLeft < 0) {
      scroller.scrollLeft += loopWidth;
    }

    if (scroller.scrollLeft >= loopWidth) {
      scroller.scrollLeft -= loopWidth;
    }

    scrollPositionRef.current = scroller.scrollLeft;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    setTickerPaused(true);
    isPointerActiveRef.current = true;
    dragStartXRef.current = event.clientX;
    dragStartScrollRef.current = scroller.scrollLeft;
    scrollPositionRef.current = scroller.scrollLeft;
    scroller.setPointerCapture(event.pointerId);

    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    if (!scroller || !isPointerActiveRef.current) {
      return;
    }

    const deltaX = event.clientX - dragStartXRef.current;
    scroller.scrollLeft = dragStartScrollRef.current - deltaX;
    normalizeScrollPosition(scroller);
    scrollPositionRef.current = scroller.scrollLeft;
  }

  function handlePointerRelease(event: ReactPointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    if (!scroller || !isPointerActiveRef.current) {
      return;
    }

    isPointerActiveRef.current = false;
    normalizeScrollPosition(scroller);
    scroller.releasePointerCapture(event.pointerId);
    scheduleAutoResume();
  }

  return (
    <section className="app-panel pointer-events-auto overflow-hidden rounded-[20px] p-1.5" data-testid="wall-display-operations-ticker">
      {viewModel.timelineItems.length ? (
        <div className="relative overflow-hidden rounded-[16px]">
          <div className="wall-display-ticker-edge-left pointer-events-none absolute inset-y-0 left-0 z-10 w-28" />
          <div className="wall-display-ticker-edge-right pointer-events-none absolute inset-y-0 right-0 z-10 w-28" />
          <div
            ref={scrollerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerRelease}
            onPointerCancel={handlePointerRelease}
            className="scrollbar-none touch-none cursor-grab overflow-x-auto active:cursor-grabbing"
          >
            <div className="flex w-max">
              {[0, 1].map((groupIndex) => (
                <div key={groupIndex} className="flex shrink-0 gap-2 pr-2">
                  {scrollingItemsLoop.map((item, index) => (
                    <TimelineItem key={`${groupIndex}-${item.id}-${index}`} item={item} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid h-[46px] place-items-center rounded-[14px] border border-border-subtle bg-panel-muted/70 px-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <Radio className="mx-auto h-5 w-5 text-content-muted" />
            <p className="text-[13px] font-semibold text-content-primary">No fleet data available</p>
          </div>
        </div>
      )}
    </section>
  );
}
