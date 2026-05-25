# OpenRemote Fleets

OpenRemote Fleets is a standalone React frontend for fleet operations.

The main screen is map-first: vehicles, live status, route playback, alerts, assets, reports, preferences, and a wall display all sit around the fleet map.

The app can run two ways:

- real mode: connects to OpenRemote Manager, uses Keycloak login, and reads real Manager data
- mock mode: uses local fixtures only, no login, and no Manager calls

## Quick Start

Install dependencies:

```bash
npm install
```

Run real mode:

```bash
npm run dev
```

Real mode expects OpenRemote Manager at `https://localhost`. Vite serves the app at `https://localhost:5173` and proxies `/api`, `/auth`, and `/websocket` to Manager.

Run mock mode:

```bash
npm run dev:mock
```

Mock mode uses `VITE_DATA_MODE=mock`, local fixtures, no Keycloak login, and no Manager traffic. This is the easiest mode for UI review and handoff demos.

Run Storybook:

```bash
npm run storybook
```

Build Storybook:

```bash
npm run build:storybook
```

## Useful Checks

Use the smallest useful command while working:

```bash
npm run test
npm run typecheck
npm run typecheck:mock
npm run build
npm run build:mock
```

Before handoff, run:

```bash
npm run test
npm run typecheck
npm run typecheck:mock
npm run build
npm run check:bundle:real
npm run build:mock
npm run check:bundle:mock
npm run build:storybook
git diff --check
git diff --name-only -- openremote-manager
```

`npm run verify` runs the main app checks, but it does not build Storybook.

## Environment

Real mode starts from `.env.example`:

- `VITE_DATA_MODE=openRemote`
- `VITE_OR_MANAGER_URL`
- `VITE_OR_KEYCLOAK_URL`
- `VITE_OR_REALM`
- `VITE_OR_CLIENT_ID`
- `VITE_GOOGLE_MAPS_EMBED_API_KEY`

For normal local real mode, leave `VITE_OR_MANAGER_URL` and `VITE_OR_KEYCLOAK_URL` blank. Blank values mean the browser stays on the Vite origin and uses the local proxy.

Mock mode starts from `.env.mock`:

- `VITE_DATA_MODE=mock`

`VITE_GOOGLE_MAPS_EMBED_API_KEY` is only needed for the Street View iframe. Keep real keys in ignored local env files or deployment secrets.

## Real Mode Setup

OpenRemote Manager should already be running in Docker at:

```text
https://localhost
```

The app runs at:

```text
https://localhost:5173
```

For Keycloak local redirects, add these to the `openremote` client in the master realm:

- `https://localhost:5173/*`
- `https://localhost:5173/`

Add them to both `Valid redirect URIs` and `Web origins`.

If you intentionally bypass the Vite proxy and point the browser straight at Manager URLs, also configure Manager CORS, for example:

```text
OR_WEBSERVER_ALLOWED_ORIGINS=https://localhost:5173
```

## Where Code Lives

- `src/app/`
  React routes, pages, providers, layout, feature components, and shared UI.
- `src/app/components/map/`
  Shared map components, route rendering, and vehicle display status helpers.
- `src/app/components/shared/`
  Shared panels, controls, dialogs, filters, and app-specific UI primitives.
- `src/app/features/live-fleet/`
  Live Fleet workspace state, map canvas, sidebar widgets, overlays, and route context.
- `src/app/features/playback/`
  Route playback hooks and helpers.
- `src/app/features/alerts/`
  Alert filters and alert display helpers.
- `src/app/features/assets/`
  Asset filters, query hook, and tracker detail UI.
- `src/app/features/graphs/`
  Configurable graph dashboard, layout storage, print, and export helpers.
- `src/app/features/reports/`
  Report builder, validation, preview, and export helpers.
- `src/app/features/wall-display/`
  TV-style wall display view models and UI.
- `src/domain/`
  App-facing models, repository contracts, service contracts, and shared rules.
- `src/infrastructure/openremote/`
  Real OpenRemote runtime, services, repositories, mappers, and shims.
- `src/infrastructure/repositories/mock/`
  Mock repositories and fixtures.
- `src/infrastructure/services/`
  Real/mock service composition and Vite-selected factory entrypoints.
- `src/styles/`
  Tailwind entrypoint, semantic tokens, fonts, and shared app classes.
- `teltonika-emulator/`
  Local Teltonika FMC003 emulator for testing the real Manager path without hardware.

## OpenRemote Boundaries

Keep this rule in mind:

```text
React UI -> domain contracts -> infrastructure repositories -> OpenRemote services -> Manager REST API
```

Do:

- put raw Manager calls in `src/infrastructure/openremote/services/`
- put OpenRemote-to-app mapping in `src/infrastructure/openremote/repositories/`
- put app-facing contracts in `src/domain/`
- keep mock behavior in `src/infrastructure/repositories/mock/`
- keep mock mode working when adding real mode features
- use OpenRemote package types from `@openremote/model` for real OpenRemote objects

Do not:

- call `manager.rest.api.*` from React components, pages, or layout files
- mix mock fixtures into real OpenRemote services
- add mock-only services to real mode wiring
- copy OpenRemote DTOs into local types when `@openremote/model` already has them
- edit `openremote-manager/`

Missing real Manager data should become safe empty state, not a broken app shell.

## Teltonika Emulator

The emulator lives in `teltonika-emulator/`.

Use it when you want to test the real OpenRemote path without a physical tracker:

```text
emulated FMC003 -> OpenRemote Manager -> openremote-fleets real mode
```

Start it from `teltonika-emulator/`:

```powershell
.\run.ps1
```

or:

```bash
python3 run.py
```

If no local config exists, it starts built-in demo trackers for Atlas 12, Harbor 07, Delta 24, Nimbus 03, and Courier 19.

For the emulator runbook and protocol notes, read:

- [Teltonika Emulator README](./teltonika-emulator/README.md)
- [Protocol and Manager notes](./teltonika-emulator/docs/01-protocol-and-manager-notes.md)

## Documentation

Read the docs in this order:

1. [Foundation](./docs/01-foundation/01-architecture.md)
2. [UI System](./docs/02-ui-system/01-ui-system.md)
3. [Live Fleet](./docs/03-live-fleets/01-overview.md)
4. [Teltonika and OpenRemote Data](./docs/03-live-fleets/04-teltonika-openremote-data.md)
5. [Domain Models and Status Rules](./docs/04-domain/01-vehicle-statuses.md)
6. [Alerts](./docs/05-alerts/01-operational-alerts.md)
7. [Assets](./docs/06-assets/01-assets-telemetry-workspace.md)
8. [Graphs and Reports](./docs/07-reports/01-graphs-and-reports.md)

Storybook has the same handoff material in a more visual format:

```bash
npm run storybook
```
