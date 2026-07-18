import type { LadderProject } from '@/simulator/types/ladder';
import type { EditorDocument, EditorRung } from './types';

/**
 * Verification helper, not one of the 7 headline features: loads an
 * existing LadderProject (e.g. one of Phase 2's models/examples/*.json)
 * back into editor shape. `startIds` is simply dropped — it's derived on
 * export, never stored while editing — which makes this the other half of
 * a round-trip check: import -> export should reproduce equivalent JSON.
 * Also doubles as "open an existing project for editing" once that's wired
 * to storage in a later phase.
 */
export function importFromLadderJson(project: LadderProject): EditorDocument {
  const rungs: Record<string, EditorRung> = {};
  const rungOrder: string[] = [];

  for (const rung of project.rungs) {
    const elements: EditorRung['elements'] = {};
    const elementOrder: string[] = [];
    for (const element of rung.elements) {
      elements[element.id] = element;
      elementOrder.push(element.id);
    }
    rungs[rung.id] = { id: rung.id, elements, elementOrder };
    rungOrder.push(rung.id);
  }

  return {
    id: project.id,
    name: project.name,
    createdAt: project.meta.createdAt,
    rungOrder,
    rungs,
  };
}
