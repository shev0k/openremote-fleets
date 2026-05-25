interface SizeInvalidatingMap {
  invalidateSize: (options?: { pan?: boolean }) => void;
}

export function attachMapSizeInvalidation(map: SizeInvalidatingMap, container: HTMLElement): () => void {
  const invalidate = () => {
    map.invalidateSize({ pan: false });
  };

  const timers = [window.setTimeout(invalidate, 60), window.setTimeout(invalidate, 160), window.setTimeout(invalidate, 320)];
  const frame = window.requestAnimationFrame ? window.requestAnimationFrame(invalidate) : null;
  const ResizeObserverConstructor = globalThis.ResizeObserver;
  const resizeObserver = ResizeObserverConstructor ? new ResizeObserverConstructor(invalidate) : null;

  resizeObserver?.observe(container);
  window.addEventListener("resize", invalidate);

  return () => {
    timers.forEach((timer) => window.clearTimeout(timer));
    if (frame !== null && window.cancelAnimationFrame) {
      window.cancelAnimationFrame(frame);
    }
    resizeObserver?.disconnect();
    window.removeEventListener("resize", invalidate);
  };
}
