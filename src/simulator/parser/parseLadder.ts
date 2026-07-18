import type { LadderProject } from '@/simulator/types/ladder';
import type { CompiledLadder } from '@/simulator/types/runtime';
import { validateRung } from './validateLadder';
import { buildGraph } from './buildGraph';

/**
 * Ladder JSON -> Executable Runtime Tree.
 * Runs once per project load (or edit), not once per scan — the resulting
 * CompiledLadder is what engine/scanCycle.ts walks 10x/second.
 */
export function parseLadder(project: LadderProject): CompiledLadder {
  const rungs = project.rungs.map((rung) => {
    validateRung(rung);
    return buildGraph(rung);
  });
  return { rungs };
}
