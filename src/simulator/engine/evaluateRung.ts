import type { CompiledRung } from '@/simulator/types/runtime';
import type { LadderElement, Address } from '@/simulator/types/ladder';
import type { PlcState } from '@/simulator/types/plcState';

/**
 * Solves power flow for one rung against a frozen state snapshot.
 *
 * The key design decision (see ARCHITECTURE.md): there is no special-cased
 * "parallel" or "branch" logic here. A node's power-in is simply the OR of
 * its predecessors' outputs — series falls out when a node has exactly one
 * predecessor, parallel falls out when it has more than one (a fan-in),
 * and nested branches fall out for free because this is just recursive
 * graph evaluation with memoization. BRANCH_START/BRANCH_END nodes are
 * transparent pass-throughs to this algorithm; they exist only so a future
 * editor can render the branch box.
 *
 * Returns a map of elementId -> "powered", meaning power reached the OUTPUT
 * side of that element this scan. The Simulator UI uses this directly to
 * decide orange (powered) vs gray (not powered) per element/wire.
 */
export function evaluateRung(rung: CompiledRung, state: PlcState): Map<string, boolean> {
  const poweredAfter = new Map<string, boolean>();
  const visiting = new Set<string>();

  function powerInto(nodeId: string): boolean {
    const node = rung.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Unknown element id "${nodeId}" referenced in rung "${rung.id}".`);
    }
    // No predecessors means it's wired straight to the left power rail,
    // which is always energized.
    if (node.predecessors.length === 0) return true;
    return node.predecessors.some((predId) => evalNode(predId));
  }

  function evalNode(nodeId: string): boolean {
    const cached = poweredAfter.get(nodeId);
    if (cached !== undefined) return cached;

    if (visiting.has(nodeId)) {
      throw new Error(
        `Cycle detected in rung "${rung.id}" at element "${nodeId}". Ladder logic must be a DAG — feedback loops aren't supported by this engine version.`
      );
    }
    visiting.add(nodeId);

    const node = rung.nodes.get(nodeId)!;
    const poweredIn = powerInto(nodeId);
    const result = resolveElementOutput(node.element, poweredIn, state);

    visiting.delete(nodeId);
    poweredAfter.set(nodeId, result);
    return result;
  }

  for (const id of rung.nodes.keys()) evalNode(id);
  return poweredAfter;
}

function resolveElementOutput(element: LadderElement, poweredIn: boolean, state: PlcState): boolean {
  switch (element.kind) {
    case 'CONTACT': {
      const bitIsSet = readBit(element.address, state);
      const contactPasses = element.mode === 'NO' ? bitIsSet : !bitIsSet;
      return poweredIn && contactPasses;
    }
    case 'WIRE':
    case 'BRANCH_START':
    case 'BRANCH_END':
      // Transparent pass-through — see the design note above.
      return poweredIn;
    case 'COIL':
    case 'TIMER':
    case 'COUNTER':
      // Coils and function blocks are normally terminal (empty connectsTo):
      // they consume poweredIn as "am I energized this scan?" and don't
      // hand power to anything downstream. Their *done bit* (for TIM/CTU)
      // is a separate piece of state, read via its own CONTACT elsewhere —
      // never by chaining an element directly after the block.
      return poweredIn;
    case 'COMMENT':
      return poweredIn;
    default: {
      const _exhaustive: never = element;
      return _exhaustive;
    }
  }
}

function readBit(address: Address, state: PlcState): boolean {
  switch (address.type) {
    case 'I':
      return !!state.inputs[address.number];
    case 'O':
      return !!state.outputs[address.number];
    case 'M':
      return !!state.memory[address.number];
    case 'TIM':
      return !!state.timers[address.number]?.done;
    case 'CTU':
      return !!state.counters[address.number]?.done;
    default: {
      const _exhaustive: never = address.type;
      return _exhaustive;
    }
  }
}
