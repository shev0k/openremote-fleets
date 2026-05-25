/// <reference types="vite/client" />

declare const __OPENREMOTE_FLEETS_DATA_MODE__: "openRemote" | "mock";

interface ImportMetaEnv {
  readonly VITE_DATA_MODE?: "openRemote" | "mock";
  readonly VITE_OR_MANAGER_URL?: string;
  readonly VITE_OR_KEYCLOAK_URL?: string;
  readonly VITE_OR_REALM?: string;
  readonly VITE_OR_CLIENT_ID?: string;
  readonly VITE_GOOGLE_MAPS_EMBED_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
