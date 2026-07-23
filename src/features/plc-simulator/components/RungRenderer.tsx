import { Fragment } from 'react';
import { Text } from 'react-konva';
import type { EditorRung } from '@/simulator/editor/types';
import { ConnectionLine } from './ConnectionLine';
import { LadderElement } from './LadderElement';
import { BranchRenderer } from './BranchRenderer';
import { gridToWorld } from '../utils/coords';
import { RUNG_HEIGHT } from '../constants';

interface RungRendererProps {
  rung: EditorRung;
  rungIndex: number;
  isSimulating: boolean;
  poweredElements: Record<string, boolean>;
  selectedId: string | null;
  multiSelected: Set<string>;
  pendingAnchorId: string | null;
  isPlacingMode: boolean;
  onElementTap: (id: string) => void;
  onElementLongPress: (id: string, screenX: number, screenY: number) => void;
}

/**
 * One rung's worth of visuals — connection wires (drawn first so glyphs
 * sit on top), the branch bracket overlay, and every element in the rung.
 * Extracted from the inline loop in LadderCanvas so the mobile canvas
 * composes cleanly per-rung and stays legible at phone width.
 */
export function RungRenderer({
  rung,
  rungIndex,
  isSimulating,
  poweredElements,
  selectedId,
  multiSelected,
  pendingAnchorId,
  isPlacingMode,
  onElementTap,
  onElementLongPress,
}: RungRendererProps) {
  return (
    <Fragment>
      <Text
        text={`RUNG ${rungIndex + 1}`}
        x={-34}
        y={rungIndex * RUNG_HEIGHT + 10}
        fontSize={11}
        fontStyle="bold"
        fill="#B8B8B8"
      />

      <BranchRenderer rung={rung} rungIndex={rungIndex} poweredElements={poweredElements} isSimulating={isSimulating} />

      {rung.elementOrder.map((id) => {
        const el = rung.elements[id];
        const fromPos = gridToWorld(el.gridX, el.gridY, rungIndex);
        return (el.connectsTo ?? []).map((targetId) => {
          const target = rung.elements[targetId];
          if (!target) return null;
          const toPos = gridToWorld(target.gridX, target.gridY, rungIndex);
          return (
            <ConnectionLine
              key={`${id}->${targetId}`}
              from={fromPos}
              to={toPos}
              isPowered={isSimulating && !!poweredElements[id]}
            />
          );
        });
      })}

      {rung.elementOrder.map((id) => {
        const el = rung.elements[id];
        const pos = gridToWorld(el.gridX, el.gridY, rungIndex);
        return (
          <LadderElement
            key={id}
            element={el}
            x={pos.x}
            y={pos.y}
            isPowered={isSimulating && !!poweredElements[id]}
            isSelected={selectedId === id || multiSelected.has(id)}
            isPendingAnchor={pendingAnchorId === id}
            isPlacingMode={isPlacingMode}
            onTap={onElementTap}
            onLongPress={onElementLongPress}
          />
        );
      })}
    </Fragment>
  );
}
