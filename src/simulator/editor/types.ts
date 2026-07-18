import type { LadderElement } from '@/simulator/types/ladder';

// ─── Editor Document Model ───────────────────────────────────────────────
// Deliberately NOT the same shape as LadderProject (see exportToLadderJson.ts
// for the conversion). The editor needs O(1) add/delete by id and never
// wants to hand-manage `startIds` — those are derived at export time. It
// also carries interaction-only state (selection, live drag preview) that
// must never leak into the exported engine JSON.

export interface EditorRung {
  id: string;
  /** Keyed by element id for O(1) add/delete/update. */
  elements: Record<string, LadderElement>;
  /** Insertion order — purely for stable iteration/rendering; not semantic. */
  elementOrder: string[];
}

export interface EditorDocument {
  id: string;
  name: string;
  createdAt: string;
  rungOrder: string[];
  rungs: Record<string, EditorRung>;
}

export interface EditorSelection {
  rungId: string;
  elementId: string;
}

/**
 * Live drag preview — intentionally separate from EditorDocument. A future
 * Konva canvas's onDragMove will fire many times a second; if that mutated
 * the committed document directly, every frame would ripple through the
 * whole app's re-renders and through undo history. Here, only endDrag()
 * commits back into the document.
 */
export interface DragState {
  rungId: string;
  elementId: string;
  originX: number;
  originY: number;
  previewX: number;
  previewY: number;
}
