import { Fragment } from 'react';
import { Line } from 'react-konva';
import { LEFT_RAIL_X, RIGHT_RAIL_MARGIN, GRID_SIZE } from '../constants';

interface PowerRailProps {
  worldTop: number;
  worldBottom: number;
  /** Right-hand edge in world space — widest element in the loaded document,
   * plus RIGHT_RAIL_MARGIN, so the right rail always sits just past the
   * last coil regardless of how many rungs/elements exist. */
  rightRailX: number;
  /** True while the simulation is running — rails read as "live" (orange)
   * instead of idle gray, matching the brief's CX-Programmer-style
   * powered/unpowered convention applied to the rails themselves. */
  isLive: boolean;
}

/**
 * Draws both vertical power rails bounding every rung — the left rail
 * (source) and the right rail (return/neutral), the two fixed reference
 * lines every ladder rung hangs off of. Purely decorative/orientation —
 * no engine data lives here, it just reads worldTop/worldBottom/rightRailX
 * computed by the caller from the current camera + document extents.
 */
export function PowerRail({ worldTop, worldBottom, rightRailX, isLive }: PowerRailProps) {
  const color = isLive ? '#F26B3A' : '#8A8A8A';

  return (
    <Fragment>
      <Line
        points={[LEFT_RAIL_X, worldTop, LEFT_RAIL_X, worldBottom]}
        stroke={color}
        strokeWidth={4}
        shadowColor={isLive ? color : undefined}
        shadowBlur={isLive ? 10 : 0}
        shadowOpacity={0.6}
        lineCap="round"
      />
      <Line
        points={[rightRailX, worldTop, rightRailX, worldBottom]}
        stroke="#8A8A8A"
        strokeWidth={4}
        lineCap="round"
      />
    </Fragment>
  );
}

/** Right rail x for a given document's widest element, in world space —
 * shared helper so MobileLadderCanvas and LadderGrid agree on where the
 * right rail sits without duplicating the math. */
export function rightRailXFor(maxGridX: number): number {
  return LEFT_RAIL_X + (maxGridX + 2) * GRID_SIZE + RIGHT_RAIL_MARGIN - GRID_SIZE;
}
