import type { EditorRung } from './types';

/**
 * The engine (evaluateRung.ts, untouched this phase) already throws if it
 * ever hits a cycle mid-scan — but that's the wrong moment to discover a
 * bad connection: at runtime, mid-simulation, with a cryptic error. The
 * editor checks BEFORE committing a connection instead, via a plain DFS
 * from `toId`: if `fromId` is reachable from `toId`, wiring fromId -> toId
 * would close a loop.
 */
export function wouldCreateCycle(rung: EditorRung, fromId: string, toId: string): boolean {
  if (fromId === toId) return true;

  const visited = new Set<string>();
  const stack = [toId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === fromId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const element = rung.elements[current];
    if (!element) continue;
    for (const next of element.connectsTo ?? []) stack.push(next);
  }

  return false;
}
