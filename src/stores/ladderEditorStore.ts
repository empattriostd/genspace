import { create } from 'zustand';
import type { EditorDocument, EditorSelection, DragState } from '@/simulator/editor/types';
import {
  createEmptyEditorDocument,
  addRung as addRungOp,
  addElement,
  deleteElement,
  connectElements,
  disconnectElements,
  createBranch as createBranchOp,
  insertElementOnEdge,
  moveElement,
} from '@/simulator/editor/operations';
import { createElementFromSpec, type NewComponentSpec } from '@/simulator/editor/componentSpec';
import { exportToLadderJson, type ExportResult } from '@/simulator/editor/exportToLadderJson';
import { importFromLadderJson } from '@/simulator/editor/importFromLadderJson';
import type { LadderProject, LadderElement } from '@/simulator/types/ladder';

const HISTORY_LIMIT = 50;

interface LadderEditorStoreState {
  document: EditorDocument;
  selection: EditorSelection[];
  dragState: DragState | null;
  lastErrors: string[];
  clipboard: LadderElement[];
  /** When set, the next element click in the canvas connects FROM this element. */
  connectFrom: { rungId: string; elementId: string } | null;

  // history
  undoStack: EditorDocument[];
  redoStack: EditorDocument[];

  addComponent: (rungId: string, spec: NewComponentSpec) => LadderElement | null;
  deleteComponent: (rungId: string, elementId: string) => void;
  connect: (rungId: string, fromId: string, toId: string) => void;
  disconnect: (rungId: string, fromId: string, toId: string) => void;
  insertOnEdge: (rungId: string, fromId: string, toId: string, spec: NewComponentSpec) => LadderElement | null;
  branch: (
    rungId: string,
    fromId: string,
    toId: string,
    at: { gridX: number; gridY: number }
  ) => { branchStartId: string; branchEndId: string } | null;
  beginDrag: (rungId: string, elementId: string) => void;
  updateDragPosition: (gridX: number, gridY: number) => void;
  endDrag: (commit?: boolean) => void;
  moveComponent: (rungId: string, elementId: string, gridX: number, gridY: number) => void;

