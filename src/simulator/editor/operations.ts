import type { LadderElement } from '@/simulator/types/ladder';
import type { Address } from '@/simulator/types/address';
import { generateId } from '@/simulator/utils/id';
import { createBranchStart, createBranchEnd } from '@/simulator/models/elementFactory';
import type { EditorDocument, EditorRung } from './types';
import { wouldCreateCycle } from './cycleCheck';

export class EditorOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EditorOperationError';
  }
}

// All operations are pure: (document, ...args) -> new document. Nothing is
// mutated in place — this is what makes them trivial to unit-test (see
// examples/runEditorExample.ts) and safe to later back with undo/redo
// (each operation's return value is a ready-made history entry).

function cloneRung(rung: EditorRung): EditorRung {
  return { id: rung.id, elements: { ...rung.elements }, elementOrder: [...rung.elementOrder] };
}

function cloneDoc(doc: EditorDocument): EditorDocument {
  return { ...doc, rungOrder: [...doc.rungOrder], rungs: { ...doc.rungs } };
}

function requireRung(doc: EditorDocument, rungId: string): EditorRung {
  const rung = doc.rungs[rungId];
  if (!rung) throw new EditorOperationError(`Rung "${rungId}" does not exist.`);
  return rung;
}

// ── 1. Add Component ──────────────────────────────────────────────────
export function addElement(doc: EditorDocument, rungId: string, element: LadderElement): EditorDocument {
  const rung = requireRung(doc, rungId);
  if (rung.elements[element.id]) {
    throw new EditorOperationError(`Element id "${element.id}" already exists in rung "${rungId}".`);
  }

  const nextRung = cloneRung(rung);
  nextRung.elements[element.id] = element;
  nextRung.elementOrder.push(element.id);

  const nextDoc = cloneDoc(doc);
  nextDoc.rungs[rungId] = nextRung;
  return nextDoc;
}

// ── 2. Delete Component ───────────────────────────────────────────────
export function deleteElement(doc: EditorDocument, rungId: string, elementId: string): EditorDocument {
  const rung = requireRung(doc, rungId);
  if (!rung.elements[elementId]) {
    throw new EditorOperationError(`Element "${elementId}" not found in rung "${rungId}".`);
  }

  const nextRung = cloneRung(rung);
  delete nextRung.elements[elementId];
  nextRung.elementOrder = nextRung.elementOrder.filter((id) => id !== elementId);

  // Strip dangling references — anything that pointed at the deleted
  // element must drop that edge, or export would fail engine validation
  // with "connects to unknown element".
  for (const id of nextRung.elementOrder) {
    const el = nextRung.elements[id];
    if (el.connectsTo?.includes(elementId)) {
      nextRung.elements[id] = { ...el, connectsTo: el.connectsTo.filter((t) => t !== elementId) } as LadderElement;
    }
  }

  const nextDoc = cloneDoc(doc);
  nextDoc.rungs[rungId] = nextRung;
  return nextDoc;
}

// ── 3. Connect Elements ────────────────────────────────────────────────
export function connectElements(doc: EditorDocument, rungId: string, fromId: string, toId: string): EditorDocument {
  const rung = requireRung(doc, rungId);
  const from = rung.elements[fromId];
  const to = rung.elements[toId];
  if (!from || !to) throw new EditorOperationError('Both elements must exist in the same rung to connect them.');
  if (fromId === toId) throw new EditorOperationError('An element cannot connect to itself.');
  if (from.kind === 'COMMENT') throw new EditorOperationError('Comments cannot carry a connection.');
  if ((from.connectsTo ?? []).includes(toId)) return doc; // already connected — no-op, not an error

  if (wouldCreateCycle(rung, fromId, toId)) {
    throw new EditorOperationError(
      `Connecting "${fromId}" -> "${toId}" would create a loop. Ladder logic must flow one way (left rail to right rail).`
    );
  }

  const nextRung = cloneRung(rung);
  nextRung.elements[fromId] = { ...from, connectsTo: [...(from.connectsTo ?? []), toId] } as LadderElement;

  const nextDoc = cloneDoc(doc);
  nextDoc.rungs[rungId] = nextRung;
  return nextDoc;
}

export function disconnectElements(doc: EditorDocument, rungId: string, fromId: string, toId: string): EditorDocument {
  const rung = requireRung(doc, rungId);
  const from = rung.elements[fromId];
  if (!from) throw new EditorOperationError(`Element "${fromId}" not found in rung "${rungId}".`);

  const nextRung = cloneRung(rung);
  nextRung.elements[fromId] = {
    ...from,
    connectsTo: (from.connectsTo ?? []).filter((id) => id !== toId),
  } as LadderElement;

  const nextDoc = cloneDoc(doc);
  nextDoc.rungs[rungId] = nextRung;
  return nextDoc;
}

/**
 * Splices `element` into the middle of an existing fromId -> toId edge:
 * from -> element -> to, replacing the direct from -> to edge. This is what
 * a canvas "drop a component onto an existing wire" interaction calls.
 */
