import { Link } from "react-router";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

export function LayoutBrand() {
  const { preferences } = useAppPreferences();
  const appName = preferences.branding.applicationName;
  const logoUrl = preferences.branding.logoUrl;
  const logoAltText = preferences.branding.logoAltText;

  return (
    <Link
      to="/"
      aria-label="Open Live Fleet"
      className="flex shrink-0 items-center gap-2 rounded-2xl outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-brand/40 sm:gap-3"
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={logoAltText}
          className="brand-glow-logo h-8 w-8 rounded-xl border border-border-subtle bg-panel object-contain p-1"
        />
      ) : (
        <div className="brand-glow-logo flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-brand-foreground font-bold">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
            <path d="M5 10H19V19C19 20.1046 18.1046 21 17 21H7C5.89543 21 5 20.1046 5 19V10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 10V6C8 4.89543 8.89543 4 10 4H14C15.1046 4 16 4.89543 16 6V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
      <span className="hidden max-w-[220px] truncate text-lg font-semibold tracking-tight text-content-primary sm:block sm:text-xl">
        {appName}
      </span>
    </Link>
  );
}
