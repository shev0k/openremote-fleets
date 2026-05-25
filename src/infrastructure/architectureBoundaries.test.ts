import { describe, expect, it } from "vitest";

const openRemoteImportPattern = /(?:from\s+|import\s*\()\s*["'][^"']*infrastructure\/openremote/;
const infrastructureImportPattern = /(?:from\s+|import\s*\()\s*["'][^"']*infrastructure\//;
const appServiceConcreteFactoryImportPattern =
  /(?:from\s+|import\s*\()\s*["']\.\/create(?:Mock|OpenRemote)AppServices["']/;
const obsoleteScopeImportPattern = /(?:from\s+|import\s*\()\s*["'][^"']*(?:domain\/legacy\/obsoleteScope|legacy\/obsoleteScope)/;
const openRemoteRuntimeImportPattern =
  /(?:from\s+|import\s*\()\s*["'][^"']*(?:infrastructure\/openremote\/runtime|openremote\/runtime)/;
const openRemoteToMockInfrastructureImportPattern =
  /(?:from\s+|import\s*\()\s*["'][^"']*(?:infrastructure\/repositories\/mock|repositories\/mock|mockLiveFleetSimulation|MockFleetRepository|MockPlaybackRepository)/;
const mockToOpenRemoteInfrastructureImportPattern =
  /(?:from\s+|import\s*\()\s*["'][^"']*(?:infrastructure\/openremote|openremote\/|@openremote\/core|@openremote\/model)/;
const liveFleetWorkspaceProviderImportPattern =
  /(?:from\s+|import\s*\()\s*["'][^"']*features\/live-fleet\/providers\/LiveFleetWorkspaceProvider["']|(?:from\s+|import\s*\()\s*["'][^"']*providers\/LiveFleetWorkspaceProvider["']/;

const appSourceFiles = import.meta.glob("../app/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const domainSourceFiles = import.meta.glob("../domain/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const openRemoteInfrastructureSourceFiles = import.meta.glob("./openremote/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const mockInfrastructureSourceFiles = import.meta.glob("./repositories/mock/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const activeRouteNavigationAndServiceFiles = {
  ...import.meta.glob("../app/{App,routes}.tsx", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
  ...import.meta.glob("../app/components/{Layout,layout/**/*.ts,layout/**/*.tsx}", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
  ...import.meta.glob("./services/**/*.{ts,tsx}", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
} as Record<string, string>;

const sessionProviderSourceFiles = import.meta.glob("../app/providers/session/AppSessionProvider*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const liveFleetRouteAlarmMarkerCompatibilityFiles = import.meta.glob("../app/features/live-fleet/routeAlarmMarkers.ts", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const allowedAppOpenRemoteImports = new Set([
  "src/app/providers/session/AppSessionProvider.openRemote.tsx",
]);

const allowedAppInfrastructureImports = new Set([
  "src/app/providers/AppServicesProvider.tsx",
  "src/app/providers/session/AppSessionProvider.openRemote.tsx",
]);

describe("architecture boundaries", () => {
  it("keeps OpenRemote infrastructure imports out of production app code except the runtime provider", () => {
    const offenders = Object.entries(appSourceFiles)
      .filter(([filePath]) => !toProjectPath(filePath).includes(".test."))
      .filter(([filePath]) => !allowedAppOpenRemoteImports.has(toProjectPath(filePath)))
      .filter(([, contents]) => openRemoteImportPattern.test(contents.replaceAll("\\", "/")))
      .map(([filePath]) => toProjectPath(filePath));

    expect(offenders).toEqual([]);
  });

  it("keeps infrastructure imports out of production app code except provider composition boundaries", () => {
    const offenders = Object.entries(appSourceFiles)
      .filter(([filePath]) => !toProjectPath(filePath).includes(".test."))
      .filter(([filePath]) => !allowedAppInfrastructureImports.has(toProjectPath(filePath)))
      .filter(([, contents]) => infrastructureImportPattern.test(contents.replaceAll("\\", "/")))
      .map(([filePath]) => toProjectPath(filePath));

    expect(offenders).toEqual([]);
  });

  it("keeps infrastructure imports out of the domain layer", () => {
    const offenders = Object.entries(domainSourceFiles)
      .filter(([, contents]) => infrastructureImportPattern.test(contents.replaceAll("\\", "/")))
      .map(([filePath]) => toProjectPath(filePath));

    expect(offenders).toEqual([]);
  });

  it("keeps OpenRemote infrastructure from importing mock repositories", () => {
    const offenders = Object.entries(openRemoteInfrastructureSourceFiles)
      .filter(([, contents]) => openRemoteToMockInfrastructureImportPattern.test(contents.replaceAll("\\", "/")))
      .map(([filePath]) => toProjectPath(filePath));

    expect(offenders).toEqual([]);
  });

  it("keeps mock repositories from importing OpenRemote infrastructure", () => {
    const offenders = Object.entries(mockInfrastructureSourceFiles)
      .filter(([, contents]) => mockToOpenRemoteInfrastructureImportPattern.test(contents.replaceAll("\\", "/")))
      .map(([filePath]) => toProjectPath(filePath));

    expect(offenders).toEqual([]);
  });

  it("keeps the app service entrypoint behind a build-selected factory alias", () => {
    const appServices = serviceSourceFiles["./services/appServices.ts"] ?? "";

    expect(appServices).toContain("#app-service-factory");
    expect(appServices).not.toMatch(appServiceConcreteFactoryImportPattern);
  });

  it("keeps obsolete legacy scope out of active routes, navigation, and service composition", () => {
    const offenders = Object.entries(activeRouteNavigationAndServiceFiles)
      .filter(([, contents]) => obsoleteScopeImportPattern.test(contents.replaceAll("\\", "/")))
      .map(([filePath]) => toProjectPath(filePath));

    expect(offenders).toEqual([]);
  });

  it("keeps mock session provider implementations free of OpenRemote runtime imports when present", () => {
    const mockProviderEntries = Object.entries(sessionProviderSourceFiles)
      .filter(([filePath]) => !toProjectPath(filePath).includes(".test."))
      .filter(([filePath]) => toProjectPath(filePath).includes("AppSessionProvider.mock."));

    // Another worker may add the split session provider implementation. When it exists,
    // this boundary prevents the mock implementation from importing real OpenRemote runtime code.
    const offenders = mockProviderEntries
      .filter(([, contents]) => openRemoteRuntimeImportPattern.test(contents.replaceAll("\\", "/")))
      .map(([filePath]) => toProjectPath(filePath));

    expect(offenders).toEqual([]);
  });

  it("keeps the live-fleet route alarm marker compatibility file as a shared map re-export only", () => {
    const compatibilityFile = liveFleetRouteAlarmMarkerCompatibilityFiles["../app/features/live-fleet/routeAlarmMarkers.ts"];

    expect(compatibilityFile?.trim()).toBe(
      'export * from "../../components/map/routeSegments/routeAlarmMarkers";',
    );
  });

  it("keeps production Live Fleet consumers on focused workspace contexts", () => {
    const offenders = Object.entries(appSourceFiles)
      .filter(([filePath]) => !toProjectPath(filePath).includes(".test."))
      .filter(([filePath]) => toProjectPath(filePath).includes("src/app/features/live-fleet/"))
      .filter(([, contents]) => liveFleetWorkspaceProviderImportPattern.test(contents.replaceAll("\\", "/")))
      .map(([filePath]) => toProjectPath(filePath));

    expect(offenders).toEqual([]);
  });
});

const serviceSourceFiles = import.meta.glob("./services/appServices.ts", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function toProjectPath(filePath: string) {
  return `src/${filePath.replace(/^\.\.\//, "")}`;
}
