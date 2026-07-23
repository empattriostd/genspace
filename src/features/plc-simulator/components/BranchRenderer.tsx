import { Fragment } from 'react';
import { Rect } from 'react-konva';
import type { EditorRung } from '@/simulator/editor/types';
import { gridToWorld } from '../utils/coords';
import { COLOR_ACTIVE } from '../constants';

interface BranchRendererProps {
  rung: EditorRung;
  rungIndex: number;
  poweredElements: Record<string, boolean>;
  isSimulating: boolean;
}

/**
 * Draws a rounded bracket behind every BRANCH_START/BRANCH_END pair in a
 * rung so a parallel path reads as one visual group on a small phone
 * screen, instead of only being inferable from where the wires happen to
 * fork. Purely a read of the existing EditorRung data (branchId pairing) —
 * no new engine concept, matches exactly what the parser already treats
 * as a branch (see simulator/parser/buildGraph.ts).
 */
export function BranchRenderer({ rung, rungIndex, poweredElements, isSimulating }: BranchRendererProps) {
  const starts = rung.elementOrder
    .map((id) => rung.elements[id])
    .filter((el) => el.kind === 'BRANCH_START');

  return (
    <Fragment>
      {starts.map((start) => {
        if (start.kind !== 'BRANCH_START') return null;
        const end = rung.elementOrder
          .map((id) => rung.elements[id])
          .find((el) => el.kind === 'BRANCH_END' && el.branchId === start.branchId);
        if (!end) return null;

        const from = gridToWorld(start.gridX, start.gridY, rungIndex);
        const to = gridToWorld(end.gridX, end.gridY, rungIndex);
        const isPowered = isSimulating && (!!poweredElements[start.id] || !!poweredElements[end.id]);

        const left = Math.min(from.x, to.x) - 34;
        const right = Math.max(from.x, to.x) + 34;
        const top = Math.min(from.y, to.y) - 28;
        const bottom = Math.max(from.y, to.y) + 28;

        return (
          <Rect
            key={start.branchId}
            x={left}
            y={top}
            width={right - left}
            height={bottom - top}
            cornerRadius={14}
            stroke={isPowered ? COLOR_ACTIVE : 'rgba(138,138,138,0.5)'}
            strokeWidth={1.5}
            dash={[6, 4]}
            fillEnabled={false}
          />
        );
      })}
    </Fragment>
  );
}
