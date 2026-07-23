/**
 * Shared layout constants for the Konva canvas. One grid unit here maps
 * 1:1 to an element's gridX/gridY in the ladder data model — i.e. moving an
 * element "one grid step" right always means gridX + 1, regardless of
 * current zoom, which is what makes drag-snapping and the infinite grid
 * background line up with the underlying data.
 */
export const GRID_SIZE = 90; // px per grid unit at scale = 1
export const RUNG_HEIGHT = 260; // px vertical band reserved per rung (room for one branch row)
export const LEFT_RAIL_X = 40; // world-space x of the left power rail
export const RIGHT_RAIL_MARGIN = 60; // extra world-space width drawn past the last element

export const COLOR_ACTIVE = '#F26B3A';
export const COLOR_INACTIVE = '#B8B8B8';
export const COLOR_SELECTED = '#2563EB';
/** Phase 5: CX-Programmer-authentic green for live power-flow monitoring
 * specifically (Run mode). Scoped to element/wire "isPowered" rendering
 * only — the app's orange brand color (COLOR_ACTIVE) is untouched
 * everywhere else (buttons, badges, theme), since that's an established
 * design-system token this phase isn't meant to rebrand. */
export const COLOR_POWER_ON = '#22C55E';

export const MIN_SCALE = 0.4;
export const MAX_SCALE = 2.5;
export const ZOOM_SCALE_BY = 1.08;
