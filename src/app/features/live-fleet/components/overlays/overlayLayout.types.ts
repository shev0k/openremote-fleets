/* ======== TYPES ======== */

export interface PinnedWindowLayoutState {
  isCollapsed: boolean;
  position: { x: number; y: number } | null;
  zIndex: number;
  height?: number;
}

export interface FloatingPanelLayoutState {
  position: { x: number; y: number } | null;
  zIndex: number;
}