  selectElement: (rungId: string, elementId: string, additive?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  addRung: () => string;
  resetDocument: (name?: string) => void;
  loadProject: (project: LadderProject) => void;
  clearErrors: () => void;

  // clipboard
  copySelection: () => void;
  paste: (rungId: string, at: { gridX: number; gridY: number }) => void;

  // history
  undo: () => void;
  redo: () => void;

  // connect mode
  beginConnect: (rungId: string, elementId: string) => void;
  cancelConnect: () => void;

  exportToLadderJson: () => ExportResult;
}

function guarded<T>(
  set: (partial: Partial<LadderEditorStoreState>) => void,
  get: () => LadderEditorStoreState,
  fn: () => T
): T | null {
  try {
    return fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown editor error.';
    set({ lastErrors: [...get().lastErrors, message] });
    return null;
  }
}

/** Commit a new document snapshot, pushing the previous one onto the undo stack. */
function commitWithHistory(
  set: (partial: Partial<LadderEditorStoreState>) => void,
  get: () => LadderEditorStoreState,
  next: EditorDocument
): void {
  const { document, undoStack } = get();
  const newUndo = [...undoStack, document].slice(-HISTORY_LIMIT);
  set({ document: next, undoStack: newUndo, redoStack: [] });
}

export const useLadderEditorStore = create<LadderEditorStoreState>((set, get) => ({
  document: createEmptyEditorDocument('Untitled Ladder'),
  selection: [],
  dragState: null,
  lastErrors: [],
  clipboard: [],
  connectFrom: null,
  undoStack: [],
  redoStack: [],

  addComponent: (rungId, spec) =>
    guarded(set, get, () => {
      const element = createElementFromSpec(spec);
      const next = addElement(get().document, rungId, element);
      commitWithHistory(set, get, next);
      set({ selection: [{ rungId, elementId: element.id }] });
      return element;
    }),

  deleteComponent: (rungId, elementId) => {
    guarded(set, get, () => {
      const next = deleteElement(get().document, rungId, elementId);
      commitWithHistory(set, get, next);
      set({
        selection: get().selection.filter((s) => s.elementId !== elementId),
      });
    });
  },

  connect: (rungId, fromId, toId) => {
    guarded(set, get, () => {
      const next = connectElements(get().document, rungId, fromId, toId);
      commitWithHistory(set, get, next);
    });
  },
  disconnect: (rungId, fromId, toId) => {
    guarded(set, get, () => {
      const next = disconnectElements(get().document, rungId, fromId, toId);
      commitWithHistory(set, get, next);
    });
  },
  insertOnEdge: (rungId, fromId, toId, spec) =>
    guarded(set, get, () => {
      const element = createElementFromSpec(spec);
      const next = insertElementOnEdge(get().document, rungId, fromId, toId, element);
      commitWithHistory(set, get, next);
      return element;
    }),

  branch: (rungId, fromId, toId, at) =>
    guarded(set, get, () => {
      const { doc, branchStartId, branchEndId } = createBranchOp(get().document, rungId, fromId, toId, at);
      commitWithHistory(set, get, doc);
      return { branchStartId, branchEndId };
    }),

  beginDrag: (rungId, elementId) => {
    const element = get().document.rungs[rungId]?.elements[elementId];
    if (!element) return;
    set({
      dragState: {
        rungId,
        elementId,
        originX: element.gridX,
        originY: element.gridY,
        previewX: element.gridX,
        previewY: element.gridY,
      },
    });
  },
  updateDragPosition: (gridX, gridY) => {
    const drag = get().dragState;
    if (drag) set({ dragState: { ...drag, previewX: gridX, previewY: gridY } });
  },
  endDrag: (commit = true) => {
    const drag = get().dragState;
    if (!drag) return;
    if (commit && (drag.previewX !== drag.originX || drag.previewY !== drag.originY)) {
      guarded(set, get, () => {
        const next = moveElement(get().document, drag.rungId, drag.elementId, drag.previewX, drag.previewY);
        commitWithHistory(set, get, next);
      });
    }
    set({ dragState: null });
  },

  moveComponent: (rungId, elementId, gridX, gridY) => {
    guarded(set, get, () => {
      const next = moveElement(get().document, rungId, elementId, gridX, gridY);
      commitWithHistory(set, get, next);
    });
  },

  selectElement: (rungId, elementId, additive = false) =>
    set((state) => {
      if (additive) {
        const exists = state.selection.some((s) => s.rungId === rungId && s.elementId === elementId);
        return {
          selection: exists
            ? state.selection.filter((s) => !(s.rungId === rungId && s.elementId === elementId))
            : [...state.selection, { rungId, elementId }],
        };
      }
      return { selection: [{ rungId, elementId }] };
    }),
  selectAll: () => {
    const doc = get().document;
    const all: EditorSelection[] = [];
    for (const rungId of doc.rungOrder) {
      for (const elementId of doc.rungs[rungId].elementOrder) {
        all.push({ rungId, elementId });
      }
    }
    set({ selection: all });
  },
  clearSelection: () => set({ selection: [] }),

  addRung: () => {
    const { doc, rungId } = addRungOp(get().document);
    commitWithHistory(set, get, doc);
    return rungId;
  },

  resetDocument: (name = 'Untitled Ladder') =>
    set({
      document: createEmptyEditorDocument(name),
      selection: [],
      dragState: null,
      lastErrors: [],
      connectFrom: null,
      undoStack: [],
      redoStack: [],
    }),

  loadProject: (project) =>
    set({
      document: importFromLadderJson(project),
      selection: [],
      dragState: null,
      connectFrom: null,
      undoStack: [],
      redoStack: [],
    }),

  clearErrors: () => set({ lastErrors: [] }),

  copySelection: () => {
    const { selection, document } = get();
    const els = selection
      .map((s) => document.rungs[s.rungId]?.elements[s.elementId])
      .filter((e): e is LadderElement => Boolean(e));
    set({ clipboard: els });
  },

  paste: (rungId, at) => {
    const { clipboard, document } = get();
    if (clipboard.length === 0) return;
    guarded(set, get, () => {
      let next = document;
      const minX = Math.min(...clipboard.map((e) => e.gridX));
      const minY = Math.min(...clipboard.map((e) => e.gridY));
      const newIds = new Map<string, string>();
      // first pass: create new elements with fresh ids, offset positions
      for (const el of clipboard) {
        const newId = `${el.kind}_${Math.random().toString(36).slice(2, 10)}`;
        newIds.set(el.id, newId);
      }
      const created: LadderElement[] = clipboard.map((el) => {
        const newId = newIds.get(el.id)!;
        let base = {
          ...el,
          id: newId,
          gridX: el.gridX - minX + at.gridX,
          gridY: el.gridY - minY + at.gridY,
        } as LadderElement;
        if ('connectsTo' in base && base.connectsTo) {
          base = { ...base, connectsTo: base.connectsTo.map((t) => newIds.get(t) ?? t) } as LadderElement;
        }
        return base;
      });
      for (const el of created) {
        next = addElement(next, rungId, el);
      }
      commitWithHistory(set, get, next);
      set({ selection: created.map((e) => ({ rungId, elementId: e.id })) });
    });
  },

  undo: () => {
    const { undoStack, document, redoStack } = get();
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    set({
      document: previous,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, document].slice(-HISTORY_LIMIT),
      selection: [],
      connectFrom: null,
    });
  },

  redo: () => {
    const { redoStack, document, undoStack } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    set({
      document: next,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, document].slice(-HISTORY_LIMIT),
      selection: [],
      connectFrom: null,
    });
  },

  beginConnect: (rungId, elementId) => set({ connectFrom: { rungId, elementId } }),
  cancelConnect: () => set({ connectFrom: null }),

  exportToLadderJson: () => {
    const result = exportToLadderJson(get().document);
    if (result.errors.length > 0) set({ lastErrors: result.errors });
    return result;
  },
}));
