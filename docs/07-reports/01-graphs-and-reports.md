# 07. Graphs And Reports

The reporting area has two routes:

- `/graphs` for dashboard-style operational charts
- `/reports` for generated reports, previews, exports, email payloads, and schedule payloads

Both routes should stay grounded in repository contracts and supported telemetry. Do not build report UI around fixture-only fields.

## Graphs

Graphs is a configurable analytics dashboard.

It includes:

- widget library
- dashboard layout storage
- drag/resize layout controls
- packed and free-placement layout modes
- fleet KPIs
- daily activity
- speed trend and distribution
- vehicle activity
- fleet status
- alerts
- fuel and battery
- tracker health
- telemetry coverage
- driver coverage
- engine load
- odometer widgets
- CSV and JSON export
- print-ready dashboard preview

Main files:

- `src/app/pages/Graphs.tsx`
- `src/app/features/graphs/graphsDashboardModel.ts`
- `src/app/features/graphs/graphDashboardGridLayout.ts`
- `src/app/features/graphs/graphDashboardLayoutStorage.ts`
- `src/app/features/graphs/graphExportService.ts`
- `src/app/features/graphs/components/`

Graph layout preferences are browser-local. Stored layouts should be validated against the supported widget catalog before use.

## Reports

Reports is definition-driven.

It supports:

- searchable report library
- report categories
- vehicle, group, status, and all-vehicle selection
- date period and time-window selection
- Teltonika/OpenRemote parameter selection
- column and chart selection
- grouping and aggregation options
- compatibility and validation messages
- generated previews
- print flow
- CSV, JSON, XLSX, and PDF export
- email payload setup
- recurring schedule payload setup

Main files:

- `src/app/pages/Reports.tsx`
- `src/app/features/reports/reportBuilderViewModel.ts`
- `src/app/features/reports/reportCapabilities.ts`
- `src/app/features/reports/reportValidation.ts`
- `src/app/features/reports/reportPageModel.ts`
- `src/app/features/reports/reportExportService.ts`
- `src/app/features/reports/components/`

## Report Catalog

Shared report definitions live in:

- `src/domain/services/reportCatalog.ts`
- `src/domain/models/reports.ts`

Mock and real repositories import the shared catalog so both modes expose the same report types and output modes.

Definitions can declare:

- report id, name, category, and description
- required and optional vehicle capabilities
- supported/default parameters
- columns
- charts
- grouping and aggregation options
- preview sections
- output modes and export formats
- future OpenRemote mapping notes

Add a new report by extending the shared catalog and repository preview behavior, not by adding one-off page branches.

## Capability Rules

Capabilities are derived from observed vehicle data:

- latest telemetry samples
- Teltonika/OpenRemote attributes
- location data
- alert context

Do not count the full signal catalog as observed vehicle data.

Examples:

- fuel reports require fuel data
- tracker health reports require GNSS/GSM or power data
- driver reports require iButton or driver identification data
- CANBus and temperature stay unavailable until compatible attributes exist

If only some selected vehicles support a report, explain which ones are excluded.

## Preview And Output Rules

Report previews should look like generated reports, not placeholders.

Expected preview content:

- title and generated timestamp
- applied filters
- compatibility warnings
- KPI summary cards
- chart sections
- map or raw-data sections when selected
- table rows using selected columns and parameters
- empty states when no compatible data exists

Output actions:

- Preview updates the page.
- Print uses browser print and print-ready styles.
- Export creates selected CSV, JSON, XLSX, and PDF files.
- Email shows the intended payload but does not send email.
- Schedule shows the intended recurrence payload but does not create backend jobs.

Real mode builds email and schedule payloads too, but does not call OpenRemote notification APIs or persist schedules in this pass.

## Real Mode

Real mode:

- maps current OpenRemote asset telemetry through `OpenRemoteReportsRepository`
- uses shared report definitions and validation rules
- derives capabilities from real asset telemetry and latest samples
- keeps `/graphs` app-safe with empty snapshots when needed
- keeps `/reports` app-safe with empty rows, `--`, and compatibility messages
- does not perform historical aggregation for report previews yet

Missing real telemetry should stay missing. Do not convert absent RPM, odometer, fuel, battery, driver, GSM, or GNSS values into fake zeros.

## Mock Mode

Mock mode:

- uses `src/infrastructure/repositories/mock/fixtures/reportsFixtures.ts`
- builds practical previews from local vehicle and telemetry fixtures
- includes intentionally unavailable reports for compatibility messaging
- creates export payloads locally
- does not send email or create backend schedules

## Testing

Useful focused areas:

- report catalog and capability rules
- report validation
- report export service
- Reports page builder and preview flow
- Graphs dashboard model
- graph export service
- graph print preview

For broad reporting changes, run:

```bash
npm run test -- src/app/features/reports src/app/features/graphs src/app/pages/Reports.test.tsx src/app/pages/Graphs.test.tsx
npm run typecheck
npm run typecheck:mock
```
