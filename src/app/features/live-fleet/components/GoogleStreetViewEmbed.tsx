import { AlertTriangle, MapPinned, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createGoogleStreetViewEmbedUrl } from "../../../config/googleMapsEmbedConfig";

interface GoogleStreetViewEmbedProps {
  vehicleName: string;
  apiKey?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  gpsAccuracyMeters?: number;
  loadTimeoutMs?: number;
}

type StreetViewState = "loading" | "loaded" | "failed";

function StreetViewFallback({
  title,
  description,
  tone = "muted",
}: {
  title: string;
  description: string;
  tone?: "muted" | "warning";
}) {
  return (
    <div className="grid h-[240px] place-items-center px-6 py-5 text-center">
      <div className="flex max-w-[280px] flex-col items-center justify-center">
        <div
          className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border ${
            tone === "warning" ? "border-warning/25 bg-warning/10 text-warning" : "border-border-subtle bg-panel text-content-muted"
          }`}
        >
          {tone === "warning" ? <AlertTriangle className="h-4 w-4" /> : <MapPinned className="h-4 w-4" />}
        </div>
        <p className="mt-4 text-[12px] font-semibold leading-none text-content-primary">{title}</p>
        <p className="mt-2 text-[11px] leading-[1.35] text-content-muted">{description}</p>
      </div>
    </div>
  );
}

export function GoogleStreetViewEmbed({
  vehicleName,
  apiKey,
  latitude,
  longitude,
  heading,
  gpsAccuracyMeters,
  loadTimeoutMs = 10000,
}: GoogleStreetViewEmbedProps) {
  const [state, setState] = useState<StreetViewState>("loading");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isGpsPrecise = gpsAccuracyMeters === undefined || gpsAccuracyMeters <= 80;
  const streetViewUrl = useMemo(
    () =>
      isGpsPrecise
        ? createGoogleStreetViewEmbedUrl({
            apiKey: apiKey ?? "",
            latitude,
            longitude,
            heading,
            pitch: 0,
            fov: 90,
          })
        : null,
    [apiKey, heading, isGpsPrecise, latitude, longitude],
  );

  useEffect(() => {
    if (!streetViewUrl) {
      return undefined;
    }

    setState("loading");
    const timeoutId = window.setTimeout(() => {
      setState((currentState) => (currentState === "loading" ? "failed" : currentState));
    }, loadTimeoutMs);

    return () => window.clearTimeout(timeoutId);
  }, [loadTimeoutMs, streetViewUrl]);

  useEffect(() => {
    const iframe = iframeRef.current;

    if (!iframe || !streetViewUrl) {
      return undefined;
    }

    const handleLoad = () => setState("loaded");
    const handleError = () => setState("failed");

    iframe.addEventListener("load", handleLoad);
    iframe.addEventListener("error", handleError);

    return () => {
      iframe.removeEventListener("load", handleLoad);
      iframe.removeEventListener("error", handleError);
    };
  }, [streetViewUrl]);

  if (!apiKey?.trim()) {
    return (
      <StreetViewFallback
        title="Street View is not configured"
        description="Set VITE_GOOGLE_MAPS_EMBED_API_KEY in local or deployment configuration to enable the Maps Embed API iframe."
      />
    );
  }

  if (!isGpsPrecise) {
    return (
      <StreetViewFallback
        title="Street View hidden"
        description="The current GPS point is not precise enough for a useful street-level view."
      />
    );
  }

  if (!streetViewUrl) {
    return (
      <StreetViewFallback
        title="Street View unavailable"
        description="The current vehicle coordinates are not valid for a Maps Embed API Street View request."
      />
    );
  }

  if (state === "failed") {
    return (
      <StreetViewFallback
        title="Street View could not be loaded"
        description="Verify that the Maps Embed API is enabled, billing and API restrictions are correct, and the browser can reach Google Maps."
        tone="warning"
      />
    );
  }

  return (
    <div className="relative h-[240px] overflow-hidden" data-testid="street-view-frame">
      {state === "loading" ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-panel-muted/90 text-[11px] text-content-muted">
          <span className="inline-flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Loading Street View
          </span>
        </div>
      ) : null}
      <iframe
        ref={iframeRef}
        title={`${vehicleName} street view`}
        src={streetViewUrl}
        className="h-full w-full border-0"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={() => setState("loaded")}
        onError={() => setState("failed")}
      />
    </div>
  );
}