export function insertElementOnEdge(
  doc: EditorDocument,
  rungId: string,
  fromId: string,
  toId: string,
  element: LadderElement
): EditorDocument {
  let next = disconnectElements(doc, rungId, fromId, toId);
  next = addElement(next, rungId, { ...element, connectsTo: [toId] } as LadderElement);
  next = connectElements(next, rungId, fromId, element.id);
  return next;
}

// ── 4. Create Branch ───────────────────────────────────────────────────
/**
 * Adds a parallel path between two existing elements: fromId -> BRANCH_START
 * -> BRANCH_END -> toId, alongside whatever path(s) already connect them.
 * BRANCH_START/BRANCH_END are visual markers only (see Phase 2
 * ARCHITECTURE.md, design decision #1) — the OR-merge that makes this
 * "parallel" happens automatically at toId once it has multiple
 * predecessors. The placeholder branchStart->branchEnd wire keeps the
 * branch immediately valid/exportable; call addElement +
 * insertElementOnEdge afterward to splice real components into it.
 */
export function createBranch(
  doc: EditorDocument,
  rungId: string,
  fromId: string,
  toId: string,
  at: { gridX: number; gridY: number }
): { doc: EditorDocument; branchStartId: string; branchEndId: string } {
  const rung = requireRung(doc, rungId);
  if (!rung.elements[fromId] || !rung.elements[toId]) {
    throw new EditorOperationError('Both anchor elements must exist in the rung to branch between them.');
  }

  const branchId = generateId('branch');
  const branchStart = createBranchStart(branchId, { gridX: at.gridX, gridY: at.gridY });
  const branchEnd = createBranchEnd(branchId, { gridX: at.gridX + 1, gridY: at.gridY });

  let next = addElement(doc, rungId, branchStart);
  next = addElement(next, rungId, { ...branchEnd, connectsTo: [toId] });
  next = connectElements(next, rungId, fromId, branchStart.id);
  next = connectElements(next, rungId, branchStart.id, branchEnd.id);

  return { doc: next, branchStartId: branchStart.id, branchEndId: branchEnd.id };
}

// ── 5b. Edit Element Address ────────────────────────────────────────────
/**
 * Replaces the address on an existing CONTACT/COIL/TIMER/COUNTER element.
 * Used by the "double-click to edit address" interaction. No-op (returns
 * the same document) for element kinds that have no address.
 */
export function setElementAddress(
  doc: EditorDocument,
  rungId: string,
  elementId: string,
  address: Address
): EditorDocument {
  const rung = requireRung(doc, rungId);
  const element = rung.elements[elementId];
  if (!element) throw new EditorOperationError(`Element "${elementId}" not found in rung "${rungId}".`);
  if (!('address' in element)) return doc;

  const nextRung = cloneRung(rung);
  nextRung.elements[elementId] = { ...element, address } as LadderElement;
  const nextDoc = cloneDoc(doc);
  nextDoc.rungs[rungId] = nextRung;
  return nextDoc;
}

// ── 5 & 6. Drag Element / Move Element ─────────────────────────────────
// Live drag preview (per-frame, non-committing) lives in the Zustand store
// as DragState — see stores/ladderEditorStore.ts. moveElement here is the
// single function that actually commits a new position to the document,
// used both by "end drag" (commit the preview position) and by any
// non-drag reposition (arrow-key nudge, programmatic layout, etc).
export function moveElement(
  doc: EditorDocument,
  rungId: string,
  elementId: string,
  gridX: number,
  gridY: number
): EditorDocument {
  const rung = requireRung(doc, rungId);
  const element = rung.elements[elementId];
  if (!element) throw new EditorOperationError(`Element "${elementId}" not found in rung "${rungId}".`);

  const nextRung = cloneRung(rung);
  nextRung.elements[elementId] = { ...element, gridX, gridY };

  const nextDoc = cloneDoc(doc);
  nextDoc.rungs[rungId] = nextRung;
  return nextDoc;
}

// ── Supporting document/rung management ────────────────────────────────
// Not one of the 7 headline features on its own, but Ladder JSON is
// rung-based (Phase 2 types/ladder.ts) — an editor needs at least one rung
// to add components into, and realistic programs (e.g. a timer's done bit
// read in a second rung) need more than one.

export function createEmptyEditorDocument(name: string): EditorDocument {
  const rungId = generateId('rung');
  return {
    id: generateId('doc'),
    name,
    createdAt: new Date().toISOString(),
    rungOrder: [rungId],
    rungs: { [rungId]: { id: rungId, elements: {}, elementOrder: [] } },
  };
}

export function addRung(doc: EditorDocument): { doc: EditorDocument; rungId: string } {
  const rungId = generateId('rung');
  const nextDoc = cloneDoc(doc);
  nextDoc.rungOrder.push(rungId);
  nextDoc.rungs[rungId] = { id: rungId, elements: {}, elementOrder: [] };
  return { doc: nextDoc, rungId };
}
