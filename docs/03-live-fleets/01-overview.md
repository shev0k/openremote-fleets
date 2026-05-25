# 03. Live Fleet

Live Fleet is the main workspace.

It is map-first, then adds fleet search, alerts, selected vehicle context, trip history, playback, quick panels, pinned overlays, and wall display support around that map.

## Entry Points

- route: `/`
- page: `src/app/pages/LiveFleet.tsx`
- shell: `src/app/features/live-fleet/components/LiveFleetPageShell.tsx`
- provider: `src/app/features/live-fleet/providers/LiveFleetWorkspaceProvider.tsx`

`LiveFleet.tsx` should stay thin. Most state belongs in the provider hooks and focused contexts.

## Workspace State

Important provider hooks:

- `useLiveFleetData`
  Loads vehicles and handles route-backed simulation inputs.
- `useLiveFleetSelection`
  Owns selected vehicle, vehicle detail, and selected-route loading.
- `useLiveFleetRoutes`
  Owns current route, historical route, active segment, graph overlay segment, and playback controller.
- `useLiveFleetSimulation`
  Moves mock vehicles along playback routes when mock mode supports it.
- `useLiveFleetRealModeRefresh`
  Refreshes real-mode fleet and route data without fighting playback or timeline scrubbing.
- `useLiveFleetWidgetLayoutState`
  Stores sidebar widget layout and visibility.
- `useLiveFleetOverlayState`
  Manages quick panels, active vehicle overlay, and pinned overlays.

State is split on purpose. Add new state to the narrowest existing context before widening `LiveFleetWorkspaceProvider`.

## Main UI Pieces

- `LiveMapCanvas`
  Shared map, vehicle markers, route segments, map controls, active route segment, and timeline placement.
- `MapControlBar`
  Map type, zoom, reset, live tracking, simulation speed, and workspace toggle.
- `LiveFleetSidebarWorkspace`
  Fleet list, critical alerts, selected-vehicle trip history, and widget arrangement.
- `LiveFleetOverlayLayer`
  Selected vehicle overlay, pinned overlays, quick panels, and graph overlay.
- `VehicleDetailOverlay`
  Tracker identity, operational context, telemetry, alerts, Street View fallback, and graph entry point.
- `LiveTelemetryCard`
  Dense telemetry summary for tracker identity and live metrics.

## Selection Flow

One selected vehicle should drive all related UI.

Normal flow:

1. store selected vehicle id
2. open the detail overlay
3. load vehicle detail
4. load current route history
5. load previous-day route context
6. update map focus once
7. update timeline, sidebar, overlays, and trip panels

Do not create separate selection state in the map, sidebar, and overlay layer.

## Route And Timeline Behavior

Live Fleet and Route Playback share the route/playback domain contracts:

- `src/domain/models/playback.ts`
- `src/domain/models/telemetry.ts`
- `src/app/components/playback/`
- `src/app/components/map/routeSegments/`

Live Fleet markers normally represent the latest known tracker position. Route segments provide recent history around that live marker.

When the timeline is scrubbed into the past:

- selected marker can move to the historical route point
- overlay telemetry should use samples from the same playback timestamp
- returning to the live endpoint restores latest live values
- mock live movement should keep running without overwriting the scrubbed state

Timeline rows use `TelemetrySignalSample`, not mock-only fixture shapes.

## Alerts In Live Fleet

Live Fleet reads alerts from `AlertsContext`.

Real mode trusts unresolved OpenRemote alarm rows from `AlertsRepository`.

Mock mode gates future fixture alerts by simulated vehicle route progress. A future mock alert should not make a vehicle look alerting until the route reaches that alert timestamp.

Alert actions go through:

- `AlertsRepository.updateAlertState(...)`
- `src/app/features/live-fleet/components/AlertStateActionButton.tsx`

Do not add local-only acknowledge or resolve state in Live Fleet.

## Overlays And Quick Panels

Overlay rules:

- keep drag/resize shell logic separate from content
- keep overlay bodies operational, not decorative
- add overlay types through `LiveFleetOverlayLayer`
- keep close/collapse actions inside the overlay header
- use pinned overlays for context that should stay visible while the operator works the map

The selected vehicle overlay should start with the highest-value operational context, then deeper telemetry and tracker attributes.

## Route Playback Page

Route Playback lives at:

- route: `/playback`
- page: `src/app/pages/RoutePlayback.tsx`
- workspace hook: `src/app/features/playback/useRoutePlaybackWorkspace.ts`

Use it for historical route review. It shares map route rendering, timeline pieces, segment graph behavior, alert route markers, and Teltonika timeline signals with Live Fleet.

Real mode builds routes from OpenRemote datapoint history. Mock mode hydrates route fixtures and rebases dates so demos stay useful.

## Wall Display

Wall Display lives at:

- route: `/wall-display`
- page: `src/app/pages/WallDisplay.tsx`
- feature folder: `src/app/features/wall-display/`

It is a standalone operations screen for TVs and shared displays.

It uses:

- shared fleet map components
- `FleetRepository.listVehicles()`
- `FleetLiveStateService` in mock mode for moving vehicle positions
- wall display view-model helpers for fleet metrics and telemetry ticker state

Do not import mock fixtures directly into Wall Display UI.

## Real Vs Mock Behavior

Real mode:

- reads through repositories backed by OpenRemote services and mappers
- refreshes fleet/asset/alert data with polling
- returns safe empty values when Manager data is partial
- does not use mock simulation services

Mock mode:

- reads from local fixtures
- uses `MockLiveFleetSimulationService` for route-backed vehicle movement
- rebases dates at repository read time
- keeps base repositories deterministic

Mock rules and Teltonika mapping details live in:

- [Teltonika and OpenRemote Data](./04-teltonika-openremote-data.md)

## What Not To Do

- Do not call OpenRemote services from Live Fleet components.
- Do not import mock fixtures into Live Fleet UI.
- Do not let playback, selection, overlay, and map focus state drift apart.
- Do not put shared map helpers inside the feature folder.
- Do not add decorative panels that do not help an operator inspect or act.
