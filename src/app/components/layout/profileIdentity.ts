import type { AppSessionSnapshot } from "../../../domain/models/session";

export interface ProfileIdentity {
  displayName: string;
  secondaryLabel: string;
  initials: string;
}

function toInitials(source: string) {
  const parts = source
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "OR";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0].at(0) ?? ""}${parts[1].at(0) ?? ""}`.toUpperCase();
}

export function getProfileIdentity(session: AppSessionSnapshot): ProfileIdentity {
  const displayName = session.displayName ?? session.username ?? session.email ?? "Operator";
  const secondaryLabel =
    session.email ??
    (session.username && session.username !== displayName ? session.username : null) ??
    (session.authenticated ? "OpenRemote account" : "Authentication pending");

  return {
    displayName,
    secondaryLabel,
    initials: toInitials(displayName),
  };
}
