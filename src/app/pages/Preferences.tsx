import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Clock, Image, Map, Palette, RefreshCcw, Save, Settings } from "lucide-react";
import {
  DEFAULT_APP_PREFERENCES,
  mergeAppPreferences,
  type AppDefaultMapLayer,
  type AppPreferences,
  type AppTimeFormat,
} from "../../domain/models/preferences";
import { PanelCard } from "../components/shared/cards/PanelCard";
import { SegmentedControl } from "../components/shared/controls/SegmentedControl";
import { SelectionDropdown } from "../components/shared/controls/SelectionDropdown";
import { PageHeaderPanel } from "../components/shared/layout/PageHeaderPanel";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

const timeFormatOptions = [
  { id: "24h", label: "24-hour" },
  { id: "12h", label: "12-hour" },
];

const mapLayerOptions = [
  { id: "default", label: "Default" },
  { id: "satellite", label: "Satellite" },
  { id: "terrain", label: "Terrain" },
];

function sourceLabel(source: AppPreferences["source"]) {
  if (source === "openRemote") {
    return "Synced from OpenRemote";
  }

  if (source === "local") {
    return "Local override";
  }

  return "Default Fleets branding";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

function TextField({ id, label, value, placeholder, onChange }: TextFieldProps) {
  return (
    <label htmlFor={id} className="flex flex-col gap-2">
      <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-content-muted">{label}</span>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="app-input h-11 rounded-[16px] px-3 text-[13px]"
      />
    </label>
  );
}

interface ColorFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorField({ id, label, value, onChange }: ColorFieldProps) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-3 rounded-[18px] border border-border-subtle bg-panel-muted px-3 py-2">
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold text-content-primary">{label}</span>
        <span className="block font-mono text-[11px] text-content-muted">{value}</span>
      </span>
      <input
        id={id}
        aria-label={label}
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-12 shrink-0 cursor-pointer rounded-[12px] border border-border-subtle bg-transparent p-1"
      />
    </label>
  );
}

interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
}

function SectionHeader({ icon, title, description }: SectionHeaderProps) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-brand/12 text-brand">
        {icon}
      </div>
      <div>
        <h2 className="text-[16px] font-semibold text-content-primary">{title}</h2>
        <p className="mt-0.5 text-[12px] leading-5 text-content-muted">{description}</p>
      </div>
    </div>
  );
}

