import { Line } from 'react-konva';
import { COLOR_POWER_ON, COLOR_INACTIVE, GRID_SIZE } from '../constants';

interface ConnectionLineProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  isPowered: boolean;
}

/**
 * Draws the wire for one connectsTo edge. Same-row edges (the common case:
 * series chains) get a straight line. Different-row edges (a branch's
 * fan-out/fan-in) get an orthogonal two-bend path so parallel paths read
 * clearly instead of a diagonal line cutting across the rung.
 */
export function ConnectionLine({ from, to, isPowered }: ConnectionLineProps) {
  const color = isPowered ? COLOR_POWER_ON : COLOR_INACTIVE;
  const fromX = from.x + GRID_SIZE / 2;
  const toX = to.x - GRID_SIZE / 2;

  const points =
    from.y === to.y
      ? [fromX, from.y, toX, to.y]
      : [fromX, from.y, (fromX + toX) / 2, from.y, (fromX + toX) / 2, to.y, toX, to.y];

  return <Line points={points} stroke={color} strokeWidth={2} lineJoin="round" />;
}
