# 04. Domain Models And Status Rules

The domain layer is the app's shared language.

Use it for app-facing models, repository contracts, service contracts, and rules that apply to both real and mock mode.

## Why Domain Exists

OpenRemote has its own model types. Fleets still needs app-specific shapes.

Think of it like this:

```text
@openremote/model = raw Manager language
src/domain = Fleets app language
infrastructure repositories = translators
```

Keep a local domain model when it is:

- a UI view model
- a combined shape from several backend sources
- a stable contract used by both real and mock repositories
- a shared rule that the UI should not duplicate

Do not create a local copy of an OpenRemote DTO just because it is convenient.

## Main Domain Areas

- `src/domain/models/vehicle.ts`
  Vehicle and vehicle detail models.
- `src/domain/models/alerts.ts`
  Operational alert model.
- `src/domain/models/assets.ts`
  Tracker/asset inspection model.
- `src/domain/models/playback.ts`
  Routes, trip segments, markers, playback metadata.
- `src/domain/models/telemetry.ts`
  Signal definitions and signal samples.
- `src/domain/models/reports.ts`
  Report definitions, requests, previews, outputs, and schedule/email payloads.
- `src/domain/models/preferences.ts`
  App display preferences.
- `src/domain/models/teltonika.ts`
  Teltonika attribute snapshots.
- `src/domain/models/teltonikaCatalog.ts`
  Shared selected Teltonika attribute and signal catalog.

Repository contracts live in:

- `src/domain/repositories/`

App service contracts live in:

- `src/domain/services/`

## Vehicle Operational Status

Core status derivation lives in:

- `src/domain/models/vehicleOperationalStatus.ts`

Display metadata lives in:

- `src/app/components/map/vehicleDisplayStatus.tsx`

Map-marker-only status resolution lives in:

- `src/app/components/map/vehicleMapMarkerStatus.ts`

## Core Statuses

Fleets uses these core vehicle statuses:

- `alerting`
- `moving`
- `idling`
- `parked`
- `stationary`
- `offline`

Priority:

1. `alerting`
2. explicit `offline`
3. `parked`
4. `idling`
5. `stationary`
6. `moving`

## What They Mean

`alerting`

Use when a vehicle has active unresolved alert context. This wins over normal movement state.

`moving`

Use when movement is true or speed is above zero.

`idling`

Use when the vehicle is stationary and ignition or engine state is on.

`parked`

Use when the vehicle is stationary and ignition is off.

`stationary`

Use when the vehicle is not moving but ignition is unknown.

`offline`

Use only when the tracker or device is unavailable. Missing GPS, poor GNSS, sleep mode, movement off, or ignition off do not make a tracker offline by themselves.

## Map Marker States

Map markers may add presentation states on top of the core status:

- `driverBreak`
- `signalDegraded`
- `stopped`
- route alarm marker state
- route offline marker state

These are map/playback presentation states. They should not become new core statuses unless the product needs them across the whole app.

Poor GSM or GNSS quality is `signalDegraded`, not `offline`.

Ignition off with zero speed is `parked`, not `offline`.

## Reuse

Use shared status helpers in:

- map markers
- vehicle overlays
- fleet lists
- filters
- reports/status scopes
- wall display timeline cards

Do not hardcode status labels, colors, or priority rules in individual features.

## Adding A New Status

If you add a real new status:

1. update the domain status type/rules
2. update display metadata
3. update marker behavior if needed
4. update tests
5. update this doc

Add a new status only when it means something different to operators.
