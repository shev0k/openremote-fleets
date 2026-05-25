export interface GoogleMapsEmbedEnv {
  VITE_GOOGLE_MAPS_EMBED_API_KEY?: string;
}

export type GoogleMapsEmbedConfig =
  | {
      status: "configured";
      apiKey: string;
    }
  | {
      status: "missing";
    };

export interface GoogleStreetViewEmbedRequest {
  apiKey: string;
  latitude: number;
  longitude: number;
  heading?: number;
  pitch?: number;
  fov?: number;
}

function isValidLatitude(value: number) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function normalizeHeading(value?: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return ((value ?? 0) % 360 + 360) % 360;
}

function clamp(value: number | undefined, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value ?? fallback));
}

export function resolveGoogleMapsEmbedConfig(env: GoogleMapsEmbedEnv = import.meta.env): GoogleMapsEmbedConfig {
  const apiKey = env.VITE_GOOGLE_MAPS_EMBED_API_KEY?.trim();

  if (!apiKey) {
    return { status: "missing" };
  }

  return {
    status: "configured",
    apiKey,
  };
}

export function createGoogleStreetViewEmbedUrl(request: GoogleStreetViewEmbedRequest): string | null {
  const apiKey = request.apiKey.trim();

  if (!apiKey || !isValidLatitude(request.latitude) || !isValidLongitude(request.longitude)) {
    return null;
  }

  const url = new URL("https://www.google.com/maps/embed/v1/streetview");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("location", `${request.latitude},${request.longitude}`);
  url.searchParams.set("heading", String(normalizeHeading(request.heading)));
  url.searchParams.set("pitch", String(clamp(request.pitch, -90, 90, 0)));
  url.searchParams.set("fov", String(clamp(request.fov, 10, 100, 75)));

  return url.toString();
}
