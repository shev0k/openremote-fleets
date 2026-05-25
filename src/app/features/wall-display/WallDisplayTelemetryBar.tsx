import {
  Activity,
  AlertTriangle,
  Battery,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Clock3,
  Eye,
  EyeOff,
  Fuel,
  Gauge,
  GripVertical,
  Radio,
  Route,
  Satellite,
  Settings2,
  Signal,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { CSSProperties, DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { WallDisplayCard, WallDisplayViewModel } from "./wallDisplayViewModel";

interface WallDisplayTelemetryBarProps {
  viewModel: WallDisplayViewModel;
}

const metricIcons: Record<string, typeof Route> = {
  mileage: Route,
  consumption: Fuel,
  occupancy: Activity,
  alarms: AlertTriangle,
  connected: Radio,
  moving: Gauge,
  avgSpeed: Gauge,
  fuel: Fuel,
  battery: Battery,
  externalVoltage: Zap,
  engineRpm: Gauge,
  gsm: Signal,
  gnss: Radio,
  satellites: Satellite,
  odometer: Route,
  freshness: Clock3,
  drivers: UserRound,
};

const toneClassNames: Record<WallDisplayCard["tone"], string> = {
  brand: "border-brand/30 bg-brand/12 text-brand",
  info: "border-info/25 bg-info/10 text-info",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/12 text-danger",
  muted: "border-border-subtle bg-panel-muted text-content-muted",
};

const TELEMETRY_TICKER_SCROLL_PIXELS_PER_SECOND = 64;

const valueWidthClassNames: Record<string, string> = {
  mileage: "min-w-[86px]",
  consumption: "min-w-[98px]",
  occupancy: "min-w-[52px]",
  alarms: "min-w-[38px]",
  connected: "min-w-[38px]",
  moving: "min-w-[58px]",
  freshness: "min-w-[58px]",
  drivers: "min-w-[38px]",
  avgSpeed: "min-w-[70px]",
  fuel: "min-w-[48px]",
  battery: "min-w-[48px]",
  externalVoltage: "min-w-[62px]",
  engineRpm: "min-w-[76px]",
  gsm: "min-w-[52px]",
  gnss: "min-w-[78px]",
  satellites: "min-w-[38px]",
  odometer: "min-w-[96px]",
};

function moveItem(items: string[], itemId: string, direction: "up" | "down") {
  const index = items.indexOf(itemId);
  if (index < 0) {
    return items;
  }

  const targetIndex = direction === "up" ? Math.max(0, index - 1) : Math.min(items.length - 1, index + 1);
  if (targetIndex === index) {
    return items;
  }

  const nextItems = items.slice();
  const [item] = nextItems.splice(index, 1);
  nextItems.splice(targetIndex, 0, item);
  return nextItems;
}

function moveItemToIndex(items: string[], itemId: string, targetIndex: number) {
  const index = items.indexOf(itemId);
  if (index < 0 || index === targetIndex) {
    return items;
  }

  const nextItems = items.slice();
  const [item] = nextItems.splice(index, 1);
  nextItems.splice(targetIndex, 0, item);
  return nextItems;
}

function TelemetryCard({ card }: { card: WallDisplayCard }) {
  const Icon = metricIcons[card.id] ?? Gauge;
  const valueWidthClassName = valueWidthClassNames[card.id] ?? "min-w-[64px]";

  return (
    <div
      className="min-h-[50px] w-max shrink-0 rounded-[14px] border border-border-subtle bg-panel-muted/92 px-3 pb-2 pt-3 shadow-sm backdrop-blur-xl"
      data-testid={`wall-display-telemetry-card-${card.id}`}
      data-card-id={card.id}
    >
      <div className="flex items-center gap-2.5 whitespace-nowrap">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${toneClassNames[card.tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <span className="block text-[9px] font-semibold uppercase leading-none tracking-[0.12em] text-content-muted">{card.label}</span>
          <span className="mt-1 block text-[10px] font-normal leading-none text-content-muted">{card.detail}</span>
        </div>
        <span
          className={`ml-1 shrink-0 rounded-full border border-border-subtle bg-panel px-2.5 py-1 text-center text-[13px] font-semibold leading-none tabular-nums text-content-primary ${valueWidthClassName}`}
        >
          {card.value}
        </span>
      </div>
    </div>
  );
}

export function WallDisplayTelemetryBar({ viewModel }: WallDisplayTelemetryBarProps) {
  const allCards = useMemo(() => [...viewModel.metricCards, ...viewModel.telemetryCards], [viewModel.metricCards, viewModel.telemetryCards]);
  const allCardIds = useMemo(() => allCards.map((card) => card.id), [allCards]);
  const [orderedCardIds, setOrderedCardIds] = useState<string[]>(allCardIds);
  const [visibleCardIds, setVisibleCardIds] = useState<string[]>(allCardIds);
  const [isConfigOpen, setConfigOpen] = useState(false);
  const [telemetryScale, setTelemetryScale] = useState(1);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dropTargetCardId, setDropTargetCardId] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const isPointerActiveRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const scrollPositionRef = useRef(0);
  const resumeTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastAnimationTimeRef = useRef<number | null>(null);
  const [isTickerPaused, setTickerPaused] = useState(false);

  useEffect(() => {
    setOrderedCardIds((currentIds) => {
      const keptIds = currentIds.filter((id) => allCardIds.includes(id));
      const addedIds = allCardIds.filter((id) => !keptIds.includes(id));
      return [...keptIds, ...addedIds];
    });
    setVisibleCardIds((currentIds) => {
      const keptIds = currentIds.filter((id) => allCardIds.includes(id));
      const addedIds = allCardIds.filter((id) => !keptIds.includes(id));
      return [...keptIds, ...addedIds];
    });
  }, [allCardIds]);

  const orderedCards = orderedCardIds.map((id) => allCards.find((card) => card.id === id)).filter((card): card is WallDisplayCard => Boolean(card));
  const visibleCards = orderedCards.filter((card) => visibleCardIds.includes(card.id));
  const tickerCardsLoop = useMemo(() => {
    const repeatCount = Math.max(6, Math.ceil(28 / Math.max(1, visibleCards.length)));
    return Array.from({ length: repeatCount }).flatMap(() => visibleCards);
  }, [visibleCards]);

  useEffect(() => {
    if (!visibleCards.length) {
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
          scrollPositionRef.current += TELEMETRY_TICKER_SCROLL_PIXELS_PER_SECOND * deltaSeconds;

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
  }, [isTickerPaused, visibleCards.length]);

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

  function handleTickerPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
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

  function handleTickerPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    if (!scroller || !isPointerActiveRef.current) {
      return;
    }

    scroller.scrollLeft = dragStartScrollRef.current - (event.clientX - dragStartXRef.current);
    normalizeScrollPosition(scroller);
    scrollPositionRef.current = scroller.scrollLeft;
  }

  function handleTickerPointerRelease(event: ReactPointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    if (!scroller || !isPointerActiveRef.current) {
      return;
    }

    isPointerActiveRef.current = false;
    normalizeScrollPosition(scroller);
    scroller.releasePointerCapture(event.pointerId);
    scheduleAutoResume();
  }

  function handleResizeStart(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const initialScale = telemetryScale;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextScale = Math.min(1.35, Math.max(0.78, initialScale + (moveEvent.clientX - startX) / 420));
      setTelemetryScale(Number(nextScale.toFixed(2)));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function toggleVisibility(cardId: string) {
    setVisibleCardIds((currentIds) => {
      if (currentIds.includes(cardId)) {
        return currentIds.filter((id) => id !== cardId);
      }

      return [...currentIds, cardId];
    });
  }

  function handleConfigDrop(targetCardId: string, targetIndex: number) {
    if (!draggedCardId || draggedCardId === targetCardId) {
      setDraggedCardId(null);
      setDropTargetCardId(null);
      return;
    }

    setOrderedCardIds((currentIds) => moveItemToIndex(currentIds, draggedCardId, targetIndex));
    setDraggedCardId(null);
    setDropTargetCardId(null);
  }

  return (
    <div
      className="wall-display-telemetry-scale-frame mx-auto transition-transform duration-200"
      style={{ "--wall-display-telemetry-scale": telemetryScale, width: `${100 / telemetryScale}%` } as CSSProperties}
      data-testid="wall-display-telemetry-scale-frame"
    >
      <section className="app-panel pointer-events-auto relative rounded-[20px] p-2.5">
        <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-1">
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.22em] text-content-muted">Fleet telemetry</h2>
            <p className="mt-0.5 hidden text-[11px] text-content-secondary md:block">OpenRemote state and Teltonika tracker attributes.</p>
          </div>
          <div className="justify-self-center rounded-full border border-border-subtle bg-panel-muted px-3 py-1.5 text-[12px] font-semibold text-content-primary">
            <div className="flex items-center gap-2">
              <Clock3 className="h-3.5 w-3.5 text-brand" />
              Updated {viewModel.generatedAtLabel}
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <div className="app-control flex h-8 items-center gap-2 rounded-full px-2.5 text-[11px] font-semibold text-content-secondary">
              <span className="hidden sm:inline">Scale</span>
              <span className="text-content-primary">{Math.round(telemetryScale * 100)}%</span>
              <div className="flex cursor-ew-resize items-center gap-1" onPointerDown={handleResizeStart} title="Scale telemetry section">
                <ChevronLeft className="h-3 w-3" />
                <div className="resize-indicator-track flex h-2 w-14 items-center justify-center rounded-full border border-border-strong bg-panel">
                  <div className="h-1 w-9 rounded-full bg-brand" />
                </div>
                <ChevronRight className="h-3 w-3" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConfigOpen((isOpen) => !isOpen)}
              className="app-control inline-flex h-8 items-center gap-2 rounded-full px-3 text-[12px] font-semibold"
              aria-label="Configure telemetry"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Configure
            </button>
          </div>
        </div>

        {isConfigOpen ? (
          <div
            className="app-overlay absolute bottom-full right-0 z-[1500] mb-3 flex h-[560px] max-h-[calc(100vh-160px)] w-[340px] max-w-[calc(100vw-3rem)] flex-col rounded-[24px] p-4"
            data-testid="wall-display-telemetry-config"
          >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-content-muted">Telemetry row</p>
              <h3 className="mt-1 text-[15px] font-semibold text-content-primary">Show, hide, and reorder metrics</h3>
            </div>
            <button type="button" onClick={() => setConfigOpen(false)} className="app-control flex h-8 w-8 items-center justify-center rounded-full">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="brand-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {orderedCards.map((card, index) => {
              const isVisible = visibleCardIds.includes(card.id);

              return (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => setDraggedCardId(card.id)}
                  onDragEnd={() => {
                    setDraggedCardId(null);
                    setDropTargetCardId(null);
                  }}
                  onDragOver={(event: ReactDragEvent<HTMLDivElement>) => {
                    event.preventDefault();
                    if (draggedCardId && draggedCardId !== card.id) {
                      setDropTargetCardId(card.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dropTargetCardId === card.id) {
                      setDropTargetCardId(null);
                    }
                  }}
                  onDrop={(event: ReactDragEvent<HTMLDivElement>) => {
                    event.preventDefault();
                    handleConfigDrop(card.id, index);
                  }}
                  className={`flex cursor-grab items-center gap-2 rounded-[16px] border px-3 py-2.5 transition-colors active:cursor-grabbing ${
                    dropTargetCardId === card.id ? "border-brand/40 bg-brand/10" : "border-border-subtle bg-panel-muted"
                  } ${draggedCardId === card.id ? "opacity-70" : ""}`}
                  data-testid={`wall-display-telemetry-config-row-${card.id}`}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-content-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-content-primary">{card.label}</p>
                    <p className="mt-0.5 truncate text-[11px] text-content-muted">{card.detail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOrderedCardIds((currentIds) => moveItem(currentIds, card.id, "up"))}
                    disabled={index === 0}
                    className="app-control flex h-8 w-8 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40"
                    title={`Move ${card.label} up`}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderedCardIds((currentIds) => moveItem(currentIds, card.id, "down"))}
                    disabled={index === orderedCards.length - 1}
                    className="app-control flex h-8 w-8 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40"
                    title={`Move ${card.label} down`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleVisibility(card.id)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${isVisible ? "bg-brand text-brand-foreground" : "app-control"}`}
                    title={isVisible ? `Hide ${card.label}` : `Show ${card.label}`}
                  >
                    {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              );
            })}
          </div>
          </div>
        ) : null}

        <div className="relative -mx-2.5 overflow-hidden" data-testid="wall-display-telemetry-ticker">
          {visibleCards.length ? (
            <>
              <div className="wall-display-ticker-edge-left pointer-events-none absolute inset-y-0 left-0 z-10 w-16" />
              <div className="wall-display-ticker-edge-right pointer-events-none absolute inset-y-0 right-0 z-10 w-16" />
              <div
                ref={scrollerRef}
                onPointerDown={handleTickerPointerDown}
                onPointerMove={handleTickerPointerMove}
                onPointerUp={handleTickerPointerRelease}
                onPointerCancel={handleTickerPointerRelease}
                className="scrollbar-none touch-none cursor-grab overflow-x-auto active:cursor-grabbing"
              >
                <div className="flex w-max">
                  {[0, 1].map((groupIndex) => (
                    <div key={groupIndex} className="flex shrink-0 gap-2 pr-2">
                      {tickerCardsLoop.map((card, index) => (
                        <TelemetryCard key={`${groupIndex}-${card.id}-${index}`} card={card} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div
              className="mx-2.5 flex min-h-[54px] items-center justify-center rounded-[16px] border border-dashed border-border-subtle bg-panel-muted/70 px-4 text-[13px] font-semibold text-content-secondary"
              data-testid="wall-display-telemetry-empty"
            >
              No telemetry metrics visible
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
