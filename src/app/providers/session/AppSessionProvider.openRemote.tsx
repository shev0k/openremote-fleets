import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { getOpenRemoteAdapterIssues } from "../../../infrastructure/openremote/repositories/openRemoteAdapterStatus";
import type { OpenRemoteRuntime } from "../../../infrastructure/openremote/runtime/openRemoteRuntime";
import { getOpenRemoteRuntime } from "../../../infrastructure/openremote/runtime/openRemoteRuntime.singleton";
import { AppSessionContext } from "./appSessionContext";

declare global {
  interface Window {
    __OPENREMOTE_FLEETS_ADAPTER_ISSUES__?: typeof getOpenRemoteAdapterIssues;
  }
}

interface OpenRemoteAppSessionProviderProps {
  children: ReactNode;
  runtime?: OpenRemoteRuntime;
}

export function OpenRemoteAppSessionProvider({
  children,
  runtime = getOpenRemoteRuntime(),
}: OpenRemoteAppSessionProviderProps) {
  const [session, setSession] = useState(() => runtime.getSessionSnapshot());

  useEffect(() => {
    setSession(runtime.getSessionSnapshot());

    return runtime.subscribe((nextSession) => {
      setSession(nextSession);
    });
  }, [runtime]);

  useEffect(() => {
    // Real mode boots the OpenRemote runtime eagerly so Keycloak and REST client setup happen before feature calls.
    void runtime.ensureReady();
  }, [runtime]);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") {
      return undefined;
    }

    window.__OPENREMOTE_FLEETS_ADAPTER_ISSUES__ = getOpenRemoteAdapterIssues;

    return () => {
      delete window.__OPENREMOTE_FLEETS_ADAPTER_ISSUES__;
    };
  }, []);

  const logout = useCallback(() => {
    const redirectUrl = typeof window === "undefined" ? undefined : `${window.location.origin}/`;
    runtime.logout(redirectUrl);
  }, [runtime]);

  const value = useMemo(
    () => ({
      session,
      logout,
    }),
    [logout, session],
  );

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>;
}

export const ModeAppSessionProvider = OpenRemoteAppSessionProvider;