export function Preferences() {
  const { preferences, isLoading, error, savePreferences, resetPreferences, formatTime } = useAppPreferences();
  const [draft, setDraft] = useState<AppPreferences>(preferences);
  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(preferences);
  }, [preferences]);

  const previewTime = useMemo(() => formatTime(new Date("2026-05-08T14:05:00Z"), "UTC"), [formatTime]);
  const selectedMapLayerLabel = mapLayerOptions.find((option) => option.id === draft.behavior.defaultMapLayer)?.label ?? "Default";

  const updateDraft = (nextDraft: Parameters<typeof mergeAppPreferences>[1]) => {
    setDraft((current) => mergeAppPreferences(current, nextDraft));
  };

  const updateBrandingDraft = <Field extends keyof AppPreferences["branding"]>(
    field: Field,
    value: AppPreferences["branding"][Field],
  ) => {
    setDraft((current) => ({
      ...current,
      branding: {
        ...current.branding,
        [field]: value,
      },
    }));
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>, field: "logoUrl" | "faviconUrl") => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    updateBrandingDraft(field, await readFileAsDataUrl(file));
    event.target.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePreferences(draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden font-sans tracking-tight text-content-primary">
      <PageHeaderPanel
        title="Preferences"
        description="Manage branding, colors, map appearance, and global display behavior for this Fleets instance."
        icon={<Settings className="h-6 w-6 text-brand" />}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void resetPreferences()}
              className="app-control inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px]"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || isLoading}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[13px] font-semibold text-brand-foreground transition hover:bg-brand-hover disabled:cursor-wait disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              Save preferences
            </button>
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid min-w-0 gap-6 lg:grid-cols-2">
            <PanelCard className="p-5">
              <SectionHeader
                icon={<Image className="h-5 w-5" />}
                title="Brand identity"
                description="Use the OpenRemote organization branding when available, or keep a local Fleets override."
              />
              <div className="grid gap-4">
                <TextField
                  id="application-name"
                  label="Application name"
                  value={draft.branding.applicationName}
                  onChange={(applicationName) => updateBrandingDraft("applicationName", applicationName)}
                />
                <TextField
                  id="logo-url"
                  label="Logo URL"
                  value={draft.branding.logoUrl ?? ""}
                  placeholder="https://example.com/logo.svg"
                  onChange={(logoUrl) => updateBrandingDraft("logoUrl", logoUrl)}
                />
                <label className="app-control flex h-11 cursor-pointer items-center justify-center rounded-[16px] text-[13px] font-semibold">
                  Upload logo
                  <input type="file" accept="image/*" className="sr-only" onChange={(event) => void handleImageUpload(event, "logoUrl")} />
                </label>
                <TextField
                  id="favicon-url"
                  label="Favicon URL"
                  value={draft.branding.faviconUrl ?? ""}
                  placeholder="/openremote.png"
                  onChange={(faviconUrl) => updateBrandingDraft("faviconUrl", faviconUrl)}
                />
                <label className="app-control flex h-11 cursor-pointer items-center justify-center rounded-[16px] text-[13px] font-semibold">
                  Upload favicon
                  <input type="file" accept="image/*" className="sr-only" onChange={(event) => void handleImageUpload(event, "faviconUrl")} />
                </label>
              </div>
            </PanelCard>

            <PanelCard className="p-5">
              <SectionHeader
                icon={<Palette className="h-5 w-5" />}
                title="Theme colors"
                description="These colors drive the shared app tokens used by navigation, controls, charts, and status accents."
              />
              <div className="grid gap-3">
                <ColorField id="brand-color" label="Brand color" value={draft.themeColors.brand} onChange={(brand) => updateDraft({ themeColors: { brand } })} />
                <ColorField id="brand-hover-color" label="Brand hover color" value={draft.themeColors.brandHover} onChange={(brandHover) => updateDraft({ themeColors: { brandHover } })} />
                <ColorField id="brand-foreground-color" label="Brand foreground color" value={draft.themeColors.brandForeground} onChange={(brandForeground) => updateDraft({ themeColors: { brandForeground } })} />
                <ColorField id="success-color" label="Success color" value={draft.themeColors.success} onChange={(success) => updateDraft({ themeColors: { success } })} />
                <ColorField id="warning-color" label="Warning color" value={draft.themeColors.warning} onChange={(warning) => updateDraft({ themeColors: { warning } })} />
                <ColorField id="danger-color" label="Danger color" value={draft.themeColors.danger} onChange={(danger) => updateDraft({ themeColors: { danger } })} />
              </div>
            </PanelCard>

            <PanelCard className="p-5">
              <SectionHeader
                icon={<Map className="h-5 w-5" />}
                title="Map colors"
                description="Control vehicle and route colors used by Live Fleet, Route Playback, and shared map layers."
              />
              <div className="grid gap-3">
                <ColorField id="vehicle-moving-color" label="Moving vehicle color" value={draft.mapColors.vehicleMoving} onChange={(vehicleMoving) => updateDraft({ mapColors: { vehicleMoving } })} />
                <ColorField id="vehicle-idling-color" label="Idling vehicle color" value={draft.mapColors.vehicleIdling} onChange={(vehicleIdling) => updateDraft({ mapColors: { vehicleIdling } })} />
                <ColorField id="vehicle-parked-color" label="Parked vehicle color" value={draft.mapColors.vehicleParked} onChange={(vehicleParked) => updateDraft({ mapColors: { vehicleParked } })} />
                <ColorField id="vehicle-stationary-color" label="Stationary vehicle color" value={draft.mapColors.vehicleStationary} onChange={(vehicleStationary) => updateDraft({ mapColors: { vehicleStationary } })} />
                <ColorField id="vehicle-signal-degraded-color" label="Signal degraded color" value={draft.mapColors.vehicleSignalDegraded} onChange={(vehicleSignalDegraded) => updateDraft({ mapColors: { vehicleSignalDegraded } })} />
                <ColorField id="vehicle-driver-break-color" label="Driver break color" value={draft.mapColors.vehicleDriverBreak} onChange={(vehicleDriverBreak) => updateDraft({ mapColors: { vehicleDriverBreak } })} />
                <ColorField id="vehicle-alerting-color" label="Alerting vehicle color" value={draft.mapColors.vehicleAlerting} onChange={(vehicleAlerting) => updateDraft({ mapColors: { vehicleAlerting } })} />
                <ColorField id="vehicle-offline-color" label="Offline vehicle color" value={draft.mapColors.vehicleOffline} onChange={(vehicleOffline) => updateDraft({ mapColors: { vehicleOffline } })} />
                <ColorField id="route-color" label="Route color" value={draft.mapColors.route} onChange={(route) => updateDraft({ mapColors: { route } })} />
                <ColorField id="route-active-color" label="Active route color" value={draft.mapColors.routeActive} onChange={(routeActive) => updateDraft({ mapColors: { routeActive } })} />
                <ColorField id="route-overspeed-color" label="Overspeed route color" value={draft.mapColors.routeOverspeed} onChange={(routeOverspeed) => updateDraft({ mapColors: { routeOverspeed } })} />
              </div>
            </PanelCard>

            <PanelCard className="p-5">
              <SectionHeader
                icon={<Clock className="h-5 w-5" />}
                title="Global behavior"
                description="Apply site-wide display preferences that affect repeated operational views."
              />
              <div className="grid gap-5">
                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-content-muted">Time format</p>
                  <SegmentedControl
                    options={timeFormatOptions}
                    value={draft.behavior.timeFormat}
                    onChange={(timeFormat) => updateDraft({ behavior: { timeFormat: timeFormat as AppTimeFormat } })}
                  />
                </div>
                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-content-muted">Default map layer</p>
                  <SelectionDropdown
                    value={selectedMapLayerLabel}
                    activeOptionId={draft.behavior.defaultMapLayer}
                    options={mapLayerOptions}
                    onChange={(defaultMapLayer) => updateDraft({ behavior: { defaultMapLayer: defaultMapLayer as AppDefaultMapLayer } })}
                    leadingIcon={<Map className="h-4 w-4" />}
                    menuTitle="Map layer"
                    menuClassName="w-40"
                  />
                </div>
                <div className="rounded-[18px] border border-border-subtle bg-panel-muted px-4 py-3">
                  <p className="text-[12px] font-semibold text-content-primary">Preview time</p>
                  <p className="mt-1 font-mono text-[18px] text-brand">{previewTime}</p>
                </div>
              </div>
            </PanelCard>
          </div>

          <div className="xl:sticky xl:top-0 xl:self-start">
            <PanelCard className="overflow-hidden">
              <div className="border-b border-border-subtle p-5">
                <div className="inline-flex rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-[11px] font-semibold text-brand">
                  {sourceLabel(preferences.source)}
                </div>
                {error ? <p className="mt-3 text-[12px] text-danger">{error}</p> : null}
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3">
                  {draft.branding.logoUrl ? (
                    <img src={draft.branding.logoUrl} alt="" className="h-12 w-12 rounded-[18px] border border-border-subtle bg-panel object-contain p-1.5" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-brand text-brand-foreground">
                      <Settings className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-semibold text-content-primary">{draft.branding.applicationName}</p>
                    <p className="text-[12px] text-content-muted">Live application preview</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    ["Brand", draft.themeColors.brand],
                    ["Moving", draft.mapColors.vehicleMoving],
                    ["Idling", draft.mapColors.vehicleIdling],
                    ["Parked", draft.mapColors.vehicleParked],
                    ["Signal", draft.mapColors.vehicleSignalDegraded],
                    ["Alert", draft.mapColors.vehicleAlerting],
                    ["Route", draft.mapColors.route],
                    ["Overspeed", draft.mapColors.routeOverspeed],
                  ].map(([label, color]) => (
                    <div key={label} className="rounded-[18px] border border-border-subtle bg-panel-muted p-3">
                      <div className="mb-2 h-7 rounded-full" style={{ backgroundColor: color }} />
                      <p className="text-[11px] font-semibold text-content-primary">{label}</p>
                      <p className="font-mono text-[10px] text-content-muted">{color}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-[20px] border border-border-subtle bg-panel-muted p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-content-muted">Fallback</p>
                  <p className="mt-2 text-[12px] leading-5 text-content-secondary">
                    Real mode reads OpenRemote Manager appearance settings first. If none are configured, Fleets keeps the default branding.
                  </p>
                </div>
              </div>
            </PanelCard>
          </div>
        </div>
      </div>
    </div>
  );
}
