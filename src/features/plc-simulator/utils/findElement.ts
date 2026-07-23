import type { EditorDocument } from '@/simulator/editor/types';
import type { LadderElement } from '@/simulator/types/ladder';

/** UI-layer convenience lookup — not part of the editor's core operations,
 * just a scan helper so the canvas can answer "which rung is this element
 * in?" without every caller re-implementing the loop. */
export function findElementRungId(doc: EditorDocument, elementId: string): string | null {
  for (const rungId of doc.rungOrder) {
    if (doc.rungs[rungId].elements[elementId]) return rungId;
  }
  return null;
}

export function findElement(doc: EditorDocument, elementId: string): LadderElement | null {
  for (const rungId of doc.rungOrder) {
    const el = doc.rungs[rungId].elements[elementId];
    if (el) return el;
  }
  return null;
}
