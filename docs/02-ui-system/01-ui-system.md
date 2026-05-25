# 02. UI System

This page is the practical UI guide. Use it when adding screens, controls, Storybook examples, or shared components.

## Main Idea

Fleets is an operations app, not a marketing site.

The UI should feel calm, dense, readable, and map-first. Use restrained surfaces, clear spacing, and semantic tokens before adding custom styling.

The main theme files are:

- `src/styles/theme.css`
- `src/styles/index.css`
- `src/app/providers/AppPreferencesProvider.tsx`

## Theme Tokens

Use semantic tokens and shared classes:

- `bg-panel`
- `bg-panel-muted`
- `text-content-primary`
- `text-content-secondary`
- `text-content-muted`
- `border-border-subtle`
- `bg-brand`
- `text-danger`
- `text-warning`

Shared surface classes:

- `app-panel`
- `app-panel-muted`
- `app-overlay`
- `app-control`
- `app-control-active`

Avoid reusable UI with random hex colors. Raw colors are fine for data visualization when the color carries data meaning, such as map route bands, chart series, or marker policies.

## Light, Dark, Acrylic, And Solid

The app supports:

- light mode
- dark mode
- acrylic surfaces
- solid surfaces

Dark mode should stay readable. Do not make it pure black unless a very local surface needs extra contrast.

Acrylic mode is part of the product feel. If a component sits inside an acrylic area, use the existing shared classes instead of flattening it into a plain box.

## Shared Components

Check these before creating a new reusable component:

- `PanelCard`
- `MetricTileCard`
- `SelectionDropdown`
- `SegmentedControl`
- `ToolbarSearchField`
- `PageHeaderPanel`
- `FilterBar`
- `DialogFrame`

Shared components live in:

- `src/app/components/shared/`

Shared map components live in:

- `src/app/components/map/`

Feature-only reusable pieces should stay in the feature folder until reuse across features is real.

## App Shell

The main shell is:

- `src/app/components/Layout.tsx`

It owns:

- top navigation
- route outlet
- global popovers
- compact navigation
- current app brand from preferences

`/wall-display` is different. It is standalone and is not wrapped by the normal app shell.

## Desktop-Only Gate

The app targets desktop workstations.

`src/app/App.tsx` renders `DesktopOnlyOverlay` outside the router. That gate applies to real mode, mock mode, normal routes, and standalone routes.

Phone and tablet layouts are not currently supported.

## Preferences And Branding

The Preferences page owns Fleets display overrides:

- app name
- logo and favicon
- theme colors
- map marker and route colors
- time format
- default map layer

Real mode seeds preferences from OpenRemote Manager appearance when available. Saves are browser-local Fleets overrides; they do not write appearance back to Manager.

Preference storage is scoped by data mode, Manager URL, and realm so mock branding cannot hide real-mode organization branding.

## Map UI Rules

Live Fleet should keep the map as the main workspace.

Rules:

- map controls should stay compact
- overlays should help operators act or inspect
- sidebar widgets should support the map, not replace it
- shared map helpers belong in `src/app/components/map/`
- Leaflet setup and cleanup should stay out of render-heavy business components

Vehicle display status helpers live in:

- `src/app/components/map/vehicleDisplayStatus.tsx`
- `src/app/components/map/vehicleMapMarkerStatus.ts`

## Storybook

Storybook is the visual handoff and component preview surface.

Run it with:

```bash
npm run storybook
```

Build it with:

```bash
npm run build:storybook
```

Storybook docs live in:

- `docs/storybook/`

Storybook config lives in:

- `.storybook/`

Keep examples fixture-driven and local. They should not require OpenRemote Manager or login.

When adding Storybook content:

- group docs by product topic, not by random component lists
- import `src/styles/index.css` through the preview config
- keep aliases aligned with Vite
- use mock service/session aliases
- keep examples focused on real app components and stable fixtures

## UI Checklist

Before finishing a UI change:

- does it use semantic tokens?
- does it reuse shared components where sensible?
- does it work in light and dark mode?
- does it still fit the map-first Live Fleet layout?
- does text fit inside controls and panels?
- did you avoid one-off styling that belongs in the theme?
