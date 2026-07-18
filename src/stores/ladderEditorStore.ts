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

interface LadderEditorStoreState {
  document: EditorDocument;
  selection: EditorSelection | null;
  dragState: DragState | null;
  lastErrors: string[];

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

  selectElement: (rungId: string, elementId: string) => void;
  clearSelection: () => void;
  addRung: () => string;
  resetDocument: (name?: string) => void;
  loadProject: (project: LadderProject) => void;
  clearErrors: () => void;

  exportToLadderJson: () => ExportResult;
}

/** Runs a mutation that might throw EditorOperationError; on failure, the
 * document is left untouched and the message is recorded in lastErrors
 * instead of throwing into the caller (a canvas pointer-event handler is a
 * bad place to need a try/catch for every single drag/connect gesture). */
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

export const useLadderEditorStore = create<LadderEditorStoreState>((set, get) => ({
  document: createEmptyEditorDocument('Untitled Ladder'),
  selection: null,
  dragState: null,
  lastErrors: [],

  // 1. Add Component
  addComponent: (rungId, spec) =>
    guarded(set, get, () => {
      const element = createElementFromSpec(spec);
      set({ document: addElement(get().document, rungId, element) });
      return element;
    }),

  // 2. Delete Component
  deleteComponent: (rungId, elementId) => {
    guarded(set, get, () => {
      set({
        document: deleteElement(get().document, rungId, elementId),
        selection: get().selection?.elementId === elementId ? null : get().selection,
      });
    });
  },

  // 3. Connect Elements
  connect: (rungId, fromId, toId) => {
    guarded(set, get, () => set({ document: connectElements(get().document, rungId, fromId, toId) }));
  },
  disconnect: (rungId, fromId, toId) => {
    guarded(set, get, () => set({ document: disconnectElements(get().document, rungId, fromId, toId) }));
  },
  insertOnEdge: (rungId, fromId, toId, spec) =>
    guarded(set, get, () => {
      const element = createElementFromSpec(spec);
      set({ document: insertElementOnEdge(get().document, rungId, fromId, toId, element) });
      return element;
    }),

  // 4. Create Branch
  branch: (rungId, fromId, toId, at) =>
    guarded(set, get, () => {
      const { doc, branchStartId, branchEndId } = createBranchOp(get().document, rungId, fromId, toId, at);
      set({ document: doc });
      return { branchStartId, branchEndId };
    }),

  // 5. Drag Element — live preview, non-committing until endDrag(true)
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
    if (commit) {
      guarded(set, get, () =>
        set({ document: moveElement(get().document, drag.rungId, drag.elementId, drag.previewX, drag.previewY) })
      );
    }
    set({ dragState: null });
  },

  // 6. Move Element — direct commit, no drag gesture required
  moveComponent: (rungId, elementId, gridX, gridY) => {
    guarded(set, get, () => set({ document: moveElement(get().document, rungId, elementId, gridX, gridY) }));
  },

  selectElement: (rungId, elementId) => set({ selection: { rungId, elementId } }),
  clearSelection: () => set({ selection: null }),

  addRung: () => {
    const { doc, rungId } = addRungOp(get().document);
    set({ document: doc });
    return rungId;
  },

  resetDocument: (name = 'Untitled Ladder') =>
    set({ document: createEmptyEditorDocument(name), selection: null, dragState: null, lastErrors: [] }),

  loadProject: (project) => set({ document: importFromLadderJson(project), selection: null, dragState: null }),

  clearErrors: () => set({ lastErrors: [] }),

  // 7. Convert Editor Data to Ladder JSON
  exportToLadderJson: () => {
    const result = exportToLadderJson(get().document);
    if (result.errors.length > 0) set({ lastErrors: result.errors });
    return result;
  },
}));
