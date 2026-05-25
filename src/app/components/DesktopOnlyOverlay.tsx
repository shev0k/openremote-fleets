import { MonitorSmartphone } from "lucide-react";

export function DesktopOnlyOverlay() {
  return (
    <section
      aria-labelledby="desktop-only-title"
      aria-modal="true"
      className="desktop-only-overlay fixed inset-0 z-[9999] items-center justify-center bg-page px-6 py-10 text-content-primary"
      role="dialog"
    >
      <div className="flex max-w-[360px] flex-col items-center text-center">
        <div className="mb-6 flex size-14 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-subtle">
          <MonitorSmartphone aria-hidden="true" className="size-7" />
        </div>
        <h1 id="desktop-only-title" className="text-2xl font-semibold tracking-normal">
          Desktop view required
        </h1>
        <p className="mt-3 text-sm leading-6 text-content-secondary">
          OpenRemote Fleets is intended for desktop workstations. Phone and tablet layouts are not currently supported or planned.
        </p>
      </div>
    </section>
  );
}
