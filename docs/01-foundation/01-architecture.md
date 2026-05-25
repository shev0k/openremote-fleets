# 01. Foundation

This is the practical architecture guide. Read this when you need to know where code goes, how real and mock mode stay apart, or how to run a safe handoff check.

## The Big Shape

The app has three main layers:

- `src/app/`
  React UI, routes, providers, page state, feature components, and shared app components.
- `src/domain/`
  App-specific models, repository interfaces, service contracts, and shared rules.
- `src/infrastructure/`
  Real OpenRemote code, mock repositories, runtime setup, mappers, and service composition.

The UI should depend on domain contracts. It should not depend on OpenRemote SDK details.

Normal data flow:

```text
React UI
  -> domain repository or service contract
  -> infrastructure repository
  -> OpenRemote service or mock repository
  -> mapped app model
```

## Real And Mock Mode

The app has one UI surface and two implementation graphs.

Real mode:

- command: `npm run dev`
- data mode: `VITE_DATA_MODE=openRemote`
- uses OpenRemote Manager and Keycloak
- imports the real session provider
- imports the real app service factory
- calls Manager through `src/infrastructure/openremote/`

Mock mode:

- command: `npm run dev:mock`
- data mode: `VITE_DATA_MODE=mock`
- uses local fixtures only
- no login
- no Manager calls
- imports the mock session provider and mock app service factory

Vite selects these mode-specific files through aliases:

- `#app-service-factory`
- `#app-session-provider`

Keep those aliases build-selected. Do not replace them with runtime `if` statements that import both modes.

The boundary is guarded by `src/infrastructure/architectureBoundaries.test.ts` and bundle checks:

```bash
npm run check:bundle:real
npm run check:bundle:mock
```

## App Startup

Provider order matters:

1. `AppThemeProvider`
2. `AppSessionProvider`
3. `AppServicesProvider`
4. `AppPreferencesProvider`
5. `AlertsProvider`
6. `RouterProvider`

Why:

- theme tokens exist before UI renders
- session/runtime state exists before services need it
- preferences can read app services
- routes only see an already-built service container

Real startup:

1. `AppSessionProvider.tsx` resolves to `AppSessionProvider.openRemote.tsx`.
2. `OpenRemoteRuntime` calls `manager.init(...)` from `@openremote/core`.
3. Keycloak handles login.
4. `OpenRemoteSessionService` builds the app session snapshot.
5. `appServices.ts` resolves to the real factory.
6. Feature code reads domain contracts.

Mock startup:

1. `AppSessionProvider.tsx` resolves to `AppSessionProvider.mock.tsx`.
2. The mock provider returns an inert local session.
3. `appServices.ts` resolves to the mock factory.
4. Feature code reads fixture-backed repositories.

## OpenRemote Integration

Use the official packages:

- `@openremote/core` for Manager runtime, auth, events, and REST setup
- `@openremote/model` for OpenRemote model types

OpenRemote-specific code lives under:

- `src/infrastructure/openremote/runtime/`
  Config, Manager bootstrap, session state, and shared runtime access.
- `src/infrastructure/openremote/services/`
  Raw Manager calls through `manager.rest.api.*`.
- `src/infrastructure/openremote/repositories/`
  Mapping from raw Manager responses into Fleets domain contracts.

Current real service areas:

- fleet assets and tracker telemetry
- playback route history and datapoints
- alerts and alarm state updates
- assets/tracker inspection
- reports and graph snapshots
- preferences seeded from Manager appearance

Common Manager resources in use:

- `AssetResource.queryAssets(...)`
- `AssetResource.get(...)`
- `AssetDatapointResource.getDatapoints(...)`
- `AlarmResource.getAlarms(...)`
- `AlarmResource.getAlarm(...)`
- `AlarmResource.updateAlarm(...)`
- `ConfigurationResource.getManagerConfig(...)`

Real repositories should return safe fallbacks when Manager data is missing or partial. Empty arrays, `null`, `--`, and empty-state UI are better than breaking the shell.

## Local Real Mode

OpenRemote Manager should run at:

```text
https://localhost
```

Vite serves Fleets at:

```text
https://localhost:5173
```

Vite proxies these paths to Manager:

- `/api`
- `/auth`
- `/websocket`

This keeps the browser same-origin during local development.

For Keycloak, add these to the `openremote` client:

- `https://localhost:5173/*`
- `https://localhost:5173/`

Add them to both `Valid redirect URIs` and `Web origins`.

Only set direct OpenRemote URLs when you want to bypass the proxy:

- `VITE_OR_MANAGER_URL`
- `VITE_OR_KEYCLOAK_URL`

## Where To Put New Code

- New route page: `src/app/pages/`
- Feature state: `src/app/features/<feature>/providers/`
- Feature UI: `src/app/features/<feature>/components/`
- Shared UI: `src/app/components/shared/`
- Shared map/status behavior: `src/app/components/map/`
- Shared playback UI: `src/app/components/playback/`
- App-facing model or contract: `src/domain/`
- Raw OpenRemote call: `src/infrastructure/openremote/services/`
- OpenRemote-to-app mapper or repository: `src/infrastructure/openremote/repositories/`
- Mock fixture or mock implementation: `src/infrastructure/repositories/mock/`
- Real/mock service wiring: `src/infrastructure/services/`

If a type is an OpenRemote object, check `@openremote/model` first. If a type is an app-specific view model or combined UI shape, keep it in `src/domain/`.

## Frontend Rules

Keep React components focused on UI.

Good split:

- page: route-level composition
- provider/hook: feature state and orchestration
- component: rendering and local interaction
- repository: app-facing data contract
- service: raw Manager work

Do not put backend calls in render-heavy UI files.

Use clear names and keep files focused. Add comments only for tricky state logic, backend boundaries, important TODOs, or unusual browser/SDK behavior.

## Deployment

The current public demo target is a Cloudflare Workers static-assets deployment in mock mode.

Use:

```bash
npm run build:mock
npx wrangler deploy
```

`wrangler.jsonc` points Workers at `./dist` and enables SPA fallback for browser routes.

For the mock demo, set:

- `VITE_DATA_MODE=mock`
- `VITE_GOOGLE_MAPS_EMBED_API_KEY` only if Street View should work

Do not set real OpenRemote URL variables for the mock demo.

Before sharing a demo URL, check at least:

```bash
npm run test
npm run typecheck
npm run typecheck:mock
npm run build:mock
npm run check:bundle:mock
```

Then smoke these routes:

- `/`
- `/playback`
- `/preferences`
- `/wall-display`

## Handoff Checks

For broad changes, run:

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

There is no lint or formatter script at the time this doc was cleaned up.

## Do Not Do These

- Do not edit `openremote-manager/`.
- Do not call `manager.rest.api.*` from React components.
- Do not mix mock fixtures into real OpenRemote services.
- Do not wire mock-only services into real mode.
- Do not add local OpenRemote DTO copies when `@openremote/model` already has the type.
- Do not turn a provider or service into one giant catch-all store.
