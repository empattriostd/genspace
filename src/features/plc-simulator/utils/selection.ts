import type { EditorDocument } from '@/simulator/editor/types';
import { gridToWorld } from './coords';

export interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Returns every element id whose world position falls inside `rect` —
 * the marquee/rubber-band selection test. */
export function collectElementsInRect(doc: EditorDocument, rect: WorldRect): string[] {
  const ids: string[] = [];
  doc.rungOrder.forEach((rungId, rungIndex) => {
    const rung = doc.rungs[rungId];
    for (const id of rung.elementOrder) {
      const el = rung.elements[id];
      const pos = gridToWorld(el.gridX, el.gridY, rungIndex);
      if (pos.x >= rect.x && pos.x <= rect.x + rect.width && pos.y >= rect.y && pos.y <= rect.y + rect.height) {
        ids.push(id);
      }
    }
  });
  return ids;
}
