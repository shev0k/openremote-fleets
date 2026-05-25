# 06. Assets

The Assets page is for tracker inspection and telemetry context.

It helps engineers and operators see what tracker data Fleets knows about. It is not a device provisioning or configuration screen.

## What The Page Shows

- linked vehicle identity
- tracker IMEI
- OpenRemote asset id
- connection status
- GSM quality
- battery level
- last sync time
- protocol, codec, model, firmware, and metadata
- Teltonika attributes when available

## OpenRemote Boundary

These workflows stay in OpenRemote Manager:

- provision device
- reboot tracker
- configure tracker
- generated provisioning artifacts
- full device-management forms

Fleets should show tracker state and operational context unless a later product decision changes that boundary.

## Data Contract

Asset data uses:

- `src/domain/models/assets.ts`
- `src/domain/repositories/assetsRepository.ts`

Teltonika attributes are optional. Real customer realms may expose only part of the selected catalog.

## Main Files

- `src/app/pages/AssetsAdmin.tsx`
  Route page.
- `src/app/features/assets/useAssetsQuery.ts`
  Repository query and refresh behavior.
- `src/app/features/assets/assetFilters.ts`
  Shared filter logic.
- `src/app/features/assets/assetValueFormat.ts`
  Display formatting.
- `src/app/features/assets/components/AssetDetailsPanel.tsx`
  Detail panel.
- `src/infrastructure/openremote/repositories/OpenRemoteAssetsRepository.ts`
  Real implementation.
- `src/infrastructure/repositories/mock/mockAssetsRepository.ts`
  Mock implementation.

## Filtering

Filters include:

- status
- linked vehicle
- tracker IMEI or search text
- tracker model
- GSM quality
- battery state
- last sync window

Use `assetFilters.ts` instead of duplicating filter rules inside page components.

## Attribute Display Rules

Display Teltonika data from:

```text
asset.teltonika.attributes
```

Rules:

- show known operational attributes first
- tolerate missing attributes
- show unknown remaining attributes in a stable order
- use `displayName`, `avlId`, `value`, and `unit`
- round numeric noise so Manager floating-point details do not leak into the UI
- do not hardcode customer-only attributes into reusable components

Useful priority attributes include:

- GNSS HDOP
- RPM
- voltages
- fuel
- odometer
- mileage
- battery
- GSM
- protocol
- codec

## Real Mode

Real mode:

- reads `TeltonikaTrackerAsset` assets through OpenRemote services
- maps Manager asset data into `AssetDevice`
- derives linked vehicle identity and tracker health fields
- refreshes through polling
- keeps Manager calls out of React components
- tolerates partial assets and missing optional attributes

OpenRemote websocket asset or attribute subscriptions are not wired into the Assets page yet.

## Mock Mode

Mock mode:

- uses `src/infrastructure/repositories/mock/fixtures/assetsFixtures.ts`
- returns cloned fixtures from `MockAssetsRepository`
- includes dense Teltonika attribute samples for demos and tests

## Rules

- Keep provisioning/configuration workflows out of Fleets.
- Keep tracker display grounded in the domain `AssetDevice` model.
- Keep attribute rendering optional-tolerant.
- Do not import mock fixtures into Assets UI.
- Do not edit `openremote-manager/`.
