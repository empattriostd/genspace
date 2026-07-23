import { GRID_SIZE, RUNG_HEIGHT, LEFT_RAIL_X } from '../constants';

/** Converts an element's own (gridX, gridY) + which rung it's in, into
 * world-space pixel coordinates the Konva layer renders at scale=1.
 * gridX=0 sits one full grid step to the right of the left rail, leaving
 * room for the rail-to-first-element wire stub to read clearly. */
export function gridToWorld(gridX: number, gridY: number, rungIndex: number): { x: number; y: number } {
  return {
    x: LEFT_RAIL_X + (gridX + 1) * GRID_SIZE,
    y: rungIndex * RUNG_HEIGHT + gridY * (GRID_SIZE * 0.8) + RUNG_HEIGHT / 2,
  };
}

/** Inverse of gridToWorld — used when dropping a NEW component from the
 * palette, where we don't yet know which rung it belongs to and must infer
 * it from the vertical drop position. */
export function worldToGrid(x: number, y: number): { gridX: number; gridY: number; rungIndex: number } {
  const rungIndex = Math.max(0, Math.floor(y / RUNG_HEIGHT));
  const localY = y - rungIndex * RUNG_HEIGHT - RUNG_HEIGHT / 2;
  return {
    gridX: Math.round((x - LEFT_RAIL_X) / GRID_SIZE) - 1,
    gridY: Math.round(localY / (GRID_SIZE * 0.8)),
    rungIndex,
  };
}

/** Same as worldToGrid, but for repositioning an element that's already
 * known to belong to a specific rung — used while dragging an existing
 * element, so it can't accidentally "fall" into a neighboring rung's band
 * just because the pointer strayed slightly outside RUNG_HEIGHT. */
export function worldToGridForRung(x: number, y: number, rungIndex: number): { gridX: number; gridY: number } {
  const localY = y - rungIndex * RUNG_HEIGHT - RUNG_HEIGHT / 2;
  return {
    gridX: Math.round((x - LEFT_RAIL_X) / GRID_SIZE) - 1,
    gridY: Math.round(localY / (GRID_SIZE * 0.8)),
  };
}
