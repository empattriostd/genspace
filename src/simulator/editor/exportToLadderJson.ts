import type { LadderElement, LadderProject, Rung } from '@/simulator/types/ladder';
import type { EditorDocument, EditorRung } from './types';
import { parseLadder } from '@/simulator/parser/parseLadder';

export interface ExportResult {
  project: LadderProject;
  /** Human-readable validation problems — empty means the export is
   * engine-ready. Non-empty does NOT mean export failed; it means the
   * in-progress diagram wouldn't parse yet (e.g. a dangling contact mid-edit),
   * which is completely normal while a canvas user is still building. */
  errors: string[];
}

/**
 * An element with nothing pointing at it is, by definition, wired straight
 * to the left power rail — so `startIds` is derived here rather than
 * tracked by hand while editing. A future Konva canvas never has to think
 * about it.
 */
function deriveStartIds(rung: EditorRung): string[] {
  const referenced = new Set<string>();
  for (const id of rung.elementOrder) {
    for (const target of rung.elements[id].connectsTo ?? []) referenced.add(target);
  }
  return rung.elementOrder.filter((id) => rung.elements[id].kind !== 'COMMENT' && !referenced.has(id));
}

/**
 * Converts live editor state into the exact LadderProject JSON the engine
 * (src/simulator/parser + engine, untouched this phase) consumes. Runs the
 * untouched Phase 2 parser as a black-box validation pass by default so the
 * editor gets early, readable feedback instead of the app silently shipping
 * a broken diagram to the runtime.
 */
export function exportToLadderJson(doc: EditorDocument, options: { validate?: boolean } = {}): ExportResult {
  const { validate = true } = options;

  const rungs: Rung[] = doc.rungOrder.map((rungId) => {
    const rung = doc.rungs[rungId];
    const elements: LadderElement[] = rung.elementOrder.map((id) => rung.elements[id]);
    return { id: rung.id, startIds: deriveStartIds(rung), elements };
  });

  const project: LadderProject = {
    id: doc.id,
    name: doc.name,
    rungs,
    meta: { createdAt: doc.createdAt, updatedAt: new Date().toISOString(), engineVersion: '0.1.0' },
  };

  const errors: string[] = [];
  if (validate) {
    try {
      parseLadder(project);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Unknown validation error.');
    }
  }

  return { project, errors };
}
